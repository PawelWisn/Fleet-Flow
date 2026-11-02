import pytest
from tests.factories import make_comment, make_document, make_event, make_insurrance, make_refuel, make_reservation, make_vehicle
from vehicles.models import Vehicle


def vehicle_payload(company, **overrides):
    payload = {
        "id_number": "REG-DOC-1",
        "vin": "WVWZZZ1JZXW000001",
        "weight": 1850.5,
        "registration_number": "WX 12345",
        "brand": "Toyota",
        "model": "Camry",
        "production_year": 2022,
        "kilometrage": 15000,
        "gearbox_type": "automatic",
        "availability": "available",
        "tire_type": "winter",
        "company_id": company.id,
    }
    return {**payload, **overrides}


def plates(response):
    return {item["registration_number"] for item in response.json()["items"]}


class TestListing:
    def test_admin_sees_every_vehicle(self, world):
        assert plates(world.clients.admin.get("/vehicles/")) == {"AAA-111", "AAA-222", "BBB-111"}

    @pytest.mark.parametrize("client_name", ["manager_a", "worker_a"])
    def test_company_members_only_see_company_vehicles(self, world, client_name):
        assert plates(getattr(world.clients, client_name).get("/vehicles/")) == {"AAA-111", "AAA-222"}

    @pytest.mark.parametrize(("term", "expected"), [("ford", {"AAA-111"}), ("FH", {"AAA-222"}), ("bbb", {"BBB-111"}), ("aaa-2", {"AAA-222"}), ("zzz", set())])
    def test_search_by_brand_model_or_plate(self, world, term, expected):
        assert plates(world.clients.admin.get("/vehicles/", params={"search": term})) == expected

    def test_status_filter(self, db, world):
        make_vehicle(db, world.company_a, registration_number="SVC-1", availability="service")
        assert plates(world.clients.admin.get("/vehicles/", params={"status": "service"})) == {"SVC-1"}
        assert "SVC-1" not in plates(world.clients.admin.get("/vehicles/", params={"status": "available"}))

    def test_status_with_a_space_in_it(self, db, world):
        make_vehicle(db, world.company_a, registration_number="USE-1", availability="in use")
        assert plates(world.clients.admin.get("/vehicles/", params={"status": "in use"})) == {"USE-1"}

    @pytest.mark.xfail(strict=True, reason="an unknown ?status= value is cast to the DB enum and surfaces as a 500")
    def test_unknown_status_does_not_crash(self, world):
        assert world.clients.admin.get("/vehicles/", params={"status": "bogus"}).status_code in (200, 422)

    def test_company_filter(self, world):
        assert plates(world.clients.admin.get("/vehicles/", params={"company_id": world.company_b.id})) == {"BBB-111"}

    def test_company_filter_cannot_widen_scope(self, world):
        assert plates(world.clients.manager_a.get("/vehicles/", params={"company_id": world.company_b.id})) == set()

    def test_filters_combine(self, world):
        assert plates(world.clients.admin.get("/vehicles/", params={"search": "volvo", "company_id": world.company_a.id})) == {"AAA-222"}

    def test_pagination_metadata(self, db, world):
        for _ in range(5):
            make_vehicle(db, world.company_a)
        page = world.clients.manager_a.get("/vehicles/", params={"size": 3, "page": 3}).json()
        assert (page["total"], page["pages"], len(page["items"])) == (7, 3, 1)


class TestRetrieve:
    def test_detail_nests_related_records(self, db, world):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        make_event(db, world.vehicles.a, document, world.company_a)
        make_insurrance(db, world.vehicles.a, document, world.company_a)
        make_comment(db, world.vehicles.a, world.users.worker_a)
        make_reservation(db, world.vehicles.a, world.users.worker_a)

        body = world.clients.worker_a.get(f"/vehicles/{world.vehicles.a.id}/").json()

        for relation in ("documents", "refuels", "events", "insurrances", "comments", "reservations"):
            assert len(body[relation]) == 1, relation
        assert body["company"]["name"] == "Alpha Logistics"

    def test_other_company_is_hidden(self, world):
        assert world.clients.manager_a.get(f"/vehicles/{world.vehicles.b.id}/").status_code == 404

    def test_unknown_id(self, world):
        assert world.clients.admin.get("/vehicles/99999/").status_code == 404


class TestCreate:
    def test_admin_creates_in_any_company(self, world, fetch):
        response = world.clients.admin.post("/vehicles/", json=vehicle_payload(world.company_b))
        assert response.status_code == 201
        assert fetch(Vehicle, response.json()["id"]).company_id == world.company_b.id

    def test_manager_creates_in_own_company(self, world):
        assert world.clients.manager_a.post("/vehicles/", json=vehicle_payload(world.company_a)).status_code == 201

    @pytest.mark.parametrize("client_name", ["manager_a", "worker_a"])
    def test_cannot_create_in_another_company(self, world, client_name):
        assert getattr(world.clients, client_name).post("/vehicles/", json=vehicle_payload(world.company_b)).status_code == 403

    def test_unknown_company(self, world):
        payload = vehicle_payload(world.company_a, company_id=99999)
        response = world.clients.admin.post("/vehicles/", json=payload)
        assert response.status_code == 422
        assert "does not exist" in response.text

    @pytest.mark.parametrize(
        "overrides",
        [
            {"gearbox_type": "cvt"},
            {"availability": "lost"},
            {"tire_type": "spikes"},
            {"production_year": "recent"},
            {"weight": "heavy"},
            {"vin": "X" * 18},
            {"registration_number": "X" * 17},
        ],
    )
    def test_invalid_values(self, world, overrides):
        assert world.clients.admin.post("/vehicles/", json=vehicle_payload(world.company_a, **overrides)).status_code == 422

    @pytest.mark.parametrize(
        "missing",
        ["id_number", "vin", "weight", "registration_number", "brand", "model", "production_year", "kilometrage", "gearbox_type", "availability", "tire_type", "company_id"],
    )
    def test_required_fields(self, world, missing):
        payload = vehicle_payload(world.company_a)
        del payload[missing]
        assert world.clients.admin.post("/vehicles/", json=payload).status_code == 422

    @pytest.mark.parametrize("value", ["automatic", "manual", "semi-automatic"])
    def test_all_gearbox_types(self, world, value):
        assert world.clients.admin.post("/vehicles/", json=vehicle_payload(world.company_a, gearbox_type=value)).status_code == 201

    @pytest.mark.parametrize("value", ["in use", "service", "available", "decommissioned", "booked"])
    def test_all_availability_values(self, world, value):
        assert world.clients.admin.post("/vehicles/", json=vehicle_payload(world.company_a, availability=value)).status_code == 201

    def test_anonymous(self, world, anonymous):
        assert anonymous.post("/vehicles/", json=vehicle_payload(world.company_a)).status_code == 401


class TestUpdate:
    def test_update_vehicle(self, world, fetch):
        target = world.vehicles.a
        response = world.clients.manager_a.put(f"/vehicles/{target.id}/", json=vehicle_payload(world.company_a, kilometrage=99999, availability="service"))
        assert response.status_code == 200
        stored = fetch(Vehicle, target.id)
        assert (stored.kilometrage, stored.availability.value) == (99999, "service")

    def test_cannot_move_a_vehicle_to_another_company(self, world, fetch):
        target = world.vehicles.a
        assert world.clients.manager_a.put(f"/vehicles/{target.id}/", json=vehicle_payload(world.company_b)).status_code == 403
        assert fetch(Vehicle, target.id).company_id == world.company_a.id

    def test_cannot_update_other_company_vehicle(self, world):
        assert world.clients.manager_a.put(f"/vehicles/{world.vehicles.b.id}/", json=vehicle_payload(world.company_a)).status_code == 404

    def test_admin_can_move_between_companies(self, world, fetch):
        target = world.vehicles.a
        assert world.clients.admin.put(f"/vehicles/{target.id}/", json=vehicle_payload(world.company_b)).status_code == 200
        assert fetch(Vehicle, target.id).company_id == world.company_b.id

    def test_unknown_vehicle(self, world):
        assert world.clients.admin.put("/vehicles/99999/", json=vehicle_payload(world.company_a)).status_code == 404

    def test_validation(self, world):
        assert world.clients.admin.put(f"/vehicles/{world.vehicles.a.id}/", json=vehicle_payload(world.company_a, availability="lost")).status_code == 422


class TestDelete:
    def test_delete_cascades_to_dependants(self, db, world, fetch):
        from comments.models import Comment
        from database import engine
        from documents.models import Document
        from events.models import Event
        from insurrances.models import Insurrance
        from refuels.models import Refuel
        from reservations.models import Reservation
        from sqlmodel import Session, select

        vehicle = world.vehicles.a
        document = make_document(db, vehicle, world.users.worker_a)
        make_refuel(db, vehicle, world.users.worker_a, document)
        make_event(db, vehicle, document, world.company_a)
        make_insurrance(db, vehicle, document, world.company_a)
        make_comment(db, vehicle, world.users.worker_a)
        make_reservation(db, vehicle, world.users.worker_a)

        assert world.clients.manager_a.delete(f"/vehicles/{vehicle.id}/").status_code == 204

        assert fetch(Vehicle, vehicle.id) is None
        with Session(engine) as session:
            for model in (Document, Refuel, Event, Insurrance, Comment, Reservation):
                assert session.exec(select(model).where(model.vehicle_id == vehicle.id)).all() == [], model.__name__
        assert fetch(Vehicle, world.vehicles.a2.id) is not None

    def test_cannot_delete_other_company_vehicle(self, world, fetch):
        assert world.clients.manager_a.delete(f"/vehicles/{world.vehicles.b.id}/").status_code == 404
        assert fetch(Vehicle, world.vehicles.b.id) is not None

    def test_unknown_vehicle(self, world):
        assert world.clients.admin.delete("/vehicles/99999/").status_code == 404


class TestFuelReport:
    def test_manager_gets_a_pdf(self, db, world):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        make_refuel(db, world.vehicles.a, world.users.worker_a, document)

        response = world.clients.manager_a.get(f"/vehicles/{world.vehicles.a.id}/reports/fuel/")

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF")
        assert "vehicle_AAA-111_report.pdf" in response.headers["content-disposition"]

    def test_admin_gets_a_pdf_for_a_vehicle_without_refuels(self, world):
        response = world.clients.admin.get(f"/vehicles/{world.vehicles.b.id}/reports/fuel/")
        assert response.status_code == 200 and response.content.startswith(b"%PDF")

    def test_workers_are_not_allowed(self, world):
        assert world.clients.worker_a.get(f"/vehicles/{world.vehicles.a.id}/reports/fuel/").status_code == 403

    def test_manager_cannot_report_on_another_company(self, world):
        assert world.clients.manager_a.get(f"/vehicles/{world.vehicles.b.id}/reports/fuel/").status_code == 404

    def test_unknown_vehicle(self, world):
        assert world.clients.admin.get("/vehicles/99999/reports/fuel/").status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [("get", "/vehicles/"), ("get", "/vehicles/1/"), ("put", "/vehicles/1/"), ("delete", "/vehicles/1/"), ("get", "/vehicles/1/reports/fuel/")],
)
def test_requires_login(anonymous, method, path):
    kwargs = {"json": {}} if method == "put" else {}
    assert getattr(anonymous, method)(path, **kwargs).status_code == 401

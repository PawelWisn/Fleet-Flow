from datetime import datetime, timedelta

import pytest
from refuels.models import Refuel
from tests.factories import make_document, make_refuel


@pytest.fixture
def document(db, world):
    return make_document(db, world.vehicles.a, world.users.worker_a)


def refuel_payload(world, document, **overrides):
    payload = {
        "date": "2026-01-15T10:30:00",
        "fuel_amount": 45.5,
        "price": 280.75,
        "kilometrage_during_refuel": 15500,
        "gas_station": "Shell Main",
        "vehicle_id": world.vehicles.a.id,
        "document_id": document.id,
        "user_id": world.users.worker_a.id,
    }
    return {**payload, **overrides}


def stations(response):
    return {item["gas_station"] for item in response.json()["items"]}


class TestListing:
    @pytest.fixture(autouse=True)
    def refuels(self, db, world, document):
        doc_b = make_document(db, world.vehicles.b, world.users.worker_b)
        return {
            "worker_a": make_refuel(db, world.vehicles.a, world.users.worker_a, document, gas_station="WorkerA"),
            "worker_a2": make_refuel(db, world.vehicles.a2, world.users.worker_a2, document, gas_station="WorkerA2"),
            "manager_a": make_refuel(db, world.vehicles.a, world.users.manager_a, document, gas_station="ManagerA"),
            "worker_b": make_refuel(db, world.vehicles.b, world.users.worker_b, doc_b, gas_station="WorkerB"),
        }

    def test_admin_sees_everything(self, world):
        assert stations(world.clients.admin.get("/refuels/")) == {"WorkerA", "WorkerA2", "ManagerA", "WorkerB"}

    def test_manager_sees_their_companys_refuels(self, world):
        assert stations(world.clients.manager_a.get("/refuels/")) == {"WorkerA", "WorkerA2", "ManagerA"}

    def test_worker_sees_only_their_own(self, world):
        assert stations(world.clients.worker_a.get("/refuels/")) == {"WorkerA"}

    def test_filter_by_vehicle(self, world):
        assert stations(world.clients.manager_a.get("/refuels/", params={"vehicle_id": world.vehicles.a2.id})) == {"WorkerA2"}

    def test_filter_by_user(self, world):
        assert stations(world.clients.manager_a.get("/refuels/", params={"user_id": world.users.manager_a.id})) == {"ManagerA"}

    def test_filter_by_document(self, db, world, document):
        other = make_document(db, world.vehicles.a, world.users.worker_a)
        make_refuel(db, world.vehicles.a, world.users.worker_a, other, gas_station="OtherDoc")
        assert stations(world.clients.manager_a.get("/refuels/", params={"document_id": other.id})) == {"OtherDoc"}

    def test_filters_cannot_widen_scope(self, world):
        assert stations(world.clients.worker_a.get("/refuels/", params={"user_id": world.users.worker_a2.id})) == set()
        assert stations(world.clients.manager_a.get("/refuels/", params={"vehicle_id": world.vehicles.b.id})) == set()

    @pytest.mark.parametrize(
        ("term", "expected"), [("ford", {"WorkerA", "ManagerA"}), ("VOLVO", {"WorkerA2"}), ("second", {"WorkerA2"}), ("manager alpha", {"ManagerA"}), ("zzz", set())]
    )
    def test_search_by_vehicle_or_driver(self, world, term, expected):
        assert stations(world.clients.manager_a.get("/refuels/", params={"search": term})) == expected

    def test_search_works_for_workers_too(self, world):
        assert stations(world.clients.worker_a.get("/refuels/", params={"search": "ford"})) == {"WorkerA", "ManagerA"} & {"WorkerA"}

    def test_pagination(self, world):
        page = world.clients.admin.get("/refuels/", params={"size": 3, "page": 2}).json()
        assert (page["total"], page["pages"], len(page["items"])) == (4, 2, 1)


class TestRetrieve:
    def test_own_refuel_is_visible_with_relations(self, db, world, document):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        body = world.clients.worker_a.get(f"/refuels/{refuel.id}/").json()
        assert (body["vehicle"]["registration_number"], body["user"]["email"], body["document"]["id"]) == ("AAA-111", "worker.a@example.com", document.id)

    def test_manager_sees_company_refuels(self, db, world, document):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        assert world.clients.manager_a.get(f"/refuels/{refuel.id}/").status_code == 200

    def test_worker_cannot_see_colleagues_refuels(self, db, world, document):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a2, document)
        assert world.clients.worker_a.get(f"/refuels/{refuel.id}/").status_code == 404

    def test_other_company(self, db, world, document):
        refuel = make_refuel(db, world.vehicles.b, world.users.worker_b, document)
        assert world.clients.manager_a.get(f"/refuels/{refuel.id}/").status_code == 404

    def test_unknown(self, world):
        assert world.clients.admin.get("/refuels/99999/").status_code == 404


class TestCreate:
    def test_worker_creates_own_refuel(self, world, document, fetch):
        response = world.clients.worker_a.post("/refuels/", json=refuel_payload(world, document))
        assert response.status_code == 201
        stored = fetch(Refuel, response.json()["id"])
        assert (stored.fuel_amount, stored.price, stored.gas_station) == (45.5, 280.75, "Shell Main")

    def test_manager_creates_for_a_company_user(self, world, document):
        assert world.clients.manager_a.post("/refuels/", json=refuel_payload(world, document, user_id=world.users.worker_a2.id)).status_code == 201

    def test_admin_creates_for_anyone(self, world, document):
        assert world.clients.admin.post("/refuels/", json=refuel_payload(world, document, user_id=world.users.worker_b.id)).status_code == 201

    def test_worker_cannot_create_for_someone_else(self, world, document):
        assert world.clients.worker_a.post("/refuels/", json=refuel_payload(world, document, user_id=world.users.worker_a2.id)).status_code == 403

    def test_manager_cannot_create_for_another_company(self, world, document):
        assert world.clients.manager_a.post("/refuels/", json=refuel_payload(world, document, user_id=world.users.worker_b.id)).status_code == 403

    @pytest.mark.parametrize("field", ["vehicle_id", "document_id", "user_id"])
    def test_unknown_references(self, world, document, field):
        response = world.clients.admin.post("/refuels/", json=refuel_payload(world, document, **{field: 99999}))
        assert response.status_code == 422
        assert "does not exist" in response.text

    @pytest.mark.parametrize("missing", ["date", "fuel_amount", "price", "kilometrage_during_refuel", "gas_station", "vehicle_id", "document_id", "user_id"])
    def test_required_fields(self, world, document, missing):
        payload = refuel_payload(world, document)
        del payload[missing]
        # `date` has a server-side default, everything else is mandatory
        expected = 201 if missing == "date" else 422
        assert world.clients.admin.post("/refuels/", json=payload).status_code == expected

    @pytest.mark.parametrize("overrides", [{"fuel_amount": "lots"}, {"price": "cheap"}, {"kilometrage_during_refuel": 1.5}, {"gas_station": "x" * 33}, {"date": "yesterday"}])
    def test_invalid_values(self, world, document, overrides):
        assert world.clients.admin.post("/refuels/", json=refuel_payload(world, document, **overrides)).status_code == 422

    def test_anonymous(self, world, document, anonymous):
        assert anonymous.post("/refuels/", json=refuel_payload(world, document)).status_code == 401

    @pytest.mark.xfail(strict=True, reason="vehicle access is not validated: a worker can log fuel against another company's vehicle")
    def test_cannot_use_another_companys_vehicle(self, world, document):
        response = world.clients.worker_a.post("/refuels/", json=refuel_payload(world, document, vehicle_id=world.vehicles.b.id))
        assert response.status_code in (403, 404, 422)

    @pytest.mark.xfail(strict=True, reason="negative or zero amounts are accepted by the API")
    @pytest.mark.parametrize("overrides", [{"fuel_amount": -5}, {"price": -1}])
    def test_rejects_non_positive_amounts(self, world, document, overrides):
        assert world.clients.admin.post("/refuels/", json=refuel_payload(world, document, **overrides)).status_code == 422


class TestUpdate:
    def test_update(self, db, world, document, fetch):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        response = world.clients.worker_a.put(f"/refuels/{refuel.id}/", json=refuel_payload(world, document, gas_station="BP", fuel_amount=10))
        assert response.status_code == 200
        stored = fetch(Refuel, refuel.id)
        assert (stored.gas_station, stored.fuel_amount) == ("BP", 10)

    def test_worker_cannot_update_colleagues_refuel(self, db, world, document):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a2, document)
        assert world.clients.worker_a.put(f"/refuels/{refuel.id}/", json=refuel_payload(world, document)).status_code == 404

    def test_worker_cannot_reassign_a_refuel_to_someone_else(self, db, world, document, fetch):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        response = world.clients.worker_a.put(f"/refuels/{refuel.id}/", json=refuel_payload(world, document, user_id=world.users.worker_a2.id))
        assert response.status_code == 403
        assert fetch(Refuel, refuel.id).user_id == world.users.worker_a.id

    def test_manager_updates_company_refuel(self, db, world, document):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        assert world.clients.manager_a.put(f"/refuels/{refuel.id}/", json=refuel_payload(world, document, gas_station="Edited")).status_code == 200

    def test_unknown_refuel(self, world, document):
        assert world.clients.admin.put("/refuels/99999/", json=refuel_payload(world, document)).status_code == 404

    def test_validation(self, db, world, document):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        assert world.clients.worker_a.put(f"/refuels/{refuel.id}/", json=refuel_payload(world, document, price="x")).status_code == 422


class TestDelete:
    def test_owner_deletes(self, db, world, document, fetch):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        assert world.clients.worker_a.delete(f"/refuels/{refuel.id}/").status_code == 204
        assert fetch(Refuel, refuel.id) is None

    def test_worker_cannot_delete_colleagues_refuel(self, db, world, document, fetch):
        refuel = make_refuel(db, world.vehicles.a, world.users.worker_a2, document)
        assert world.clients.worker_a.delete(f"/refuels/{refuel.id}/").status_code == 404
        assert fetch(Refuel, refuel.id) is not None

    def test_manager_cannot_delete_other_company_refuel(self, db, world, document):
        refuel = make_refuel(db, world.vehicles.b, world.users.worker_b, document)
        assert world.clients.manager_a.delete(f"/refuels/{refuel.id}/").status_code == 404

    def test_unknown(self, world):
        assert world.clients.admin.delete("/refuels/99999/").status_code == 404


class TestStats:
    @staticmethod
    def month(delta_days=0):
        return (datetime.today() - timedelta(days=delta_days)).strftime("%m/%y")

    def totals(self, response):
        assert response.status_code == 200
        return {item["month_year"]: item["total_fuel"] for item in response.json()}

    def test_always_returns_twelve_months_including_empty_ones(self, world):
        body = world.clients.admin.get("/refuels/stats/").json()
        assert len(body) == 12
        assert all(item["total_fuel"] == 0 for item in body)
        assert body[0]["month_year"] == self.month()

    def test_sums_fuel_per_month(self, db, world, document):
        now = datetime.now().replace(day=2, hour=12)
        make_refuel(db, world.vehicles.a, world.users.worker_a, document, date=now, fuel_amount=10.25)
        make_refuel(db, world.vehicles.a, world.users.worker_a, document, date=now, fuel_amount=5.5)

        assert self.totals(world.clients.admin.get("/refuels/stats/"))[self.month()] == 15.75

    def test_old_refuels_are_ignored(self, db, world, document):
        make_refuel(db, world.vehicles.a, world.users.worker_a, document, date=datetime.now() - timedelta(days=800), fuel_amount=99)
        assert sum(self.totals(world.clients.admin.get("/refuels/stats/")).values()) == 0

    def test_scoped_to_the_requesting_user(self, db, world, document):
        doc_b = make_document(db, world.vehicles.b, world.users.worker_b)
        now = datetime.now().replace(day=2, hour=12)
        make_refuel(db, world.vehicles.a, world.users.worker_a, document, date=now, fuel_amount=10)
        make_refuel(db, world.vehicles.a, world.users.worker_a2, document, date=now, fuel_amount=20)
        make_refuel(db, world.vehicles.b, world.users.worker_b, doc_b, date=now, fuel_amount=40)

        key = self.month()
        assert self.totals(world.clients.worker_a.get("/refuels/stats/"))[key] == 10
        assert self.totals(world.clients.manager_a.get("/refuels/stats/"))[key] == 30
        assert self.totals(world.clients.admin.get("/refuels/stats/"))[key] == 70

    def test_stats_route_is_not_shadowed_by_the_id_route(self, world):
        assert world.clients.admin.get("/refuels/stats/").status_code == 200


@pytest.mark.parametrize("method", ["get", "put", "delete"])
def test_requires_login(anonymous, method):
    assert getattr(anonymous, method)("/refuels/1/").status_code == 401


def test_list_and_stats_require_login(anonymous):
    assert anonymous.get("/refuels/").status_code == 401
    assert anonymous.get("/refuels/stats/").status_code == 401

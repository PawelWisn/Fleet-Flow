import pytest
from companies.models import Company
from tests.factories import make_document, make_event, make_vehicle
from users.models import User
from vehicles.models import Vehicle


def company_payload(**overrides):
    payload = {
        "name": "New Company",
        "description": "Freight",
        "phone": "123456789",
        "post_code": "00-950",
        "address1": "Long Street 5",
        "address2": "Floor 2",
        "city": "Gdansk",
        "country": "Poland",
        "nip": "9876543210",
        "is_internal": False,
    }
    return {**payload, **overrides}


def names(response):
    return {item["name"] for item in response.json()["items"]}


class TestListing:
    def test_admin_sees_all_companies(self, world):
        assert names(world.clients.admin.get("/companies/")) == {"Alpha Logistics", "Beta Transport", "FleetFlow Admin"}

    @pytest.mark.parametrize("client_name", ["manager_a", "worker_a"])
    def test_other_roles_only_see_their_own_company(self, world, client_name):
        assert names(getattr(world.clients, client_name).get("/companies/")) == {"Alpha Logistics"}

    @pytest.mark.parametrize(("term", "expected"), [("alpha", {"Alpha Logistics"}), ("TRANS", {"Beta Transport"}), ("2222", {"Beta Transport"}), ("nothing", set())])
    def test_search_matches_name_or_nip_case_insensitively(self, world, term, expected):
        assert names(world.clients.admin.get("/companies/", params={"search": term})) == expected

    def test_search_stays_within_the_users_scope(self, world):
        assert names(world.clients.manager_a.get("/companies/", params={"search": "beta"})) == set()

    def test_pagination(self, world):
        page = world.clients.admin.get("/companies/", params={"size": 2}).json()
        assert (page["total"], page["pages"], len(page["items"])) == (3, 2, 2)


class TestRetrieve:
    def test_includes_related_collections(self, db, world):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        make_event(db, world.vehicles.a, document, world.company_a)

        body = world.clients.manager_a.get(f"/companies/{world.company_a.id}/").json()

        assert {v["registration_number"] for v in body["vehicles"]} == {"AAA-111", "AAA-222"}
        assert len(body["users"]) == 3
        assert len(body["events"]) == 1

    def test_cannot_read_another_company(self, world):
        assert world.clients.manager_a.get(f"/companies/{world.company_b.id}/").status_code == 404

    def test_admin_can_read_any_company(self, world):
        assert world.clients.admin.get(f"/companies/{world.company_b.id}/").status_code == 200

    def test_unknown_id(self, world):
        assert world.clients.admin.get("/companies/99999/").status_code == 404


class TestCreate:
    def test_admin_creates_a_company(self, world, fetch):
        response = world.clients.admin.post("/companies/", json=company_payload())
        assert response.status_code == 201
        created = response.json()
        assert created["name"] == "New Company" and created["is_internal"] is False
        assert fetch(Company, created["id"]).nip == "9876543210"

    def test_optional_fields_have_defaults(self, world):
        payload = company_payload()
        for field in ("description", "phone", "is_internal"):
            del payload[field]
        body = world.clients.admin.post("/companies/", json=payload).json()
        assert (body["description"], body["phone"], body["is_internal"]) == ("", "", True)

    @pytest.mark.parametrize("missing", ["name", "post_code", "address1", "address2", "city", "country", "nip"])
    def test_required_fields(self, world, missing):
        payload = company_payload()
        del payload[missing]
        assert world.clients.admin.post("/companies/", json=payload).status_code == 422

    @pytest.mark.parametrize(("field", "value"), [("nip", "12345678901"), ("post_code", "123456789"), ("phone", "1" * 13), ("name", "x" * 129)])
    def test_length_limits(self, world, field, value):
        assert world.clients.admin.post("/companies/", json=company_payload(**{field: value})).status_code == 422

    def test_anonymous(self, anonymous):
        assert anonymous.post("/companies/", json=company_payload()).status_code == 401

    @pytest.mark.xfail(strict=True, reason="no role check: workers can create companies although the UI reserves companies for managers/admins")
    def test_worker_cannot_create_companies(self, world):
        assert world.clients.worker_a.post("/companies/", json=company_payload()).status_code == 403


class TestUpdate:
    def test_admin_updates_a_company(self, world, fetch):
        response = world.clients.admin.put(f"/companies/{world.company_b.id}/", json=company_payload(name="Renamed", city="Poznan"))
        assert response.status_code == 200
        stored = fetch(Company, world.company_b.id)
        assert (stored.name, stored.city) == ("Renamed", "Poznan")

    def test_manager_updates_their_company(self, world, fetch):
        assert world.clients.manager_a.put(f"/companies/{world.company_a.id}/", json=company_payload(name="Alpha 2")).status_code == 200
        assert fetch(Company, world.company_a.id).name == "Alpha 2"

    def test_manager_cannot_update_another_company(self, world, fetch):
        assert world.clients.manager_a.put(f"/companies/{world.company_b.id}/", json=company_payload(name="Hijacked")).status_code == 404
        assert fetch(Company, world.company_b.id).name == "Beta Transport"

    @pytest.mark.xfail(
        strict=True, reason="PUT resets omitted optional fields to their defaults, so the frontend form (which omits description/phone/is_internal) wipes them on every edit"
    )
    def test_partial_payload_keeps_unset_optional_fields(self, world, fetch):
        # The frontend's company form omits description/phone/is_internal; they must survive an update
        world.clients.admin.put(f"/companies/{world.company_a.id}/", json=company_payload(description="Keep me", phone="555"))
        payload = company_payload(name="Alpha 3")
        for field in ("description", "phone", "is_internal"):
            del payload[field]
        world.clients.admin.put(f"/companies/{world.company_a.id}/", json=payload)
        stored = fetch(Company, world.company_a.id)
        assert (stored.name, stored.description, stored.phone) == ("Alpha 3", "Keep me", "555")

    def test_unknown_company(self, world):
        assert world.clients.admin.put("/companies/99999/", json=company_payload()).status_code == 404

    def test_validation(self, world):
        assert world.clients.admin.put(f"/companies/{world.company_a.id}/", json=company_payload(nip="1" * 11)).status_code == 422

    @pytest.mark.xfail(strict=True, reason="no role check: workers can edit their company")
    def test_worker_cannot_update_their_company(self, world):
        assert world.clients.worker_a.put(f"/companies/{world.company_a.id}/", json=company_payload()).status_code == 403


class TestDelete:
    def test_admin_deletes_a_company_and_everything_under_it(self, db, world, fetch):
        from database import engine
        from sqlmodel import Session, select

        assert world.clients.admin.delete(f"/companies/{world.company_a.id}/").status_code == 204

        assert fetch(Company, world.company_a.id) is None
        with Session(engine) as session:
            assert session.exec(select(Vehicle).where(Vehicle.company_id == world.company_a.id)).all() == []
            assert session.exec(select(User).where(User.company_id == world.company_a.id)).all() == []
        assert fetch(Company, world.company_b.id) is not None

    def test_cannot_delete_another_company(self, world, fetch):
        assert world.clients.manager_a.delete(f"/companies/{world.company_b.id}/").status_code == 404
        assert fetch(Company, world.company_b.id) is not None

    def test_unknown_company(self, world):
        assert world.clients.admin.delete("/companies/99999/").status_code == 404

    @pytest.mark.xfail(strict=True, reason="no role check: a worker can delete their whole company, cascading to all of its users and vehicles")
    def test_worker_cannot_delete_their_company(self, world):
        assert world.clients.worker_a.delete(f"/companies/{world.company_a.id}/").status_code == 403


@pytest.mark.parametrize(("method", "path"), [("get", "/companies/"), ("get", "/companies/1/"), ("put", "/companies/1/"), ("delete", "/companies/1/")])
def test_requires_login(anonymous, method, path):
    kwargs = {"json": company_payload()} if method == "put" else {}
    assert getattr(anonymous, method)(path, **kwargs).status_code == 401

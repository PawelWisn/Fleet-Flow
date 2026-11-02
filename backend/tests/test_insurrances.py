from datetime import datetime, timedelta

import pytest
from insurrances.models import Insurrance
from tests.factories import make_document, make_insurrance


@pytest.fixture
def document(db, world):
    return make_document(db, world.vehicles.a, world.users.worker_a)


def insurrance_payload(world, document, **overrides):
    payload = {
        "insurer": "Allianz",
        "policy_number": "ALZ-2026-77",
        "date_from": "2026-01-01T00:00:00",
        "date_to": "2027-01-01T00:00:00",
        "description": "Third party liability",
        "price": 899.99,
        "insurrance_type": "OC",
        "vehicle_id": world.vehicles.a.id,
        "document_id": document.id,
        "company_id": world.company_a.id,
    }
    return {**payload, **overrides}


def policies(response):
    return {item["policy_number"] for item in response.json()["items"]}


class TestListing:
    @pytest.fixture(autouse=True)
    def insurrances(self, db, world, document):
        doc_b = make_document(db, world.vehicles.b, world.users.worker_b)
        make_insurrance(db, world.vehicles.a, document, world.company_a, policy_number="A1")
        make_insurrance(db, world.vehicles.a2, document, world.company_a, policy_number="A2")
        make_insurrance(db, world.vehicles.b, doc_b, world.company_b, policy_number="B1")

    def test_admin_sees_all(self, world):
        assert policies(world.clients.admin.get("/insurrances/")) == {"A1", "A2", "B1"}

    @pytest.mark.parametrize("client_name", ["manager_a", "worker_a"])
    def test_company_members_only_see_their_vehicles_policies(self, world, client_name):
        assert policies(getattr(world.clients, client_name).get("/insurrances/")) == {"A1", "A2"}

    def test_filter_by_vehicle(self, world):
        assert policies(world.clients.manager_a.get("/insurrances/", params={"vehicle_id": world.vehicles.a2.id})) == {"A2"}

    def test_filter_by_company(self, world):
        assert policies(world.clients.admin.get("/insurrances/", params={"company_id": world.company_b.id})) == {"B1"}

    def test_filter_by_document(self, db, world, document):
        other = make_document(db, world.vehicles.a, world.users.worker_a)
        make_insurrance(db, world.vehicles.a, other, world.company_a, policy_number="OTHER")
        assert policies(world.clients.manager_a.get("/insurrances/", params={"document_id": other.id})) == {"OTHER"}

    def test_filters_cannot_widen_scope(self, world):
        assert policies(world.clients.manager_a.get("/insurrances/", params={"vehicle_id": world.vehicles.b.id})) == set()

    def test_pagination(self, world):
        page = world.clients.admin.get("/insurrances/", params={"size": 2, "page": 2}).json()
        assert (page["total"], page["pages"], len(page["items"])) == (3, 2, 1)


class TestFinishing:
    def test_lists_policies_ending_within_a_month_soonest_first(self, db, world, document):
        now = datetime.now()
        make_insurrance(db, world.vehicles.a, document, world.company_a, policy_number="expired", date_to=now - timedelta(days=1))
        make_insurrance(db, world.vehicles.a, document, world.company_a, policy_number="far", date_to=now + timedelta(days=90))
        make_insurrance(db, world.vehicles.a, document, world.company_a, policy_number="in20", date_to=now + timedelta(days=20))
        make_insurrance(db, world.vehicles.a, document, world.company_a, policy_number="in5", date_to=now + timedelta(days=5))

        items = world.clients.manager_a.get("/insurrances/finishing/").json()["items"]

        assert [item["policy_number"] for item in items] == ["in5", "in20"]

    def test_window_edges(self, db, world, document):
        now = datetime.now()
        make_insurrance(db, world.vehicles.a, document, world.company_a, policy_number="inside", date_to=now + timedelta(days=30, hours=20))
        make_insurrance(db, world.vehicles.a, document, world.company_a, policy_number="outside", date_to=now + timedelta(days=31, hours=4))
        assert policies(world.clients.manager_a.get("/insurrances/finishing/")) == {"inside"}

    def test_respects_company_scope(self, db, world, document):
        doc_b = make_document(db, world.vehicles.b, world.users.worker_b)
        make_insurrance(db, world.vehicles.b, doc_b, world.company_b, policy_number="beta", date_to=datetime.now() + timedelta(days=3))
        make_insurrance(db, world.vehicles.a, document, world.company_a, policy_number="alpha", date_to=datetime.now() + timedelta(days=3))
        assert policies(world.clients.manager_a.get("/insurrances/finishing/")) == {"alpha"}
        assert policies(world.clients.admin.get("/insurrances/finishing/")) == {"alpha", "beta"}

    def test_empty(self, world):
        assert world.clients.manager_a.get("/insurrances/finishing/").json()["total"] == 0

    def test_route_is_not_shadowed_by_the_id_route(self, world):
        assert world.clients.manager_a.get("/insurrances/finishing/").status_code == 200


class TestRetrieve:
    def test_returns_policy_with_relations(self, db, world, document):
        policy = make_insurrance(db, world.vehicles.a, document, world.company_a)
        body = world.clients.worker_a.get(f"/insurrances/{policy.id}/").json()
        assert body["vehicle"]["registration_number"] == "AAA-111"
        assert body["document"]["id"] == document.id
        assert body["insurrance_type"] == "OC/AC"

    def test_other_company_is_hidden(self, db, world):
        doc_b = make_document(db, world.vehicles.b, world.users.worker_b)
        policy = make_insurrance(db, world.vehicles.b, doc_b, world.company_b)
        assert world.clients.manager_a.get(f"/insurrances/{policy.id}/").status_code == 404

    def test_lookup_uses_the_policy_id_not_the_vehicle_id(self, db, world, document):
        """Regression: a joined scope made filter_by(id=...) target the vehicles table."""
        for _ in range(3):
            make_insurrance(db, world.vehicles.a, document, world.company_a)
        last = make_insurrance(db, world.vehicles.a, document, world.company_a)
        assert world.clients.manager_a.get(f"/insurrances/{last.id}/").json()["id"] == last.id

    def test_unknown(self, world):
        assert world.clients.admin.get("/insurrances/99999/").status_code == 404


class TestCreate:
    def test_creates_a_policy(self, world, document, fetch):
        response = world.clients.manager_a.post("/insurrances/", json=insurrance_payload(world, document))
        assert response.status_code == 201
        stored = fetch(Insurrance, response.json()["id"])
        assert (stored.insurer, stored.price, stored.insurrance_type.value) == ("Allianz", 899.99, "OC")

    @pytest.mark.parametrize("kind", ["OC", "AC", "OC/AC"])
    def test_all_types(self, world, document, kind):
        assert world.clients.manager_a.post("/insurrances/", json=insurrance_payload(world, document, insurrance_type=kind)).status_code == 201

    @pytest.mark.parametrize("field", ["vehicle_id", "document_id", "company_id"])
    def test_unknown_references(self, world, document, field):
        response = world.clients.manager_a.post("/insurrances/", json=insurrance_payload(world, document, **{field: 99999}))
        assert response.status_code == 422
        assert "does not exist" in response.text

    @pytest.mark.parametrize("missing", ["insurer", "policy_number", "date_from", "date_to", "description", "price", "insurrance_type", "vehicle_id", "document_id", "company_id"])
    def test_required_fields(self, world, document, missing):
        payload = insurrance_payload(world, document)
        del payload[missing]
        assert world.clients.manager_a.post("/insurrances/", json=payload).status_code == 422

    @pytest.mark.parametrize(
        "overrides", [{"insurrance_type": "TPL"}, {"price": "cheap"}, {"insurer": "x" * 129}, {"policy_number": "x" * 65}, {"description": "x" * 1025}, {"date_to": "never"}]
    )
    def test_invalid_values(self, world, document, overrides):
        assert world.clients.manager_a.post("/insurrances/", json=insurrance_payload(world, document, **overrides)).status_code == 422

    def test_anonymous(self, world, document, anonymous):
        assert anonymous.post("/insurrances/", json=insurrance_payload(world, document)).status_code == 401

    @pytest.mark.xfail(strict=True, reason="the API accepts policies that end before they start")
    def test_end_must_be_after_start(self, world, document):
        payload = insurrance_payload(world, document, date_from="2026-06-01T00:00:00", date_to="2026-01-01T00:00:00")
        assert world.clients.manager_a.post("/insurrances/", json=payload).status_code == 422

    @pytest.mark.xfail(strict=True, reason="vehicle access is not validated: a manager can insure another company's vehicle")
    def test_cannot_use_another_companys_vehicle(self, world, document):
        response = world.clients.manager_a.post("/insurrances/", json=insurrance_payload(world, document, vehicle_id=world.vehicles.b.id))
        assert response.status_code in (403, 404, 422)


class TestUpdate:
    def test_update(self, db, world, document, fetch):
        policy = make_insurrance(db, world.vehicles.a, document, world.company_a)
        response = world.clients.manager_a.put(f"/insurrances/{policy.id}/", json=insurrance_payload(world, document, insurer="Ergo", insurrance_type="AC"))
        assert response.status_code == 200
        stored = fetch(Insurrance, policy.id)
        assert (stored.insurer, stored.insurrance_type.value) == ("Ergo", "AC")

    def test_other_company_policy_cannot_be_edited(self, db, world, document):
        doc_b = make_document(db, world.vehicles.b, world.users.worker_b)
        policy = make_insurrance(db, world.vehicles.b, doc_b, world.company_b)
        assert world.clients.manager_a.put(f"/insurrances/{policy.id}/", json=insurrance_payload(world, document)).status_code == 404

    def test_unknown_policy(self, world, document):
        assert world.clients.admin.put("/insurrances/99999/", json=insurrance_payload(world, document)).status_code == 404

    def test_validation(self, db, world, document):
        policy = make_insurrance(db, world.vehicles.a, document, world.company_a)
        assert world.clients.manager_a.put(f"/insurrances/{policy.id}/", json=insurrance_payload(world, document, price="x")).status_code == 422


class TestDelete:
    def test_delete(self, db, world, document, fetch):
        policy = make_insurrance(db, world.vehicles.a, document, world.company_a)
        assert world.clients.manager_a.delete(f"/insurrances/{policy.id}/").status_code == 204
        assert fetch(Insurrance, policy.id) is None

    def test_other_company_policy_cannot_be_deleted(self, db, world, fetch):
        doc_b = make_document(db, world.vehicles.b, world.users.worker_b)
        policy = make_insurrance(db, world.vehicles.b, doc_b, world.company_b)
        assert world.clients.manager_a.delete(f"/insurrances/{policy.id}/").status_code == 404
        assert fetch(Insurrance, policy.id) is not None

    def test_unknown(self, world):
        assert world.clients.admin.delete("/insurrances/99999/").status_code == 404


@pytest.mark.parametrize(
    ("method", "path"), [("get", "/insurrances/"), ("get", "/insurrances/finishing/"), ("get", "/insurrances/1/"), ("put", "/insurrances/1/"), ("delete", "/insurrances/1/")]
)
def test_requires_login(anonymous, method, path):
    assert getattr(anonymous, method)(path).status_code == 401

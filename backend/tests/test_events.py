from datetime import datetime

import pytest
from events.models import Event
from tests.factories import make_document, make_event


@pytest.fixture
def document(db, world):
    return make_document(db, world.vehicles.a, world.users.worker_a)


def event_payload(world, document, **overrides):
    payload = {
        "event_type": "repair",
        "date": "2026-03-01T09:00:00",
        "description": "Replaced brake pads",
        "price": 450.0,
        "vehicle_id": world.vehicles.a.id,
        "document_id": document.id,
        "company_id": world.company_a.id,
    }
    return {**payload, **overrides}


def types(response):
    return {item["event_type"] for item in response.json()["items"]}


class TestListing:
    @pytest.fixture(autouse=True)
    def events(self, db, world, document):
        doc_b = make_document(db, world.vehicles.b, world.users.worker_b)
        make_event(db, world.vehicles.a, document, world.company_a, event_type="alpha-event")
        make_event(db, world.vehicles.a2, document, world.company_a, event_type="alpha-two")
        make_event(db, world.vehicles.b, doc_b, world.company_b, event_type="beta-event")

    def test_admin_sees_all(self, world):
        assert types(world.clients.admin.get("/events/")) == {"alpha-event", "alpha-two", "beta-event"}

    def test_filter_by_vehicle(self, world):
        assert types(world.clients.admin.get("/events/", params={"vehicle_id": world.vehicles.a2.id})) == {"alpha-two"}

    def test_filter_by_company(self, world):
        assert types(world.clients.admin.get("/events/", params={"company_id": world.company_b.id})) == {"beta-event"}

    def test_filter_by_document(self, db, world, document):
        other = make_document(db, world.vehicles.a, world.users.worker_a)
        make_event(db, world.vehicles.a, other, world.company_a, event_type="other-doc")
        assert types(world.clients.admin.get("/events/", params={"document_id": other.id})) == {"other-doc"}

    def test_filters_combine(self, world):
        response = world.clients.admin.get("/events/", params={"vehicle_id": world.vehicles.a.id, "company_id": world.company_b.id})
        assert types(response) == set()

    def test_pagination(self, world):
        page = world.clients.admin.get("/events/", params={"size": 2, "page": 2}).json()
        assert (page["total"], page["pages"], len(page["items"])) == (3, 2, 1)

    def test_items_embed_relations(self, world):
        item = world.clients.admin.get("/events/", params={"vehicle_id": world.vehicles.a.id}).json()["items"][0]
        assert item["vehicle"]["registration_number"] == "AAA-111"
        assert item["document"]["id"] and item["company"]["name"] == "Alpha Logistics"

    @pytest.mark.xfail(strict=True, reason="Event.for_user does not scope by company: every user can read every company's events")
    def test_manager_does_not_see_other_companys_events(self, world):
        assert "beta-event" not in types(world.clients.manager_a.get("/events/"))

    @pytest.mark.xfail(strict=True, reason="Event.for_user does not scope by company: every user can read every company's events")
    def test_manager_cannot_read_other_companys_event(self, db, world):
        event = db.query(Event).filter(Event.event_type == "beta-event").one()
        assert world.clients.manager_a.get(f"/events/{event.id}/").status_code == 404


class TestRetrieve:
    def test_returns_event(self, db, world, document):
        event = make_event(db, world.vehicles.a, document, world.company_a)
        body = world.clients.worker_a.get(f"/events/{event.id}/").json()
        assert (body["id"], body["price"]) == (event.id, 100.0)

    def test_unknown(self, world):
        assert world.clients.admin.get("/events/99999/").status_code == 404


class TestCreate:
    def test_creates_an_event(self, world, document, fetch):
        response = world.clients.manager_a.post("/events/", json=event_payload(world, document))
        assert response.status_code == 201
        stored = fetch(Event, response.json()["id"])
        assert (stored.event_type, stored.price, stored.company_id) == ("repair", 450.0, world.company_a.id)

    def test_price_is_optional(self, world, document):
        response = world.clients.manager_a.post("/events/", json=event_payload(world, document, price=None))
        assert response.status_code == 201 and response.json()["price"] is None

    def test_date_defaults_to_now(self, world, document):
        payload = event_payload(world, document)
        del payload["date"]
        body = world.clients.manager_a.post("/events/", json=payload).json()
        assert abs((datetime.fromisoformat(body["date"]) - datetime.now()).total_seconds()) < 60

    @pytest.mark.parametrize("field", ["document_id", "company_id"])
    def test_unknown_references(self, world, document, field):
        response = world.clients.manager_a.post("/events/", json=event_payload(world, document, **{field: 99999}))
        assert response.status_code == 422
        assert "does not exist" in response.text

    @pytest.mark.xfail(strict=True, reason="the vehicle reference is not validated, so an unknown vehicle_id causes a foreign-key error (500)")
    def test_unknown_vehicle(self, world, document):
        assert world.clients.manager_a.post("/events/", json=event_payload(world, document, vehicle_id=99999)).status_code == 422

    @pytest.mark.parametrize("missing", ["event_type", "description", "vehicle_id", "document_id", "company_id"])
    def test_required_fields(self, world, document, missing):
        payload = event_payload(world, document)
        del payload[missing]
        assert world.clients.manager_a.post("/events/", json=payload).status_code == 422

    @pytest.mark.parametrize("overrides", [{"event_type": "x" * 129}, {"description": "x" * 1025}, {"price": "free"}, {"date": "soon"}])
    def test_invalid_values(self, world, document, overrides):
        assert world.clients.manager_a.post("/events/", json=event_payload(world, document, **overrides)).status_code == 422

    def test_anonymous(self, world, document, anonymous):
        assert anonymous.post("/events/", json=event_payload(world, document)).status_code == 401


class TestUpdate:
    def test_update(self, db, world, document, fetch):
        event = make_event(db, world.vehicles.a, document, world.company_a)
        response = world.clients.manager_a.put(f"/events/{event.id}/", json=event_payload(world, document, description="Edited", price=None))
        assert response.status_code == 200
        stored = fetch(Event, event.id)
        assert (stored.description, stored.price) == ("Edited", None)

    def test_unknown_event(self, world, document):
        assert world.clients.manager_a.put("/events/99999/", json=event_payload(world, document)).status_code == 404

    def test_unknown_references(self, db, world, document):
        event = make_event(db, world.vehicles.a, document, world.company_a)
        assert world.clients.manager_a.put(f"/events/{event.id}/", json=event_payload(world, document, company_id=99999)).status_code == 422

    def test_validation(self, db, world, document):
        event = make_event(db, world.vehicles.a, document, world.company_a)
        assert world.clients.manager_a.put(f"/events/{event.id}/", json=event_payload(world, document, price="x")).status_code == 422


class TestDelete:
    def test_delete(self, db, world, document, fetch):
        event = make_event(db, world.vehicles.a, document, world.company_a)
        assert world.clients.manager_a.delete(f"/events/{event.id}/").status_code == 204
        assert fetch(Event, event.id) is None

    def test_unknown(self, world):
        assert world.clients.manager_a.delete("/events/99999/").status_code == 404


@pytest.mark.parametrize(("method", "path"), [("get", "/events/"), ("get", "/events/1/"), ("put", "/events/1/"), ("delete", "/events/1/")])
def test_requires_login(anonymous, method, path):
    assert getattr(anonymous, method)(path).status_code == 401

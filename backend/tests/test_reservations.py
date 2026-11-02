from datetime import datetime, timedelta

import pytest
from reservations.models import Reservation
from tests.factories import make_reservation


def reservation_payload(world, **overrides):
    start = datetime.now() + timedelta(days=10)
    payload = {
        "date_from": start.isoformat(),
        "date_to": (start + timedelta(days=3)).isoformat(),
        "vehicle_id": world.vehicles.a.id,
        "user_id": world.users.worker_a.id,
    }
    return {**payload, **overrides}


def ids(response):
    return {item["id"] for item in response.json()["items"]}


class TestListing:
    @pytest.fixture(autouse=True)
    def reservations(self, db, world):
        return {
            "worker_a": make_reservation(db, world.vehicles.a, world.users.worker_a),
            "worker_a2": make_reservation(db, world.vehicles.a2, world.users.worker_a2),
            "manager_a": make_reservation(db, world.vehicles.a, world.users.manager_a),
            "worker_b": make_reservation(db, world.vehicles.b, world.users.worker_b),
        }

    def test_admin_sees_all(self, world):
        assert world.clients.admin.get("/reservations/").json()["total"] == 4

    @pytest.mark.parametrize("client_name", ["worker_a", "manager_a"])
    def test_non_admins_only_see_their_own(self, world, reservations, client_name):
        assert ids(getattr(world.clients, client_name).get("/reservations/")) == {reservations[client_name].id}

    def test_filter_by_vehicle(self, world, reservations):
        assert ids(world.clients.admin.get("/reservations/", params={"vehicle_id": world.vehicles.a.id})) == {reservations["worker_a"].id, reservations["manager_a"].id}

    def test_filter_by_user(self, world, reservations):
        assert ids(world.clients.admin.get("/reservations/", params={"user_id": world.users.worker_b.id})) == {reservations["worker_b"].id}

    def test_filters_combine(self, world, reservations):
        response = world.clients.admin.get("/reservations/", params={"vehicle_id": world.vehicles.a.id, "user_id": world.users.manager_a.id})
        assert ids(response) == {reservations["manager_a"].id}

    def test_pagination(self, world):
        page = world.clients.admin.get("/reservations/", params={"size": 3, "page": 2}).json()
        assert (page["total"], page["pages"], len(page["items"])) == (4, 2, 1)

    def test_items_embed_vehicle_and_user(self, world):
        item = world.clients.worker_a.get("/reservations/").json()["items"][0]
        assert item["vehicle"]["registration_number"] == "AAA-111"
        assert item["user"]["email"] == "worker.a@example.com"
        assert "password" not in item["user"]


class TestUpcoming:
    def test_only_future_reservations_in_chronological_order(self, db, world):
        now = datetime.now()
        past = make_reservation(db, world.vehicles.a, world.users.worker_a, date_from=now - timedelta(days=3), date_to=now - timedelta(days=1))
        running = make_reservation(db, world.vehicles.a, world.users.worker_a, date_from=now - timedelta(hours=1), date_to=now + timedelta(days=1))
        later = make_reservation(db, world.vehicles.a, world.users.worker_a, date_from=now + timedelta(days=20), date_to=now + timedelta(days=21))
        sooner = make_reservation(db, world.vehicles.a, world.users.worker_a, date_from=now + timedelta(days=2), date_to=now + timedelta(days=3))

        response = world.clients.worker_a.get("/reservations/upcoming/")

        assert [item["id"] for item in response.json()["items"]] == [sooner.id, later.id]
        assert past.id not in ids(response) and running.id not in ids(response)

    def test_respects_user_scope(self, db, world):
        make_reservation(db, world.vehicles.b, world.users.worker_b)
        mine = make_reservation(db, world.vehicles.a, world.users.worker_a)
        assert ids(world.clients.worker_a.get("/reservations/upcoming/")) == {mine.id}
        assert world.clients.admin.get("/reservations/upcoming/").json()["total"] == 2

    def test_empty(self, world):
        assert world.clients.worker_a.get("/reservations/upcoming/").json()["items"] == []

    def test_route_is_not_shadowed_by_the_id_route(self, world):
        assert world.clients.worker_a.get("/reservations/upcoming/").status_code == 200


class TestRetrieve:
    def test_own_reservation(self, db, world):
        reservation = make_reservation(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.worker_a.get(f"/reservations/{reservation.id}/").json()["id"] == reservation.id

    def test_someone_elses_reservation_is_hidden(self, db, world):
        reservation = make_reservation(db, world.vehicles.a, world.users.worker_a2)
        assert world.clients.worker_a.get(f"/reservations/{reservation.id}/").status_code == 404

    def test_admin_sees_any(self, db, world):
        reservation = make_reservation(db, world.vehicles.b, world.users.worker_b)
        assert world.clients.admin.get(f"/reservations/{reservation.id}/").status_code == 200

    def test_unknown(self, world):
        assert world.clients.admin.get("/reservations/99999/").status_code == 404


class TestCreate:
    def test_worker_books_for_themselves(self, world, fetch):
        response = world.clients.worker_a.post("/reservations/", json=reservation_payload(world))
        assert response.status_code == 201
        assert fetch(Reservation, response.json()["id"]).user_id == world.users.worker_a.id

    def test_reservation_date_defaults_to_now(self, world):
        body = world.clients.worker_a.post("/reservations/", json=reservation_payload(world)).json()
        assert abs(datetime.fromisoformat(body["reservation_date"]) - datetime.now()) < timedelta(minutes=1)

    def test_worker_cannot_book_for_someone_else(self, world):
        assert world.clients.worker_a.post("/reservations/", json=reservation_payload(world, user_id=world.users.worker_a2.id)).status_code == 403

    def test_manager_books_for_a_company_worker(self, world):
        assert world.clients.manager_a.post("/reservations/", json=reservation_payload(world, user_id=world.users.worker_a2.id)).status_code == 201

    def test_manager_cannot_book_for_another_company(self, world):
        assert world.clients.manager_a.post("/reservations/", json=reservation_payload(world, user_id=world.users.worker_b.id)).status_code == 403

    def test_admin_books_for_anyone(self, world):
        assert world.clients.admin.post("/reservations/", json=reservation_payload(world, user_id=world.users.worker_b.id, vehicle_id=world.vehicles.b.id)).status_code == 201

    @pytest.mark.parametrize("field", ["vehicle_id", "user_id"])
    def test_unknown_references(self, world, field):
        response = world.clients.admin.post("/reservations/", json=reservation_payload(world, **{field: 99999}))
        assert response.status_code == 422

    @pytest.mark.parametrize("missing", ["date_from", "date_to", "vehicle_id", "user_id"])
    def test_required_fields(self, world, missing):
        payload = reservation_payload(world)
        del payload[missing]
        assert world.clients.admin.post("/reservations/", json=payload).status_code == 422

    @pytest.mark.parametrize("field", ["date_from", "date_to"])
    def test_invalid_dates(self, world, field):
        assert world.clients.admin.post("/reservations/", json=reservation_payload(world, **{field: "next week"})).status_code == 422

    def test_anonymous(self, world, anonymous):
        assert anonymous.post("/reservations/", json=reservation_payload(world)).status_code == 401

    @pytest.mark.xfail(strict=True, reason="the API accepts reservations that end before they start")
    def test_end_must_be_after_start(self, world):
        start = datetime.now() + timedelta(days=5)
        payload = reservation_payload(world, date_from=start.isoformat(), date_to=(start - timedelta(days=1)).isoformat())
        assert world.clients.worker_a.post("/reservations/", json=payload).status_code == 422

    @pytest.mark.xfail(strict=True, reason="overlapping bookings of the same vehicle are accepted (the frontend expects a 409)")
    def test_overlapping_booking_of_the_same_vehicle_is_rejected(self, db, world):
        first = make_reservation(db, world.vehicles.a, world.users.worker_a2)
        payload = reservation_payload(world, date_from=first.date_from.isoformat(), date_to=first.date_to.isoformat())
        assert world.clients.worker_a.post("/reservations/", json=payload).status_code == 409

    @pytest.mark.xfail(strict=True, reason="vehicle access is not validated: a worker can reserve another company's vehicle")
    def test_cannot_reserve_another_companys_vehicle(self, world):
        assert world.clients.worker_a.post("/reservations/", json=reservation_payload(world, vehicle_id=world.vehicles.b.id)).status_code in (403, 404, 422)


class TestUpdate:
    def test_update_dates(self, db, world, fetch):
        reservation = make_reservation(db, world.vehicles.a, world.users.worker_a)
        new_end = (datetime.now() + timedelta(days=30)).replace(microsecond=0)
        response = world.clients.worker_a.put(f"/reservations/{reservation.id}/", json=reservation_payload(world, date_to=new_end.isoformat()))
        assert response.status_code == 200
        assert fetch(Reservation, reservation.id).date_to == new_end

    def test_worker_cannot_reassign_to_someone_else(self, db, world, fetch):
        reservation = make_reservation(db, world.vehicles.a, world.users.worker_a)
        response = world.clients.worker_a.put(f"/reservations/{reservation.id}/", json=reservation_payload(world, user_id=world.users.worker_a2.id))
        assert response.status_code == 403
        assert fetch(Reservation, reservation.id).user_id == world.users.worker_a.id

    def test_cannot_update_someone_elses(self, db, world):
        reservation = make_reservation(db, world.vehicles.a, world.users.worker_a2)
        assert world.clients.worker_a.put(f"/reservations/{reservation.id}/", json=reservation_payload(world)).status_code == 404

    def test_unknown_reservation(self, world):
        assert world.clients.admin.put("/reservations/99999/", json=reservation_payload(world)).status_code == 404

    def test_unknown_references(self, db, world):
        reservation = make_reservation(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.worker_a.put(f"/reservations/{reservation.id}/", json=reservation_payload(world, vehicle_id=99999)).status_code == 422


class TestDelete:
    def test_owner_deletes(self, db, world, fetch):
        reservation = make_reservation(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.worker_a.delete(f"/reservations/{reservation.id}/").status_code == 204
        assert fetch(Reservation, reservation.id) is None

    def test_cannot_delete_someone_elses(self, db, world, fetch):
        reservation = make_reservation(db, world.vehicles.a, world.users.worker_a2)
        assert world.clients.worker_a.delete(f"/reservations/{reservation.id}/").status_code == 404
        assert fetch(Reservation, reservation.id) is not None

    def test_unknown(self, world):
        assert world.clients.admin.delete("/reservations/99999/").status_code == 404


@pytest.mark.parametrize("method", ["get", "put", "delete"])
def test_requires_login(anonymous, method):
    assert getattr(anonymous, method)("/reservations/1/").status_code == 401


def test_collection_routes_require_login(anonymous):
    assert anonymous.get("/reservations/").status_code == 401
    assert anonymous.get("/reservations/upcoming/").status_code == 401

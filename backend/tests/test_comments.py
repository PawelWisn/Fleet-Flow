from datetime import datetime, timedelta

import pytest
from comments.models import Comment
from tests.factories import make_comment


def comment_payload(world, **overrides):
    payload = {"content": "Tyres need checking", "vehicle_id": world.vehicles.a.id, "user_id": world.users.worker_a.id}
    return {**payload, **overrides}


def contents(response):
    return {item["content"] for item in response.json()["items"]}


class TestListing:
    @pytest.fixture(autouse=True)
    def comments(self, db, world):
        make_comment(db, world.vehicles.a, world.users.worker_a, content="by worker a")
        make_comment(db, world.vehicles.a2, world.users.worker_a2, content="by worker a2")
        make_comment(db, world.vehicles.a, world.users.manager_a, content="by manager a")
        make_comment(db, world.vehicles.b, world.users.worker_b, content="by worker b")
        make_comment(db, world.vehicles.b, world.users.manager_b, content="by manager b")

    def test_admin_sees_all(self, world):
        assert world.clients.admin.get("/comments/").json()["total"] == 5

    def test_worker_sees_only_their_own(self, world):
        assert contents(world.clients.worker_a.get("/comments/")) == {"by worker a"}

    def test_manager_sees_own_and_their_workers(self, world):
        assert contents(world.clients.manager_a.get("/comments/")) == {"by worker a", "by worker a2", "by manager a"}

    def test_filter_by_vehicle(self, world):
        assert contents(world.clients.manager_a.get("/comments/", params={"vehicle_id": world.vehicles.a2.id})) == {"by worker a2"}

    def test_filter_by_user(self, world):
        assert contents(world.clients.manager_a.get("/comments/", params={"user_id": world.users.worker_a2.id})) == {"by worker a2"}

    def test_filters_cannot_widen_scope(self, world):
        assert contents(world.clients.worker_a.get("/comments/", params={"user_id": world.users.worker_a2.id})) == set()
        assert contents(world.clients.manager_a.get("/comments/", params={"vehicle_id": world.vehicles.b.id})) == set()

    def test_pagination(self, world):
        page = world.clients.admin.get("/comments/", params={"size": 2, "page": 3}).json()
        assert (page["total"], page["pages"], len(page["items"])) == (5, 3, 1)

    def test_items_embed_vehicle_and_user(self, world):
        item = world.clients.worker_a.get("/comments/").json()["items"][0]
        assert item["vehicle"]["registration_number"] == "AAA-111"
        assert item["user"]["email"] == "worker.a@example.com"


class TestRetrieve:
    def test_own_comment(self, db, world):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.worker_a.get(f"/comments/{comment.id}/").json()["id"] == comment.id

    def test_manager_reads_a_workers_comment(self, db, world):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.manager_a.get(f"/comments/{comment.id}/").status_code == 200

    def test_worker_cannot_read_a_colleagues_comment(self, db, world):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a2)
        assert world.clients.worker_a.get(f"/comments/{comment.id}/").status_code == 404

    def test_other_company_is_hidden(self, db, world):
        comment = make_comment(db, world.vehicles.b, world.users.worker_b)
        assert world.clients.manager_a.get(f"/comments/{comment.id}/").status_code == 404

    def test_unknown(self, world):
        assert world.clients.admin.get("/comments/99999/").status_code == 404


class TestCreate:
    def test_worker_comments_as_themselves(self, world, fetch):
        response = world.clients.worker_a.post("/comments/", json=comment_payload(world))
        assert response.status_code == 201
        assert fetch(Comment, response.json()["id"]).content == "Tyres need checking"

    def test_date_defaults_to_now(self, world):
        body = world.clients.worker_a.post("/comments/", json=comment_payload(world)).json()
        assert abs(datetime.fromisoformat(body["date"]) - datetime.now()) < timedelta(minutes=1)

    def test_worker_cannot_comment_as_someone_else(self, world):
        assert world.clients.worker_a.post("/comments/", json=comment_payload(world, user_id=world.users.worker_a2.id)).status_code == 403

    def test_manager_can_comment_as_a_company_worker(self, world):
        assert world.clients.manager_a.post("/comments/", json=comment_payload(world, user_id=world.users.worker_a2.id)).status_code == 201

    def test_manager_cannot_comment_as_another_company_user(self, world):
        assert world.clients.manager_a.post("/comments/", json=comment_payload(world, user_id=world.users.worker_b.id)).status_code == 403

    @pytest.mark.parametrize("field", ["vehicle_id", "user_id"])
    def test_unknown_references(self, world, field):
        assert world.clients.admin.post("/comments/", json=comment_payload(world, **{field: 99999})).status_code == 422

    @pytest.mark.parametrize("content", ["", "x" * 1001])
    def test_content_length_bounds(self, world, content):
        assert world.clients.worker_a.post("/comments/", json=comment_payload(world, content=content)).status_code == 422

    @pytest.mark.parametrize("content", ["x", "x" * 1000])
    def test_content_at_the_bounds(self, world, content):
        assert world.clients.worker_a.post("/comments/", json=comment_payload(world, content=content)).status_code == 201

    @pytest.mark.parametrize("missing", ["content", "vehicle_id", "user_id"])
    def test_required_fields(self, world, missing):
        payload = comment_payload(world)
        del payload[missing]
        assert world.clients.worker_a.post("/comments/", json=payload).status_code == 422

    def test_anonymous(self, world, anonymous):
        assert anonymous.post("/comments/", json=comment_payload(world)).status_code == 401

    @pytest.mark.xfail(strict=True, reason="vehicle access is not validated: a worker can comment on another company's vehicle")
    def test_cannot_comment_on_another_companys_vehicle(self, world):
        assert world.clients.worker_a.post("/comments/", json=comment_payload(world, vehicle_id=world.vehicles.b.id)).status_code in (403, 404, 422)


class TestUpdate:
    def test_update_content(self, db, world, fetch):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a)
        response = world.clients.worker_a.put(f"/comments/{comment.id}/", json=comment_payload(world, content="Edited"))
        assert response.status_code == 200
        assert fetch(Comment, comment.id).content == "Edited"

    def test_date_is_kept_when_the_client_sends_it_back(self, db, world, fetch):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a, date=datetime(2026, 1, 1, 12, 0))
        world.clients.worker_a.put(f"/comments/{comment.id}/", json=comment_payload(world, content="Edited", date="2026-01-01T12:00:00"))
        assert fetch(Comment, comment.id).date == datetime(2026, 1, 1, 12, 0)

    @pytest.mark.xfail(strict=True, reason="omitting `date` on PUT resets it to now (the frontend works around this by sending it back)")
    def test_date_is_kept_when_omitted(self, db, world, fetch):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a, date=datetime(2026, 1, 1, 12, 0))
        world.clients.worker_a.put(f"/comments/{comment.id}/", json=comment_payload(world, content="Edited"))
        assert fetch(Comment, comment.id).date == datetime(2026, 1, 1, 12, 0)

    def test_cannot_edit_a_colleagues_comment(self, db, world):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a2)
        assert world.clients.worker_a.put(f"/comments/{comment.id}/", json=comment_payload(world)).status_code == 404

    def test_unknown_comment(self, world):
        assert world.clients.admin.put("/comments/99999/", json=comment_payload(world)).status_code == 404

    def test_unknown_references(self, db, world):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.worker_a.put(f"/comments/{comment.id}/", json=comment_payload(world, vehicle_id=99999)).status_code == 422

    def test_validation(self, db, world):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.worker_a.put(f"/comments/{comment.id}/", json=comment_payload(world, content="x" * 1001)).status_code == 422

    @pytest.mark.xfail(strict=True, reason="update_comment skips validate_user_reference, so a worker can reassign their comment to a colleague")
    def test_worker_cannot_reassign_to_someone_else(self, db, world):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a)
        response = world.clients.worker_a.put(f"/comments/{comment.id}/", json=comment_payload(world, user_id=world.users.worker_a2.id))
        assert response.status_code == 403


class TestDelete:
    def test_delete_own(self, db, world, fetch):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.worker_a.delete(f"/comments/{comment.id}/").status_code == 204
        assert fetch(Comment, comment.id) is None

    def test_manager_deletes_a_workers_comment(self, db, world, fetch):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.manager_a.delete(f"/comments/{comment.id}/").status_code == 204

    def test_cannot_delete_a_colleagues_comment(self, db, world, fetch):
        comment = make_comment(db, world.vehicles.a, world.users.worker_a2)
        assert world.clients.worker_a.delete(f"/comments/{comment.id}/").status_code == 404
        assert fetch(Comment, comment.id) is not None

    def test_unknown(self, world):
        assert world.clients.admin.delete("/comments/99999/").status_code == 404


@pytest.mark.parametrize(("method", "path"), [("get", "/comments/"), ("get", "/comments/1/"), ("put", "/comments/1/"), ("delete", "/comments/1/")])
def test_requires_login(anonymous, method, path):
    assert getattr(anonymous, method)(path).status_code == 401

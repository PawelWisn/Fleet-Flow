import pytest
from tests.factories import PASSWORD, make_comment, make_document, make_refuel, make_reservation
from users.models import User, UserRole


def user_payload(**overrides):
    payload = {
        "email": "new.user@example.com",
        "name": "New User",
        "role": "worker",
        "company_id": None,
        "password1": "Str0ng!pass",
        "password2": "Str0ng!pass",
    }
    return {**payload, **overrides}


def emails(response):
    return {item["email"] for item in response.json()["items"]}


class TestListing:
    def test_admin_sees_everyone(self, world):
        response = world.clients.admin.get("/users/")
        assert response.status_code == 200
        assert response.json()["total"] == 6

    def test_manager_sees_only_their_company_and_never_admins(self, world):
        assert emails(world.clients.manager_a.get("/users/")) == {"manager.a@example.com", "worker.a@example.com", "worker.a2@example.com"}

    def test_worker_sees_colleagues_of_their_company(self, world):
        assert emails(world.clients.worker_a.get("/users/")) == {"manager.a@example.com", "worker.a@example.com", "worker.a2@example.com"}

    def test_admin_in_the_same_company_stays_hidden_from_non_admins(self, db, world, client_for):
        from tests.factories import make_user

        make_user(db, UserRole.ADMIN, world.company_a, email="hidden.admin@example.com")
        assert "hidden.admin@example.com" not in emails(world.clients.manager_a.get("/users/"))

    @pytest.mark.parametrize("term", ["alpha", "ALPHA", "worker.a2", "Second"])
    def test_search_is_case_insensitive_and_matches_name_or_email(self, world, term):
        assert emails(world.clients.admin.get("/users/", params={"search": term}))

    def test_search_without_match(self, world):
        assert world.clients.admin.get("/users/", params={"search": "zzz"}).json()["items"] == []

    def test_role_filter(self, world):
        assert emails(world.clients.admin.get("/users/", params={"role": "manager"})) == {"manager.a@example.com", "manager.b@example.com"}

    def test_company_filter(self, world):
        response = world.clients.admin.get("/users/", params={"company_id": world.company_b.id})
        assert emails(response) == {"manager.b@example.com", "worker.b@example.com"}

    def test_filters_combine(self, world):
        response = world.clients.admin.get("/users/", params={"role": "worker", "search": "beta"})
        assert emails(response) == {"worker.b@example.com"}

    def test_pagination(self, world):
        page = world.clients.admin.get("/users/", params={"size": 4, "page": 2}).json()
        assert (page["total"], page["pages"], page["page"], len(page["items"])) == (6, 2, 2, 2)

    @pytest.mark.parametrize("size", [0, 101])
    def test_page_size_is_bounded(self, world, size):
        assert world.clients.admin.get("/users/", params={"size": size}).status_code == 422

    def test_never_exposes_password_hashes(self, world):
        assert all("password" not in item for item in world.clients.admin.get("/users/").json()["items"])


class TestRetrieve:
    def test_admin_can_fetch_anyone(self, world):
        response = world.clients.admin.get(f"/users/{world.users.worker_b.id}/")
        assert response.status_code == 200
        assert response.json()["email"] == world.users.worker_b.email

    def test_manager_can_fetch_company_users(self, world):
        assert world.clients.manager_a.get(f"/users/{world.users.worker_a.id}/").status_code == 200

    def test_manager_cannot_fetch_other_company_users(self, world):
        assert world.clients.manager_a.get(f"/users/{world.users.worker_b.id}/").status_code == 404

    def test_manager_cannot_fetch_admins(self, world):
        assert world.clients.manager_a.get(f"/users/{world.users.admin.id}/").status_code == 404

    def test_unknown_id(self, world):
        assert world.clients.admin.get("/users/99999/").status_code == 404

    def test_id_must_be_an_integer(self, world):
        assert world.clients.admin.get("/users/abc/").status_code == 422

    def test_detail_includes_related_collections(self, db, world):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        make_comment(db, world.vehicles.a, world.users.worker_a)
        make_reservation(db, world.vehicles.a, world.users.worker_a)

        body = world.clients.admin.get(f"/users/{world.users.worker_a.id}/").json()

        assert (len(body["refuels"]), len(body["comments"]), len(body["reservations"])) == (1, 1, 1)
        assert body["company"]["id"] == world.company_a.id


class TestCreate:
    def test_admin_creates_any_role(self, world, fetch):
        for role in ("admin", "manager", "worker"):
            response = world.clients.admin.post("/users/", json=user_payload(email=f"new.{role}@example.com", role=role, company_id=world.company_a.id))
            assert response.status_code == 201, response.text
            assert response.json()["role"] == role

    def test_manager_can_create_workers(self, world):
        response = world.clients.manager_a.post("/users/", json=user_payload(company_id=world.company_a.id))
        assert response.status_code == 201

    @pytest.mark.parametrize("role", ["manager", "admin"])
    def test_manager_cannot_create_privileged_users(self, world, role):
        assert world.clients.manager_a.post("/users/", json=user_payload(role=role, company_id=world.company_a.id)).status_code == 403

    def test_worker_cannot_create_users(self, world):
        assert world.clients.worker_a.post("/users/", json=user_payload(company_id=world.company_a.id)).status_code == 403

    def test_anonymous_cannot_create_users(self, world, anonymous):
        assert anonymous.post("/users/", json=user_payload()).status_code == 401

    @pytest.mark.xfail(strict=True, reason="a manager can currently create users in companies they do not belong to")
    def test_manager_cannot_create_users_in_another_company(self, world):
        assert world.clients.manager_a.post("/users/", json=user_payload(company_id=world.company_b.id)).status_code == 403

    def test_password_is_hashed_and_user_can_log_in(self, world, fetch, anonymous):
        created = world.clients.admin.post("/users/", json=user_payload(company_id=world.company_a.id)).json()

        assert "password" not in created
        stored = fetch(User, created["id"])
        assert stored.password != "Str0ng!pass"
        assert anonymous.post("/users/login/", json={"email": "new.user@example.com", "password": "Str0ng!pass"}).status_code == 200

    def test_duplicate_email(self, world):
        response = world.clients.admin.post("/users/", json=user_payload(email=world.users.worker_a.email))
        assert response.status_code == 422
        assert "already been taken" in response.text

    def test_unknown_company(self, world):
        response = world.clients.admin.post("/users/", json=user_payload(company_id=99999))
        assert response.status_code == 422

    def test_company_is_optional(self, world):
        assert world.clients.admin.post("/users/", json=user_payload()).status_code == 201

    @pytest.mark.parametrize(
        ("overrides", "message"),
        [
            ({"password2": "Different1!"}, "do not match"),
            ({"password1": "Sh0rt!", "password2": "Sh0rt!"}, "at least 8"),
            ({"password1": "alllower1!", "password2": "alllower1!"}, "uppercase"),
            ({"password1": "ALLUPPER1!", "password2": "ALLUPPER1!"}, "lowercase"),
            ({"password1": "NoDigits!!", "password2": "NoDigits!!"}, "digit"),
            ({"password1": "NoSpecial11", "password2": "NoSpecial11"}, "special"),
            ({"password1": "Has Space1!", "password2": "Has Space1!"}, "whitespace"),
            ({"password1": "A1!" + "a" * 70, "password2": "A1!" + "a" * 70}, "at most 64"),
            ({"email": "no-at-sign"}, "'@'"),
            ({"email": "spa ce@example.com"}, "whitespace"),
            ({"role": "superuser"}, "role"),
            ({"name": ""}, None),
        ],
    )
    def test_validation_errors(self, world, overrides, message):
        response = world.clients.admin.post("/users/", json=user_payload(**overrides))
        if message is None:
            # empty names are not rejected by the schema; just make sure the endpoint answers sanely
            assert response.status_code in (201, 422)
            return
        assert response.status_code == 422
        assert message in response.text

    @pytest.mark.parametrize("missing", ["password1", "password2"])
    def test_passwords_are_required(self, world, missing):
        payload = user_payload()
        del payload[missing]
        response = world.clients.admin.post("/users/", json=payload)
        assert response.status_code == 422
        assert "Passwords required" in response.text

    @pytest.mark.parametrize("missing", ["email", "name", "role"])
    def test_required_fields(self, world, missing):
        payload = user_payload()
        del payload[missing]
        assert world.clients.admin.post("/users/", json=payload).status_code == 422


class TestUpdate:
    def update_payload(self, user, **overrides):
        return user_payload(email=user.email, name=user.name, role=user.role.value, company_id=user.company_id, password1=PASSWORD, password2=PASSWORD) | overrides

    def test_admin_can_update_anyone(self, world, fetch):
        target = world.users.worker_b
        response = world.clients.admin.put(f"/users/{target.id}/", json=self.update_payload(target, name="Renamed"))
        assert response.status_code == 200
        assert fetch(User, target.id).name == "Renamed"

    def test_update_changes_the_password(self, world, anonymous):
        target = world.users.worker_a
        world.clients.admin.put(f"/users/{target.id}/", json=self.update_payload(target, password1="N3w!password", password2="N3w!password"))
        assert anonymous.post("/users/login/", json={"email": target.email, "password": "N3w!password"}).status_code == 200
        assert anonymous.post("/users/login/", json={"email": target.email, "password": PASSWORD}).status_code == 401

    def test_users_can_update_themselves(self, world, fetch):
        me = world.users.worker_a
        response = world.clients.worker_a.put(f"/users/{me.id}/", json=self.update_payload(me, name="My New Name"))
        assert response.status_code == 200
        assert fetch(User, me.id).name == "My New Name"

    def test_manager_cannot_update_colleagues(self, world, fetch):
        target = world.users.worker_a
        response = world.clients.manager_a.put(f"/users/{target.id}/", json=self.update_payload(target, name="Hacked"))
        assert response.status_code == 403
        assert fetch(User, target.id).name == target.name

    def test_worker_cannot_update_others(self, world):
        target = world.users.worker_a2
        assert world.clients.worker_a.put(f"/users/{target.id}/", json=self.update_payload(target)).status_code == 403

    def test_cannot_take_an_email_that_is_in_use_when_editing_yourself(self, world):
        me = world.users.worker_a
        response = world.clients.worker_a.put(f"/users/{me.id}/", json=self.update_payload(me, email=world.users.worker_a2.email))
        assert response.status_code == 422

    def test_keeping_your_own_email_is_fine(self, world):
        me = world.users.worker_a
        assert world.clients.worker_a.put(f"/users/{me.id}/", json=self.update_payload(me)).status_code == 200

    @pytest.mark.xfail(strict=True, reason="an admin changing someone else's email to a taken one hits the unique constraint (500) instead of a 422")
    def test_admin_cannot_assign_a_duplicate_email(self, world):
        target = world.users.worker_a
        response = world.clients.admin.put(f"/users/{target.id}/", json=self.update_payload(target, email=world.users.worker_a2.email))
        assert response.status_code == 422

    @pytest.mark.xfail(strict=True, reason="privilege escalation: update_user lets anyone change their own role")
    def test_worker_cannot_promote_themselves(self, world, fetch):
        me = world.users.worker_a
        world.clients.worker_a.put(f"/users/{me.id}/", json=self.update_payload(me, role="admin"))
        assert fetch(User, me.id).role == UserRole.WORKER

    def test_unknown_company(self, world):
        target = world.users.worker_a
        assert world.clients.admin.put(f"/users/{target.id}/", json=self.update_payload(target, company_id=99999)).status_code == 422

    def test_unknown_user(self, world):
        target = world.users.worker_a
        assert world.clients.admin.put("/users/99999/", json=self.update_payload(target)).status_code == 404

    def test_manager_cannot_reach_admins(self, world):
        target = world.users.admin
        assert world.clients.manager_a.put(f"/users/{target.id}/", json=self.update_payload(target)).status_code == 403


class TestDelete:
    def test_admin_can_delete_anyone(self, world, fetch):
        target = world.users.worker_b
        assert world.clients.admin.delete(f"/users/{target.id}/").status_code == 204
        assert fetch(User, target.id) is None

    def test_user_can_delete_themselves(self, world, fetch):
        me = world.users.worker_a
        assert world.clients.worker_a.delete(f"/users/{me.id}/").status_code == 204
        assert fetch(User, me.id) is None

    def test_manager_cannot_delete_workers(self, world, fetch):
        target = world.users.worker_a
        assert world.clients.manager_a.delete(f"/users/{target.id}/").status_code == 403
        assert fetch(User, target.id) is not None

    def test_worker_cannot_delete_colleagues(self, world):
        assert world.clients.worker_a.delete(f"/users/{world.users.worker_a2.id}/").status_code == 403

    def test_unknown_user(self, world):
        assert world.clients.admin.delete("/users/99999/").status_code == 404

    def test_deleting_a_user_removes_their_records(self, db, world):
        from comments.models import Comment
        from database import engine
        from documents.models import Document
        from refuels.models import Refuel
        from reservations.models import Reservation
        from sqlmodel import Session, select

        user = world.users.worker_a
        document = make_document(db, world.vehicles.a, user)
        make_refuel(db, world.vehicles.a, user, document)
        make_comment(db, world.vehicles.a, user)
        make_reservation(db, world.vehicles.a, user)

        assert world.clients.admin.delete(f"/users/{user.id}/").status_code == 204

        with Session(engine) as session:
            for model in (Comment, Document, Refuel, Reservation):
                assert session.exec(select(model).where(model.user_id == user.id)).all() == []


class TestAuthentication:
    @pytest.mark.parametrize(("method", "path"), [("get", "/users/"), ("get", "/users/1/"), ("put", "/users/1/"), ("delete", "/users/1/")])
    def test_requires_login(self, anonymous, method, path):
        kwargs = {"json": user_payload()} if method == "put" else {}
        assert getattr(anonymous, method)(path, **kwargs).status_code == 401

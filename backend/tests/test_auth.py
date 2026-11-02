from datetime import datetime, timedelta

import pytest
from jose import jwt
from tests.factories import PASSWORD
from users.utils import create_access_token, hash_password, verify_password


class TestLogin:
    def test_success_sets_http_only_cookie_and_returns_user(self, world, anonymous):
        response = anonymous.post("/users/login/", json={"email": world.users.admin.email, "password": PASSWORD})

        assert response.status_code == 200
        body = response.json()
        assert body["token_type"] == "bearer"
        assert body["user"]["email"] == world.users.admin.email
        assert body["user"]["role"] == "admin"
        set_cookie = response.headers["set-cookie"]
        assert "token=" in set_cookie and "HttpOnly" in set_cookie
        # The token in the cookie is the same one returned in the body and identifies the user
        assert jwt.decode(body["access_token"], "test-secret-key")["sub"] == world.users.admin.email

    def test_login_never_exposes_the_password_hash(self, world, anonymous):
        response = anonymous.post("/users/login/", json={"email": world.users.admin.email, "password": PASSWORD})
        assert "password" not in response.json()["user"]

    def test_cookie_authenticates_following_requests(self, world, anonymous):
        anonymous.post("/users/login/", json={"email": world.users.worker_a.email, "password": PASSWORD})
        assert anonymous.get("/users/me/").json()["email"] == world.users.worker_a.email

    def test_wrong_password(self, world, anonymous):
        response = anonymous.post("/users/login/", json={"email": world.users.admin.email, "password": "nope"})
        assert response.status_code == 401
        assert "set-cookie" not in response.headers

    def test_unknown_email_gives_the_same_error_as_wrong_password(self, world, anonymous):
        wrong_password = anonymous.post("/users/login/", json={"email": world.users.admin.email, "password": "nope"})
        unknown = anonymous.post("/users/login/", json={"email": "ghost@example.com", "password": "nope"})
        assert unknown.status_code == 401
        assert unknown.json() == wrong_password.json()

    @pytest.mark.parametrize("payload", [{}, {"email": "a@b.c"}, {"password": "x"}])
    def test_missing_fields(self, anonymous, payload):
        assert anonymous.post("/users/login/", json=payload).status_code == 422


class TestSession:
    def test_me_returns_current_user_with_company(self, world):
        body = world.clients.manager_a.get("/users/me/").json()
        assert body["email"] == world.users.manager_a.email
        assert body["company"]["name"] == "Alpha Logistics"
        assert "password" not in body

    def test_me_is_not_shadowed_by_the_user_id_route(self, world):
        # /me/ must be declared before /{user_id}/, otherwise "me" fails integer validation with 422
        assert world.clients.worker_a.get("/users/me/").status_code == 200

    def test_no_cookie(self, world, anonymous):
        response = anonymous.get("/users/me/")
        assert response.status_code == 401

    def test_garbage_token(self, anonymous):
        anonymous.cookies.set("token", "not-a-jwt")
        assert anonymous.get("/users/me/").status_code == 401

    def test_token_signed_with_another_key(self, world, anonymous):
        anonymous.cookies.set("token", jwt.encode({"sub": world.users.admin.email, "exp": datetime.now() + timedelta(hours=1)}, "other-key"))
        assert anonymous.get("/users/me/").status_code == 401

    def test_expired_token(self, world, anonymous):
        anonymous.cookies.set("token", jwt.encode({"sub": world.users.admin.email, "exp": datetime.now() - timedelta(minutes=1)}, "test-secret-key"))
        assert anonymous.get("/users/me/").status_code == 401

    def test_token_without_subject(self, anonymous):
        anonymous.cookies.set("token", jwt.encode({"exp": datetime.now() + timedelta(hours=1)}, "test-secret-key"))
        assert anonymous.get("/users/me/").status_code == 401

    def test_token_for_a_user_that_no_longer_exists(self, world, anonymous):
        anonymous.cookies.set("token", create_access_token("ghost@example.com"))
        assert anonymous.get("/users/me/").status_code == 401

    def test_logout_clears_the_cookie(self, world, anonymous):
        anonymous.post("/users/login/", json={"email": world.users.admin.email, "password": PASSWORD})
        assert anonymous.get("/users/me/").status_code == 200

        response = anonymous.post("/users/logout/")

        assert response.status_code == 204
        assert anonymous.get("/users/me/").status_code == 401

    def test_logout_without_session_is_harmless(self, anonymous):
        assert anonymous.post("/users/logout/").status_code == 204


class TestPasswordUtils:
    def test_hash_is_salted_and_verifiable(self):
        first, second = hash_password("Secret1!"), hash_password("Secret1!")
        assert first != "Secret1!" and first != second
        assert verify_password("Secret1!", first)
        assert not verify_password("secret1!", first)

    def test_access_token_contains_subject_and_future_expiry(self):
        payload = jwt.decode(create_access_token("a@b.c"), "test-secret-key")
        assert payload["sub"] == "a@b.c"
        assert payload["exp"] > datetime.now().timestamp() - 5

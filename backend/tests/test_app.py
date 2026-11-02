import pytest
from main import app

PUBLIC = {("POST", "/users/login/"), ("POST", "/users/logout/"), ("GET", "/")}


def protected_routes():
    # read the routes from the OpenAPI document: newer FastAPI versions keep included routers nested in app.routes
    for path, operations in app.openapi()["paths"].items():
        for method in sorted(operations):
            if (method.upper(), path) not in PUBLIC:
                yield method.upper(), path


def concrete(path):
    import re

    return re.sub(r"\{[^}]+\}", "1", path)


def test_the_app_exposes_the_expected_number_of_routes():
    # 1 root + 7 users + 6 vehicles + 6 companies + 6 documents + 6 reservations + 6 insurrances + 5 comments + 5 events + 6 refuels
    assert len(list(protected_routes())) + len(PUBLIC) == 54


@pytest.mark.parametrize(("method", "path"), list(protected_routes()))
def test_every_other_endpoint_requires_authentication(anonymous, method, path):
    response = anonymous.request(method, concrete(path))
    assert response.status_code == 401, f"{method} {path} answered {response.status_code} without a session"


def test_root_redirects_to_the_documentation(anonymous):
    response = anonymous.get("/", follow_redirects=False)
    assert response.is_redirect
    assert response.headers["location"] == "/docs"


def test_openapi_schema_builds(anonymous):
    schema = anonymous.get("/openapi.json")
    assert schema.status_code == 200
    assert "/insurrances/finishing/" in schema.json()["paths"]


class TestCors:
    def test_frontend_origin_is_allowed_with_credentials(self, anonymous):
        response = anonymous.options("/users/me/", headers={"Origin": "http://localhost:8080", "Access-Control-Request-Method": "GET"})
        assert response.headers["access-control-allow-origin"] == "http://localhost:8080"
        assert response.headers["access-control-allow-credentials"] == "true"

    def test_dev_server_origin_is_allowed(self, anonymous):
        response = anonymous.options("/users/me/", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"})
        assert response.headers["access-control-allow-origin"] == "http://localhost:3000"

    def test_other_origins_are_not_allowed(self, anonymous):
        response = anonymous.options("/users/me/", headers={"Origin": "http://evil.example", "Access-Control-Request-Method": "GET"})
        assert "access-control-allow-origin" not in response.headers


class TestPaginationDefaults:
    def test_default_page_size_and_bounds(self, world):
        page = world.clients.admin.get("/vehicles/").json()
        assert page["size"] == 15 and page["page"] == 1

    @pytest.mark.parametrize("params", [{"page": 0}, {"size": 0}, {"size": 101}, {"page": "x"}])
    def test_invalid_pagination_parameters(self, world, params):
        assert world.clients.admin.get("/vehicles/", params=params).status_code == 422

    def test_page_past_the_end_is_empty(self, world):
        assert world.clients.admin.get("/vehicles/", params={"page": 9}).json()["items"] == []

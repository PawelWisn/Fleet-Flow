"""
Test configuration.

The suite needs a PostgreSQL server (the refuel statistics use ``to_char``). It never touches the development
database: it derives ``<db>_test`` from ``DB_URL`` (or uses ``TEST_DB_URL``), creates it on demand, and refuses to run
against a database whose name does not end with ``_test``.
"""

import os
import tempfile
from types import SimpleNamespace

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


def _resolve_test_db_url() -> str:
    if explicit := os.getenv("TEST_DB_URL"):
        url = make_url(explicit)
    else:
        url = make_url(os.environ["DB_URL"])
        url = url.set(database=f"{url.database}_test")
    assert url.database.endswith("_test"), f"Refusing to run tests against database {url.database!r}"
    return url.render_as_string(hide_password=False)


def _ensure_database(url: str) -> None:
    parsed = make_url(url)
    maintenance = create_engine(parsed.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with maintenance.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": parsed.database}).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{parsed.database}"'))
    maintenance.dispose()


TEST_DB_URL = _resolve_test_db_url()
_ensure_database(TEST_DB_URL)

# Must be set before the application modules are imported (database.py reads them at import time)
os.environ["DB_URL"] = TEST_DB_URL
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "60"
os.environ["MAX_FILE_SIZE"] = str(1024 * 1024)
os.environ["FE_PORT"] = "8080"
# DocumentFileManager creates its upload directory relative to the working directory at import time
os.chdir(tempfile.mkdtemp(prefix="fleetflow-tests-"))

import pytest  # noqa: E402
from database import engine  # noqa: E402
from documents.utils import DocumentFileManager  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from fastapi_pagination import add_pagination  # noqa: E402
from main import app  # noqa: E402
from sqlmodel import Session, SQLModel  # noqa: E402
from tests import factories  # noqa: E402
from users.models import UserRole  # noqa: E402
from users.utils import create_access_token  # noqa: E402

# main.py calls add_pagination() before the routers are included, so pagination is only wired up by the lifespan hook
# (which also runs alembic). Tests skip the lifespan, so wire pagination up explicitly now that all routes exist.
add_pagination(app)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def _clean_tables(_schema):
    yield
    tables = ", ".join(f'"{table.name}"' for table in SQLModel.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture(autouse=True)
def upload_dir(tmp_path, monkeypatch):
    """Point document storage at a per-test temporary directory."""
    import documents.views

    manager = DocumentFileManager(upload_dir=str(tmp_path / "uploads"))
    monkeypatch.setattr(documents.views, "document_file_manager", manager)
    return manager


@pytest.fixture
def db():
    with Session(engine, expire_on_commit=False) as session:
        yield session


@pytest.fixture
def fetch():
    """Load a row with a fresh session, so assertions see what the API committed."""

    def _fetch(model, obj_id):
        with Session(engine) as session:
            return session.get(model, obj_id)

    return _fetch


@pytest.fixture
def anonymous():
    # raise_server_exceptions=False so that an unhandled error shows up as a 500 response we can assert on
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def client_for():
    """Build an API client authenticated as the given user (via the same cookie the real login sets)."""

    def _client_for(user):
        client = TestClient(app, raise_server_exceptions=False)
        client.cookies.set("token", create_access_token(user.email))
        return client

    return _client_for


@pytest.fixture
def world(db, client_for):
    """
    Two tenants plus an admin:

    * company A: manager_a, worker_a, worker_a2, vehicle_a (+ vehicle_a2)
    * company B: manager_b, worker_b, vehicle_b
    * admin (belongs to its own company), who may see everything

    Every user has a ready-to-use client (``clients.<name>``).
    """
    company_a = factories.make_company(db, name="Alpha Logistics", nip="1111111111")
    company_b = factories.make_company(db, name="Beta Transport", nip="2222222222")
    company_admin = factories.make_company(db, name="FleetFlow Admin", nip="0000000000")

    users = SimpleNamespace(
        admin=factories.make_user(db, UserRole.ADMIN, company_admin, email="admin@example.com", name="Admin Root"),
        manager_a=factories.make_user(db, UserRole.MANAGER, company_a, email="manager.a@example.com", name="Manager Alpha"),
        worker_a=factories.make_user(db, UserRole.WORKER, company_a, email="worker.a@example.com", name="Worker Alpha"),
        worker_a2=factories.make_user(db, UserRole.WORKER, company_a, email="worker.a2@example.com", name="Second Alpha"),
        manager_b=factories.make_user(db, UserRole.MANAGER, company_b, email="manager.b@example.com", name="Manager Beta"),
        worker_b=factories.make_user(db, UserRole.WORKER, company_b, email="worker.b@example.com", name="Worker Beta"),
    )
    vehicles = SimpleNamespace(
        a=factories.make_vehicle(db, company_a, registration_number="AAA-111", brand="Ford", model="Transit"),
        a2=factories.make_vehicle(db, company_a, registration_number="AAA-222", brand="Volvo", model="FH16"),
        b=factories.make_vehicle(db, company_b, registration_number="BBB-111", brand="Scania", model="R450"),
    )
    clients = SimpleNamespace(**{name: client_for(user) for name, user in vars(users).items()})
    return SimpleNamespace(company_a=company_a, company_b=company_b, company_admin=company_admin, users=users, vehicles=vehicles, clients=clients)

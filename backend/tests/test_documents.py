import os
import time

import pytest
from documents.models import Document
from tests.factories import make_document

CONTENT = b"%PDF-1.4 fake pdf content"


def form(world, **overrides):
    data = {"title": "Registration", "description": "Official paper", "file_type": "registration", "vehicle_id": world.vehicles.a.id, "user_id": world.users.worker_a.id}
    return {**data, **overrides}


def upload(name="doc.pdf", content=CONTENT, mime="application/pdf"):
    return {"file": (name, content, mime)}


def stored_files(upload_dir):
    return sorted(os.listdir(upload_dir.upload_dir))


def titles(response):
    return [item["title"] for item in response.json()["items"]]


class TestCreate:
    def test_without_a_file(self, world, upload_dir):
        response = world.clients.manager_a.post("/documents/", data=form(world))

        assert response.status_code == 201
        body = response.json()
        assert (body["title"], body["file_path"], body["file_size"]) == ("Registration", None, None)
        assert body["vehicle"]["registration_number"] == "AAA-111"
        assert stored_files(upload_dir) == []

    def test_with_a_file_stores_the_real_content(self, world, upload_dir):
        """Regression: the upload stream used to be consumed before storing, so every file was saved empty."""
        response = world.clients.manager_a.post("/documents/", data=form(world), files=upload())

        assert response.status_code == 201
        body = response.json()
        assert body["file_size"] == len(CONTENT)
        assert body["file_path"].endswith(".pdf")
        with open(body["file_path"], "rb") as stored:
            assert stored.read() == CONTENT

    def test_stored_names_are_unique_and_do_not_leak_the_original_name(self, world, upload_dir):
        for _ in range(2):
            world.clients.manager_a.post("/documents/", data=form(world), files=upload(name="same.pdf"))
        names = stored_files(upload_dir)
        assert len(set(names)) == 2 and all("same" not in name for name in names)

    @pytest.mark.parametrize("name", ["doc.pdf", "notes.txt", "pack.zip", "pack.rar", "a.jpg", "a.jpeg", "a.png", "a.gif", "a.bmp", "a.tiff", "a.webp", "UPPER.PDF"])
    def test_allowed_extensions(self, world, name):
        assert world.clients.manager_a.post("/documents/", data=form(world), files=upload(name=name)).status_code == 201

    @pytest.mark.parametrize("name", ["virus.exe", "script.sh", "page.html", "noextension"])
    def test_disallowed_extensions(self, world, upload_dir, name):
        response = world.clients.manager_a.post("/documents/", data=form(world), files=upload(name=name))
        assert response.status_code == 400
        assert "not allowed" in response.json()["detail"]
        assert stored_files(upload_dir) == []

    def test_file_over_the_size_limit(self, world, upload_dir):
        response = world.clients.manager_a.post("/documents/", data=form(world), files=upload(content=b"x" * (1024 * 1024 + 1)))
        assert response.status_code == 400
        assert "exceeds maximum" in response.json()["detail"]
        assert stored_files(upload_dir) == []

    def test_file_exactly_at_the_size_limit(self, world):
        assert world.clients.manager_a.post("/documents/", data=form(world), files=upload(content=b"x" * 1024 * 1024)).status_code == 201

    @pytest.mark.parametrize("missing", ["title", "file_type", "vehicle_id", "user_id"])
    def test_required_fields(self, world, missing):
        data = form(world)
        del data[missing]
        assert world.clients.manager_a.post("/documents/", data=data).status_code == 422

    def test_description_is_optional(self, world):
        data = form(world)
        del data["description"]
        assert world.clients.manager_a.post("/documents/", data=data).json()["description"] == ""

    @pytest.mark.parametrize("field", ["vehicle_id", "user_id"])
    def test_unknown_references_are_rejected_before_storing_the_file(self, world, upload_dir, field):
        response = world.clients.manager_a.post("/documents/", data=form(world, **{field: 99999}), files=upload())
        assert response.status_code == 422
        assert stored_files(upload_dir) == []

    def test_anonymous(self, world, anonymous):
        assert anonymous.post("/documents/", data=form(world)).status_code == 401

    @pytest.mark.xfail(strict=True, reason="documents are not tenant-scoped: a manager can attach documents to another company's vehicle")
    def test_cannot_create_for_another_companys_vehicle(self, world):
        response = world.clients.manager_a.post("/documents/", data=form(world, vehicle_id=world.vehicles.b.id))
        assert response.status_code in (403, 404, 422)


class TestListing:
    def test_newest_first(self, db, world):
        for title in ("first", "second", "third"):
            make_document(db, world.vehicles.a, world.users.worker_a, title=title)
        assert titles(world.clients.manager_a.get("/documents/")) == ["third", "second", "first"]

    def test_search_by_title_description_plate_and_user_name(self, db, world):
        make_document(db, world.vehicles.a, world.users.worker_a, title="Insurance policy", description="annual")
        make_document(db, world.vehicles.a2, world.users.worker_a2, title="Other", description="contains needle here")
        client = world.clients.manager_a

        assert titles(client.get("/documents/", params={"search": "POLICY"})) == ["Insurance policy"]
        assert titles(client.get("/documents/", params={"search": "needle"})) == ["Other"]
        assert titles(client.get("/documents/", params={"search": "AAA-222"})) == ["Other"]
        assert titles(client.get("/documents/", params={"search": "second alpha"})) == ["Other"]
        assert titles(client.get("/documents/", params={"search": "nothing"})) == []

    def test_type_filter(self, db, world):
        make_document(db, world.vehicles.a, world.users.worker_a, title="Reg", file_type="registration")
        make_document(db, world.vehicles.a, world.users.worker_a, title="Man", file_type="manual")
        assert titles(world.clients.manager_a.get("/documents/", params={"document_type": "manual"})) == ["Man"]

    def test_search_and_type_combine(self, db, world):
        make_document(db, world.vehicles.a, world.users.worker_a, title="Reg one", file_type="registration")
        make_document(db, world.vehicles.a, world.users.worker_a, title="Reg two", file_type="manual")
        response = world.clients.manager_a.get("/documents/", params={"search": "reg", "document_type": "manual"})
        assert titles(response) == ["Reg two"]

    def test_pagination(self, db, world):
        for _ in range(5):
            make_document(db, world.vehicles.a, world.users.worker_a)
        page = world.clients.manager_a.get("/documents/", params={"size": 2, "page": 3}).json()
        assert (page["total"], page["pages"], len(page["items"])) == (5, 3, 1)

    @pytest.mark.xfail(strict=True, reason="SECURITY: DocumentRead.user is the raw User table model, so the owner's bcrypt hash is returned")
    def test_never_exposes_password_hashes(self, db, world):
        make_document(db, world.vehicles.a, world.users.worker_a)
        assert "password" not in world.clients.manager_a.get("/documents/").text

    @pytest.mark.xfail(strict=True, reason="documents are not tenant-scoped: every user sees every company's documents")
    def test_manager_does_not_see_other_companys_documents(self, db, world):
        make_document(db, world.vehicles.b, world.users.worker_b, title="Beta secret")
        assert titles(world.clients.manager_a.get("/documents/")) == []


class TestRetrieve:
    @pytest.mark.xfail(strict=True, reason="SECURITY: DocumentRead.user is the raw User table model, so the owner's bcrypt hash is returned")
    def test_returns_document_with_relations(self, db, world):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        body = world.clients.worker_a.get(f"/documents/{document.id}/").json()
        assert body["vehicle"]["registration_number"] == "AAA-111"
        assert body["user"]["email"] == "worker.a@example.com"
        assert "password" not in body["user"]

    def test_unknown(self, world):
        assert world.clients.worker_a.get("/documents/99999/").status_code == 404


class TestUpdate:
    def test_partial_update_changes_only_sent_fields(self, db, world, fetch):
        document = make_document(db, world.vehicles.a, world.users.worker_a, title="Old", description="keep", file_type="manual")
        response = world.clients.manager_a.put(f"/documents/{document.id}/", data={"title": "New"})
        assert response.status_code == 200
        stored = fetch(Document, document.id)
        assert (stored.title, stored.description, stored.file_type) == ("New", "keep", "manual")

    def test_can_blank_the_description(self, db, world, fetch):
        document = make_document(db, world.vehicles.a, world.users.worker_a, description="something")
        world.clients.manager_a.put(f"/documents/{document.id}/", data={"description": ""})
        assert fetch(Document, document.id).description == ""

    def test_can_reassign_vehicle_and_user(self, db, world, fetch):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        world.clients.manager_a.put(f"/documents/{document.id}/", data={"vehicle_id": world.vehicles.a2.id, "user_id": world.users.worker_a2.id})
        stored = fetch(Document, document.id)
        assert (stored.vehicle_id, stored.user_id) == (world.vehicles.a2.id, world.users.worker_a2.id)

    @pytest.mark.xfail(strict=True, reason="update_document passes a dict to validate_obj_reference, which then crashes (500) while building the error")
    @pytest.mark.parametrize("field", ["vehicle_id", "user_id"])
    def test_unknown_references(self, db, world, field):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.manager_a.put(f"/documents/{document.id}/", data={field: 99999}).status_code == 422

    def test_attaching_a_file_to_a_document_without_one(self, db, world, upload_dir, fetch):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        response = world.clients.manager_a.put(f"/documents/{document.id}/", files=upload(content=b"first"))
        assert response.status_code == 200
        assert response.json()["file_size"] == 5
        assert len(stored_files(upload_dir)) == 1

    def test_replacing_a_file_removes_the_old_one(self, world, upload_dir):
        created = world.clients.manager_a.post("/documents/", data=form(world), files=upload(content=b"old content")).json()
        old_path = created["file_path"]

        response = world.clients.manager_a.put(f"/documents/{created['id']}/", files=upload(name="new.txt", content=b"brand new content", mime="text/plain"))

        assert response.status_code == 200
        body = response.json()
        assert body["file_path"] != old_path and body["file_path"].endswith(".txt")
        assert body["file_size"] == len(b"brand new content")
        assert not os.path.exists(old_path)
        assert len(stored_files(upload_dir)) == 1
        assert open(body["file_path"], "rb").read() == b"brand new content"

    def test_update_without_a_file_keeps_the_existing_one(self, world):
        created = world.clients.manager_a.post("/documents/", data=form(world), files=upload()).json()
        world.clients.manager_a.put(f"/documents/{created['id']}/", data={"title": "Renamed"})
        assert os.path.exists(created["file_path"])

    @pytest.mark.xfail(strict=True, reason="the old file is deleted before the replacement is validated, so a rejected upload destroys the existing file")
    def test_rejected_replacement_keeps_the_old_file(self, world):
        created = world.clients.manager_a.post("/documents/", data=form(world), files=upload()).json()
        response = world.clients.manager_a.put(f"/documents/{created['id']}/", files=upload(name="bad.exe"))
        assert response.status_code == 400
        assert os.path.exists(created["file_path"])

    @pytest.mark.xfail(strict=True, reason="updated_at is never refreshed on update")
    def test_updated_at_advances(self, db, world, fetch):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        time.sleep(0.01)
        world.clients.manager_a.put(f"/documents/{document.id}/", data={"title": "Changed"})
        assert fetch(Document, document.id).updated_at > document.updated_at

    def test_unknown_document(self, world):
        assert world.clients.manager_a.put("/documents/99999/", data={"title": "x"}).status_code == 404


class TestDownload:
    def test_downloads_the_stored_file_under_the_document_title(self, world):
        created = world.clients.manager_a.post("/documents/", data=form(world, title="Vehicle card"), files=upload()).json()

        response = world.clients.worker_a.get(f"/documents/{created['id']}/download")

        assert response.status_code == 200
        assert response.content == CONTENT
        assert "Vehicle%20card.pdf" in response.headers["content-disposition"]

    def test_document_without_a_file(self, db, world):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        response = world.clients.worker_a.get(f"/documents/{document.id}/download")
        assert response.status_code == 404
        assert response.json()["detail"] == "File not found"

    def test_file_missing_on_disk(self, world):
        created = world.clients.manager_a.post("/documents/", data=form(world), files=upload()).json()
        os.remove(created["file_path"])
        assert world.clients.worker_a.get(f"/documents/{created['id']}/download").status_code == 404

    def test_unknown_document(self, world):
        assert world.clients.worker_a.get("/documents/99999/download").status_code == 404

    def test_anonymous(self, world, anonymous):
        created = world.clients.manager_a.post("/documents/", data=form(world), files=upload()).json()
        assert anonymous.get(f"/documents/{created['id']}/download").status_code == 401


class TestDelete:
    def test_removes_the_row_and_the_file(self, world, upload_dir, fetch):
        created = world.clients.manager_a.post("/documents/", data=form(world), files=upload()).json()

        assert world.clients.manager_a.delete(f"/documents/{created['id']}/").status_code == 204

        assert fetch(Document, created["id"]) is None
        assert stored_files(upload_dir) == []

    def test_document_without_a_file(self, db, world, fetch):
        document = make_document(db, world.vehicles.a, world.users.worker_a)
        assert world.clients.manager_a.delete(f"/documents/{document.id}/").status_code == 204
        assert fetch(Document, document.id) is None

    def test_removes_dependent_records(self, db, world):
        from database import engine
        from events.models import Event
        from refuels.models import Refuel
        from sqlmodel import Session, select
        from tests.factories import make_event, make_refuel

        document = make_document(db, world.vehicles.a, world.users.worker_a)
        make_refuel(db, world.vehicles.a, world.users.worker_a, document)
        make_event(db, world.vehicles.a, document, world.company_a)

        assert world.clients.manager_a.delete(f"/documents/{document.id}/").status_code == 204

        with Session(engine) as session:
            assert session.exec(select(Refuel)).all() == []
            assert session.exec(select(Event)).all() == []

    def test_unknown_document(self, world):
        assert world.clients.manager_a.delete("/documents/99999/").status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [("get", "/documents/"), ("get", "/documents/1/"), ("put", "/documents/1/"), ("delete", "/documents/1/")],
)
def test_requires_login(anonymous, method, path):
    assert getattr(anonymous, method)(path).status_code == 401

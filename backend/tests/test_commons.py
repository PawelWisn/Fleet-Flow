import asyncio

import pytest
from commons import (
    get_all_subclasses,
    get_body_error_info,
    get_filters,
    get_from_qs_or_404,
    get_obj,
    get_obj_or_404,
    raise_auth_error,
    raise_perm_error,
    raise_validation_error,
    validate_company_reference,
    validate_obj_reference,
    validate_user_reference,
)
from fastapi import HTTPException
from permissions import require_role
from sqlmodel import select
from users.models import User, UserRole
from vehicles.models import Vehicle


class Referencing:
    """Stand-in for a request body that points at other rows."""

    def __init__(self, user_id=None, company_id=None):
        self.user_id, self.company_id = user_id, company_id

    def model_dump(self, mode="python"):
        return {"user_id": self.user_id, "company_id": self.company_id}


class TestFilters:
    def test_drops_empty_values(self):
        assert get_filters({"a": 1, "b": None, "c": "", "d": 0, "e": "x"}) == {"a": 1, "e": "x"}

    def test_empty(self):
        assert get_filters({}) == {}


class TestErrors:
    def test_body_error_shape_matches_pydantic(self):
        assert get_body_error_info("boom", {"a": 1}, {"k": "v"}) == [{"type": "value_error", "loc": ["body"], "msg": "boom", "input": {"a": 1}, "ctx": {"error": {"k": "v"}}}]

    def test_context_defaults_to_an_empty_dict(self):
        assert get_body_error_info("boom", None)[0]["ctx"] == {"error": {}}

    @pytest.mark.parametrize(("raiser", "status"), [(raise_auth_error, 401), (raise_perm_error, 403), (lambda: raise_validation_error("bad"), 422)])
    def test_helpers_raise_http_errors_with_the_right_status(self, raiser, status):
        with pytest.raises(HTTPException) as caught:
            raiser()
        assert caught.value.status_code == status


class TestLookup:
    def test_get_obj(self, db, world):
        assert get_obj(db, User, world.users.admin.id).email == "admin@example.com"
        assert get_obj(db, User, 99999) is None

    def test_get_obj_or_404(self, db, world):
        assert get_obj_or_404(db, User, world.users.admin.id).id == world.users.admin.id
        with pytest.raises(HTTPException) as caught:
            get_obj_or_404(db, User, 99999)
        assert caught.value.status_code == 404

    def test_get_from_qs_or_404_respects_the_queryset(self, db, world):
        scoped = select(Vehicle).where(Vehicle.company_id == world.company_a.id)
        assert get_from_qs_or_404(db, scoped, world.vehicles.a.id).id == world.vehicles.a.id
        with pytest.raises(HTTPException):
            get_from_qs_or_404(db, scoped, world.vehicles.b.id)


class TestReferenceValidation:
    def test_missing_object(self, db, world):
        with pytest.raises(HTTPException) as caught:
            validate_obj_reference(db, Referencing(), User, 99999)
        assert caught.value.status_code == 422
        assert "user does not exist" in str(caught.value.detail)

    def test_existing_and_empty_references_pass(self, db, world):
        validate_obj_reference(db, Referencing(), User, world.users.admin.id)
        validate_obj_reference(db, Referencing(), User, None)

    def test_user_reference_rules(self, db, world):
        validate_user_reference(db, Referencing(user_id=world.users.worker_a.id), world.users.admin)
        validate_user_reference(db, Referencing(user_id=world.users.worker_a.id), world.users.worker_a)
        validate_user_reference(db, Referencing(user_id=world.users.worker_a2.id), world.users.manager_a)
        validate_user_reference(db, Referencing(), world.users.worker_a)

        for requester, target in ((world.users.worker_a, world.users.worker_a2), (world.users.manager_a, world.users.worker_b)):
            with pytest.raises(HTTPException) as caught:
                validate_user_reference(db, Referencing(user_id=target.id), requester)
            assert caught.value.status_code == 403

    def test_company_reference_rules(self, db, world):
        validate_company_reference(db, Referencing(company_id=world.company_b.id), world.users.admin)
        validate_company_reference(db, Referencing(company_id=world.company_a.id), world.users.manager_a)
        validate_company_reference(db, Referencing(), world.users.worker_a)

        for requester in (world.users.manager_a, world.users.worker_a):
            with pytest.raises(HTTPException) as caught:
                validate_company_reference(db, Referencing(company_id=world.company_b.id), requester)
            assert caught.value.status_code == 403


def test_get_all_subclasses_is_recursive():
    class A: ...

    class B(A): ...

    class C(B): ...

    assert set(get_all_subclasses(A)) == {B, C}


class TestRequireRole:
    @staticmethod
    def call(roles, user):
        @require_role(roles)
        async def handler(request_user):
            return "ok"

        return asyncio.run(handler(request_user=user))

    def test_allowed(self, world):
        assert self.call([UserRole.ADMIN, UserRole.MANAGER], world.users.manager_a) == "ok"

    def test_denied(self, world):
        with pytest.raises(HTTPException) as caught:
            self.call([UserRole.ADMIN], world.users.manager_a)
        assert caught.value.status_code == 403

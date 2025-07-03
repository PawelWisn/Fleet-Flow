from typing import Type, TypeVar

from fastapi import HTTPException, Query, status
from fastapi_pagination import Page
from fastapi_pagination.customization import CustomizedPage, UseParamsFields
from sqlalchemy.sql import Select
from sqlmodel import Session, select
from users.models import User

T = TypeVar("T")


Page = CustomizedPage[Page[T], UseParamsFields(size=Query(15, ge=1, le=100))]


def get_obj(session: Session, model: Type[T], obj_id: int) -> T | None:
    return session.get(model, obj_id)


def get_obj_or_404(session: Session, model: Type[T], obj_id: int) -> T:
    if obj := get_obj(session, model, obj_id):
        return obj
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


def get_from_qs_or_404(session: Session, qs: Select, obj_id: int) -> T:
    qs = qs.filter_by(id=obj_id)
    if obj := session.exec(qs).first():
        return obj
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


def get_user(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email)).first()


def get_user_or_404(session: Session, email: str) -> User:
    if user := get_user(session, email):
        return user
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


def get_filters(fields: dict) -> dict:
    return {key: val for key, val in fields.items() if val}


def get_body_error_info(msg: str, input: dict, ctx: dict = None) -> list[dict]:
    ctx = ctx if ctx is not None else {}
    return [
        {
            "type": "value_error",
            "loc": ["body"],
            "msg": msg,
            "input": input,
            "ctx": {"error": ctx},
        }
    ]


def raise_http_error(status_code: int, msg: str, input: dict = None, ctx: dict = None) -> None:
    raise HTTPException(status_code=status_code, detail=get_body_error_info(msg, input, ctx))


def raise_auth_error(input: dict = None, ctx: dict = None) -> None:
    raise_http_error(status.HTTP_401_UNAUTHORIZED, "Please login to the system", input, ctx)


def raise_perm_error(input: dict = None, ctx: dict = None) -> None:
    raise_http_error(status.HTTP_403_FORBIDDEN, "Insufficient permissions", input, ctx)


def raise_validation_error(msg: str, input: dict = None, ctx: dict = None) -> None:
    raise_http_error(status.HTTP_422_UNPROCESSABLE_ENTITY, msg, input, ctx)


def validate_obj_reference(session: Session, referencing_obj: T, referenced_model: Type[T], referenced_obj_id: int | None) -> None:
    if referenced_obj_id and not get_obj(session, referenced_model, referenced_obj_id):
        raise_validation_error(f"The specified {referenced_model.__name__.lower()} does not exist.", referencing_obj.model_dump(mode="json"))


def validate_user_reference(session: Session, referencing_obj: T, request_user: User) -> None:
    if referencing_obj.user_id is None:
        return
    if request_user.is_worker and not referencing_obj.user_id == request_user.id:
        raise_perm_error(referencing_obj.model_dump(mode="json"))
    user = get_obj(session, User, referencing_obj.user_id)
    if request_user.is_manager and not user.company_id == request_user.company_id:
        raise_perm_error(referencing_obj.model_dump(mode="json"))


def validate_company_reference(session: Session, referencing_obj: T, request_user: User) -> None:
    if referencing_obj.company_id is None:
        return
    if (request_user.is_worker or request_user.is_manager) and not referencing_obj.company_id == request_user.company_id:
        raise_perm_error(referencing_obj.model_dump(mode="json"))


def get_all_subclasses(klass: Type[object]) -> list[Type]:
    subclasses = klass.__subclasses__()
    for subclass in subclasses:
        subclasses += get_all_subclasses(subclass)
    return subclasses


def rebuild_models():
    from comments.models import CommentNestedRead, CommentRead
    from companies.models import CompanyNestedRead, CompanyRead
    from contractors.models import ContractorNestedRead, ContractorRead
    from database import SQLModel
    from documents.models import DocumentNestedRead, DocumentRead
    from events.models import EventNestedRead, EventRead
    from insurrances.models import InsurranceNestedRead, InsurranceRead
    from refuels.models import RefuelNestedRead, RefuelRead
    from reservations.models import ReservationNestedRead, ReservationRead
    from users.models import UserCreate, UserNestedRead, UserRead
    from vehicles.models import VehicleNestedRead, VehicleRead

    all_subclasses = get_all_subclasses(SQLModel)
    for subclass in all_subclasses:
        subclass.model_rebuild()

from commons import Page, get_filters, get_from_qs_or_404, validate_obj_reference
from companies.models import Company
from dependencies import LoginReqDep, SessionDep
from documents.models import Document
from fastapi import APIRouter, Query, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.sql import Select
from users.models import User
from vehicles.models import Vehicle

from .models import Insurrance, InsurranceCreate, InsurranceRead

router = APIRouter(prefix="/insurrances", tags=["insurrances"])


def get_queryset(request_user: User) -> Select[Insurrance]:
    return Insurrance.for_user(request_user)


@router.get("/")
async def list_insurrances(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle_id: int = Query(None),
    document_id: int = Query(None),
    company_id: int = Query(None),
) -> Page[InsurranceRead]:
    filters = get_filters({"vehicle_id": vehicle_id, "document_id": document_id, "company_id": company_id})
    qs = get_queryset(request_user).filter_by(**filters)
    return paginate(session, qs)


@router.get("/finishing/", description="List insurrances that are finishing in the next 30 days")
async def list_finishing(
    session: SessionDep,
    request_user: LoginReqDep,
) -> Page[InsurranceRead]:
    qs = get_queryset(request_user)
    qs = Insurrance.finishing(qs)
    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_insurrance(
    session: SessionDep,
    request_user: LoginReqDep,
    insurrance: InsurranceCreate,
    response: Response,
) -> InsurranceRead:
    validate_obj_reference(session, insurrance, Vehicle, insurrance.vehicle_id)
    validate_obj_reference(session, insurrance, Document, insurrance.document_id)
    validate_obj_reference(session, insurrance, Company, insurrance.company_id)

    db_insurrance = Insurrance.model_validate(insurrance)
    session.add(db_insurrance)
    session.commit()
    session.refresh(db_insurrance)
    response.status_code = status.HTTP_201_CREATED
    return db_insurrance


@router.get("/{insurrance_id}/")
async def retrive_insurrance(
    session: SessionDep,
    request_user: LoginReqDep,
    insurrance_id: int,
) -> InsurranceRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, insurrance_id)


@router.put("/{insurrance_id}/")
async def update_insurrance(
    session: SessionDep,
    request_user: LoginReqDep,
    insurrance_id: int,
    insurrance: InsurranceCreate,
) -> InsurranceRead:
    validate_obj_reference(session, insurrance, Vehicle, insurrance.vehicle_id)
    validate_obj_reference(session, insurrance, Document, insurrance.document_id)
    validate_obj_reference(session, insurrance, Company, insurrance.company_id)

    qs = get_queryset(request_user)
    db_insurrance = get_from_qs_or_404(session, qs, insurrance_id)
    db_insurrance.sqlmodel_update(insurrance)
    session.commit()
    session.refresh(db_insurrance)
    return db_insurrance


@router.delete("/{insurrance_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_insurrance(
    session: SessionDep,
    request_user: LoginReqDep,
    insurrance_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_insurrance = get_from_qs_or_404(session, qs, insurrance_id)
    session.delete(db_insurrance)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT

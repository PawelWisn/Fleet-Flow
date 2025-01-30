from commons import Page, get_filters, get_from_qs_or_404, validate_obj_reference, validate_user_reference
from contractors.models import Contractor
from dependencies import LoginReqDep, SessionDep
from documents.models import Document
from fastapi import APIRouter, Query, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from refuels.utils import get_yearly_stats
from sqlalchemy.sql import Select
from users.models import User
from vehicles.models import Vehicle

from .models import Refuel, RefuelCreate, RefuelRead, RefuelStat

router = APIRouter(prefix="/refuels", tags=["refuels"])


def get_queryset(request_user: User) -> Select[Refuel]:
    return Refuel.for_user(request_user)


@router.get("/")
async def list_refuels(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle_id: int = Query(None),
    document_id: int = Query(None),
    contractor_id: int = Query(None),
    user_id: int = Query(None),
) -> Page[RefuelRead]:
    filters = get_filters({"vehicle_id": vehicle_id, "document_id": document_id, "contractor_id": contractor_id, "user_id": user_id})
    qs = get_queryset(request_user).filter_by(**filters)
    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_refuel(
    session: SessionDep,
    request_user: LoginReqDep,
    refuel: RefuelCreate,
    response: Response,
) -> RefuelRead:
    validate_obj_reference(session, refuel, Vehicle, refuel.vehicle_id)
    validate_obj_reference(session, refuel, Document, refuel.document_id)
    validate_obj_reference(session, refuel, User, refuel.user_id)
    validate_obj_reference(session, refuel, Contractor, refuel.contractor_id)
    validate_user_reference(session, refuel, request_user)

    db_refuel = Refuel.model_validate(refuel)
    session.add(db_refuel)
    session.commit()
    session.refresh(db_refuel)
    response.status_code = status.HTTP_201_CREATED
    return db_refuel


@router.get("/stats/")
async def retrive_refuel_stats(
    session: SessionDep,
    request_user: LoginReqDep,
) -> list[RefuelStat]:
    return get_yearly_stats(session, request_user)


@router.get("/{refuel_id}/")
async def retrive_refuel(
    session: SessionDep,
    request_user: LoginReqDep,
    refuel_id: int,
) -> RefuelRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, refuel_id)


@router.put("/{refuel_id}/")
async def update_refuel(
    session: SessionDep,
    request_user: LoginReqDep,
    refuel_id: int,
    refuel: RefuelCreate,
) -> RefuelRead:
    validate_obj_reference(session, refuel, Vehicle, refuel.vehicle_id)
    validate_obj_reference(session, refuel, Document, refuel.document_id)
    validate_obj_reference(session, refuel, User, refuel.user_id)
    validate_obj_reference(session, refuel, Contractor, refuel.contractor_id)
    validate_user_reference(session, refuel, request_user)

    qs = get_queryset(request_user)
    db_refuel = get_from_qs_or_404(session, qs, refuel_id)
    db_refuel.sqlmodel_update(refuel)
    session.commit()
    session.refresh(db_refuel)
    return db_refuel


@router.delete("/{refuel_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_refuel(
    session: SessionDep,
    request_user: LoginReqDep,
    refuel_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_refuel = get_from_qs_or_404(session, qs, refuel_id)
    session.delete(db_refuel)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT

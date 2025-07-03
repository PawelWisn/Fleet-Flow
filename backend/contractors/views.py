from commons import Page, get_filters, get_from_qs_or_404, validate_company_reference, validate_obj_reference
from companies.models import Company
from dependencies import LoginReqDep, SessionDep
from fastapi import APIRouter, Query, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.sql import Select
from users.models import User

from .models import Contractor, ContractorCreate, ContractorRead

router = APIRouter(prefix="/contractors", tags=["contractors"])


def get_queryset(request_user: User) -> Select[Contractor]:
    return Contractor.for_user(request_user)


@router.get("/")
async def list_contractors(
    session: SessionDep,
    request_user: LoginReqDep,
    company_id: int = Query(None),
) -> Page[ContractorRead]:
    filters = get_filters({"company_id": company_id})
    qs = get_queryset(request_user).filter_by(**filters)
    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_contractor(
    session: SessionDep,
    request_user: LoginReqDep,
    contractor: ContractorCreate,
    response: Response,
) -> ContractorRead:
    validate_obj_reference(session, contractor, Company, contractor.company_id)
    validate_company_reference(session, contractor, request_user)

    db_contractor = Contractor.model_validate(contractor)
    session.add(db_contractor)
    session.commit()
    session.refresh(db_contractor)
    response.status_code = status.HTTP_201_CREATED
    return db_contractor


@router.get("/{contractor_id}/")
async def retrive_contractor(
    session: SessionDep,
    request_user: LoginReqDep,
    contractor_id: int,
) -> ContractorRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, contractor_id)


@router.put("/{contractor_id}/")
async def update_contractor(
    session: SessionDep,
    request_user: LoginReqDep,
    contractor_id: int,
    contractor: ContractorCreate,
) -> ContractorRead:
    validate_obj_reference(session, contractor, Company, contractor.company_id)
    validate_company_reference(session, contractor, request_user)

    qs = get_queryset(request_user)
    db_contractor = get_from_qs_or_404(session, qs, contractor_id)
    db_contractor.sqlmodel_update(contractor)
    session.commit()
    session.refresh(db_contractor)
    return db_contractor


@router.delete("/{contractor_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contractor(
    session: SessionDep,
    request_user: LoginReqDep,
    contractor_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_contractor = get_from_qs_or_404(session, qs, contractor_id)
    session.delete(db_contractor)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT

from commons import Page, get_from_qs_or_404
from dependencies import LoginReqDep, SessionDep
from fastapi import APIRouter, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.sql import Select
from users.models import User

from .models import Company, CompanyCreate, CompanyRead

router = APIRouter(prefix="/companies", tags=["companies"])

status.HTTP_204_NO_CONTENT


def get_queryset(request_user: User) -> Select[Company]:
    return Company.for_user(request_user)


@router.get("/")
async def list_companies(
    session: SessionDep,
    request_user: LoginReqDep,
) -> Page[CompanyRead]:
    qs = get_queryset(request_user)
    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_company(
    session: SessionDep,
    request_user: LoginReqDep,
    company: CompanyCreate,
    response: Response,
) -> CompanyRead:
    db_company = Company.model_validate(company)
    session.add(db_company)
    session.commit()
    session.refresh(db_company)
    response.status_code = status.HTTP_201_CREATED
    return db_company


@router.get("/{company_id}/")
async def retrive_company(
    session: SessionDep,
    request_user: LoginReqDep,
    company_id: int,
) -> CompanyRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, company_id)


@router.put("/{company_id}/")
async def update_company(
    session: SessionDep,
    request_user: LoginReqDep,
    company_id: int,
    company: CompanyCreate,
) -> CompanyRead:
    qs = get_queryset(request_user)
    db_company = get_from_qs_or_404(session, qs, company_id)
    db_company.sqlmodel_update(company)
    session.commit()
    session.refresh(db_company)
    return db_company


@router.delete("/{company_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    session: SessionDep,
    request_user: LoginReqDep,
    company_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_company = get_from_qs_or_404(session, qs, company_id)
    session.delete(db_company)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT

from commons import Page, get_filters, get_from_qs_or_404, validate_obj_reference
from dependencies import LoginReqDep, SessionDep
from fastapi import APIRouter, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.sql import Select
from users.models import User
from vehicles.models import Vehicle

from .models import Document, DocumentCreate, DocumentRead, VehicleDocument

router = APIRouter(prefix="/documents", tags=["documents"])


def get_queryset(request_user: User) -> Select[Document]:
    return Document.for_user(request_user)


@router.get("/")
async def list_documents(
    session: SessionDep,
    request_user: LoginReqDep,
) -> Page[DocumentRead]:
    filters = get_filters({})
    qs = get_queryset(request_user).filter_by(**filters)
    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_document(
    session: SessionDep,
    request_user: LoginReqDep,
    document: DocumentCreate,
    response: Response,
) -> DocumentRead:
    validate_obj_reference(session, document, Vehicle, document.vehicle_id)

    db_document = Document.model_validate(document)
    session.add(db_document)
    session.flush()

    db_vehicle_document = VehicleDocument(vehicle_id=document.vehicle_id, document_id=db_document.id)
    session.add(db_vehicle_document)
    session.commit()

    session.refresh(db_document)
    session.refresh(db_vehicle_document)

    response.status_code = status.HTTP_201_CREATED
    return db_document


@router.get("/{document_id}/")
async def retrive_document(
    session: SessionDep,
    request_user: LoginReqDep,
    document_id: int,
) -> DocumentRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, document_id)


@router.put("/{document_id}/")
async def update_document(
    session: SessionDep,
    request_user: LoginReqDep,
    document_id: int,
    document: DocumentCreate,
) -> DocumentRead:
    validate_obj_reference(session, document, Vehicle, document.vehicle_id)

    qs = get_queryset(request_user)
    db_document = get_from_qs_or_404(session, qs, document_id)
    db_document.sqlmodel_update(document)
    session.commit()
    session.refresh(db_document)
    return db_document


@router.delete("/{document_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    session: SessionDep,
    request_user: LoginReqDep,
    document_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_document = get_from_qs_or_404(session, qs, document_id)
    session.delete(db_document)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT

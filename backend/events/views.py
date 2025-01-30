from commons import Page, get_filters, get_from_qs_or_404, validate_obj_reference
from contractors.models import Contractor
from dependencies import LoginReqDep, SessionDep
from documents.models import Document
from fastapi import APIRouter, Query, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.sql import Select
from users.models import User

from .models import Event, EventCreate, EventRead

router = APIRouter(prefix="/events", tags=["events"])


def get_queryset(request_user: User) -> Select[Event]:
    return Event.for_user(request_user)


@router.get("/")
async def list_events(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle_id: int = Query(None),
    document_id: int = Query(None),
    contractor_id: int = Query(None),
) -> Page[EventRead]:
    filters = get_filters({"vehicle_id": vehicle_id, "document_id": document_id, "contractor_id": contractor_id})
    qs = get_queryset(request_user).filter_by(**filters)
    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_event(
    session: SessionDep,
    request_user: LoginReqDep,
    event: EventCreate,
    response: Response,
) -> EventRead:
    validate_obj_reference(session, event, Document, event.document_id)
    validate_obj_reference(session, event, Contractor, event.contractor_id)

    db_event = Event.model_validate(event)
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    response.status_code = status.HTTP_201_CREATED
    return db_event


@router.get("/{event_id}/")
async def retrive_event(
    session: SessionDep,
    request_user: LoginReqDep,
    event_id: int,
) -> EventRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, event_id)


@router.put("/{event_id}/")
async def update_event(
    session: SessionDep,
    request_user: LoginReqDep,
    event_id: int,
    event: EventCreate,
) -> EventRead:
    validate_obj_reference(session, event, Document, event.document_id)
    validate_obj_reference(session, event, Contractor, event.contractor_id)

    qs = get_queryset(request_user)
    db_event = get_from_qs_or_404(session, qs, event_id)
    db_event.sqlmodel_update(event)
    session.commit()
    session.refresh(db_event)
    return db_event


@router.delete("/{event_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    session: SessionDep,
    request_user: LoginReqDep,
    event_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_event = get_from_qs_or_404(session, qs, event_id)
    session.delete(db_event)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT

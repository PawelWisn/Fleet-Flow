from commons import Page, get_filters, get_from_qs_or_404, validate_obj_reference, validate_user_reference
from dependencies import LoginReqDep, SessionDep
from fastapi import APIRouter, Query, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.sql import Select
from users.models import User
from vehicles.models import Vehicle

from .models import Reservation, ReservationCreate, ReservationRead

router = APIRouter(prefix="/reservations", tags=["reservations"])


def get_queryset(request_user: User) -> Select[Reservation]:
    return Reservation.for_user(request_user)


@router.get("/")
async def list_reservations(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle_id: int = Query(None),
    user_id: int = Query(None),
) -> Page[ReservationRead]:
    filters = get_filters({"vehicle_id": vehicle_id, "user_id": user_id})
    qs = get_queryset(request_user).filter_by(**filters)
    return paginate(session, qs)


@router.get("/upcoming/", description="List reservations that are upcoming")
async def list_upcoming_reservations(
    session: SessionDep,
    request_user: LoginReqDep,
) -> Page[ReservationRead]:
    qs = get_queryset(request_user)
    qs = Reservation.upcoming(qs)
    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_reservation(
    session: SessionDep,
    request_user: LoginReqDep,
    reservation: ReservationCreate,
    response: Response,
) -> ReservationRead:
    validate_obj_reference(session, reservation, Vehicle, reservation.vehicle_id)
    validate_obj_reference(session, reservation, User, reservation.user_id)
    validate_user_reference(session, reservation, request_user)

    db_reservation = Reservation.model_validate(reservation)
    session.add(db_reservation)
    session.commit()
    session.refresh(db_reservation)
    response.status_code = status.HTTP_201_CREATED
    return db_reservation


@router.get("/{reservation_id}/")
async def retrive_reservation(
    session: SessionDep,
    request_user: LoginReqDep,
    reservation_id: int,
) -> ReservationRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, reservation_id)


@router.put("/{reservation_id}/")
async def update_reservation(
    session: SessionDep,
    request_user: LoginReqDep,
    reservation_id: int,
    reservation: ReservationCreate,
) -> ReservationRead:
    validate_obj_reference(session, reservation, Vehicle, reservation.vehicle_id)
    validate_obj_reference(session, reservation, User, reservation.user_id)
    validate_user_reference(session, reservation, request_user)

    qs = get_queryset(request_user)
    db_reservation = get_from_qs_or_404(session, qs, reservation_id)
    db_reservation.sqlmodel_update(reservation)
    session.commit()
    session.refresh(db_reservation)
    return db_reservation


@router.delete("/{reservation_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reservation(
    session: SessionDep,
    request_user: LoginReqDep,
    reservation_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_reservation = get_from_qs_or_404(session, qs, reservation_id)
    session.delete(db_reservation)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT

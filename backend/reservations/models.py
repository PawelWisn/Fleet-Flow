from datetime import datetime
from typing import TYPE_CHECKING

from database import SQLModel
from sqlalchemy.sql import Select
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from users.models import User, UserNestedRead
    from vehicles.models import Vehicle, VehicleNestedRead


class ReservationBase(SQLModel):
    date_from: datetime
    date_to: datetime
    reservation_date: datetime = Field(default_factory=lambda: datetime.now())
    vehicle_id: int = Field(foreign_key="vehicles.id", ondelete="CASCADE")
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")


class Reservation(ReservationBase, table=True):
    __tablename__ = "reservations"
    id: int | None = Field(primary_key=True, default=None)
    user: "User" = Relationship(back_populates="reservations")
    vehicle: "Vehicle" = Relationship(back_populates="reservations")

    @classmethod
    def for_user(cls, user: "User") -> Select["Reservation"]:
        qs = select(cls)
        if not user.is_admin:
            qs = qs.filter(cls.user_id == user.id)
        return qs

    @classmethod
    def upcoming(cls, qs: Select["Reservation"]) -> Select["Reservation"]:
        return qs.filter(cls.date_from > datetime.now()).order_by(cls.date_from)


class ReservationRead(ReservationBase):
    id: int
    user: "UserNestedRead"
    vehicle: "VehicleNestedRead"


class ReservationNestedRead(ReservationBase):
    id: int


class ReservationCreate(ReservationBase):
    pass

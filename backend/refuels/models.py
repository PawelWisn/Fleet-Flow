from datetime import datetime
from typing import TYPE_CHECKING

from database import SQLModel
from sqlalchemy.sql import Select
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from documents.models import Document, DocumentNestedRead
    from users.models import User, UserNestedRead
    from vehicles.models import Vehicle, VehicleNestedRead


class RefuelBase(SQLModel):
    date: datetime = Field(default_factory=lambda: datetime.now())
    fuel_amount: float
    price: float
    kilometrage_during_refuel: int
    gas_station: str = Field(max_length=32)
    vehicle_id: int = Field(foreign_key="vehicles.id", ondelete="CASCADE")
    document_id: int = Field(foreign_key="documents.id", ondelete="CASCADE")
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")


class Refuel(RefuelBase, table=True):
    __tablename__ = "refuels"
    id: int | None = Field(primary_key=True, default=None)
    vehicle: "Vehicle" = Relationship(back_populates="refuels")
    document: "Document" = Relationship(back_populates="refuels")
    user: "User" = Relationship(back_populates="refuels")

    @classmethod
    def for_user(cls, user: "User") -> Select["Refuel"]:
        from users.models import User

        qs = select(cls)
        if user.is_admin:
            return qs
        if user.is_manager:
            return qs.join(User).filter(User.company_id == user.company_id)
        return qs.join(User).filter(cls.user_id == user.id)


class RefuelRead(RefuelBase):
    id: int
    vehicle: "VehicleNestedRead"
    document: "DocumentNestedRead"
    user: "UserNestedRead"


class RefuelNestedRead(RefuelBase):
    id: int


class RefuelCreate(RefuelBase):
    pass


class RefuelStat(SQLModel):
    month_year: str
    total_fuel: float

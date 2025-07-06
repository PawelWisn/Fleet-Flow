from enum import Enum
from typing import TYPE_CHECKING, Optional

from database import SQLModel
from sqlalchemy.sql import Select
from sqlmodel import Column
from sqlmodel import Enum as EnumSQL
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from comments.models import Comment, CommentNestedRead
    from companies.models import Company, CompanyNestedRead
    from documents.models import Document, DocumentNestedRead
    from events.models import Event, EventNestedRead
    from insurrances.models import Insurrance, InsurranceNestedRead
    from refuels.models import Refuel, RefuelNestedRead
    from reservations.models import Reservation, ReservationNestedRead
    from users.models import User


class GearboxType(str, Enum):
    AUTO = "automatic"
    MANUAL = "manual"
    SEMIAUTO = "semi-automatic"


class VehicleAvailability(str, Enum):
    INUSE = "in use"
    SERVICE = "service"
    AVAILABLE = "available"
    DECOMMISSIONED = "decommissioned"
    BOOKED = "booked"


class TireType(str, Enum):
    SUMMER = "summer"
    WINTER = "winter"
    ALLSEASON = "all-season"


class VehicleBase(SQLModel):
    id_number: str = Field(max_length=64, description="Number of registration ID")  # numer dowodu rejestracyjnego
    vin: str = Field(max_length=17)
    weight: float
    registration_number: str = Field(max_length=16)
    brand: str = Field(max_length=32)
    model: str = Field(max_length=64)
    production_year: int
    kilometrage: int
    gearbox_type: GearboxType = Field(sa_column=Column(EnumSQL(GearboxType)))
    availability: VehicleAvailability = Field(sa_column=Column(EnumSQL(VehicleAvailability)))
    tire_type: TireType = Field(sa_column=Column(EnumSQL(TireType)))
    company_id: int = Field(foreign_key="companies.id", ondelete="CASCADE")


class Vehicle(VehicleBase, table=True):
    __tablename__ = "vehicles"
    id: Optional[int] = Field(primary_key=True, default=None)
    company: "Company" = Relationship(back_populates="vehicles")
    documents: list["Document"] = Relationship(back_populates="vehicle", cascade_delete=True)
    refuels: list["Refuel"] = Relationship(back_populates="vehicle", cascade_delete=True)
    events: list["Event"] = Relationship(back_populates="vehicle", cascade_delete=True)
    reservations: list["Reservation"] = Relationship(back_populates="vehicle", cascade_delete=True)
    insurrances: list["Insurrance"] = Relationship(back_populates="vehicle", cascade_delete=True)
    comments: list["Comment"] = Relationship(back_populates="vehicle", cascade_delete=True)

    @classmethod
    def for_user(cls, user: "User") -> Select["User"]:
        if not user.is_admin:
            return select(cls).filter(cls.company_id == user.company_id)
        return select(cls)

    def __str__(self) -> str:
        return f"{self.brand.capitalize()} {self.model.capitalize()}"


class VehicleRead(VehicleBase):
    id: int
    company: "CompanyNestedRead | None"
    documents: list["DocumentNestedRead"]
    refuels: list["RefuelNestedRead"]
    events: list["EventNestedRead"]
    reservations: list["ReservationNestedRead"]
    insurrances: list["InsurranceNestedRead"]
    comments: list["CommentNestedRead"]


class VehicleNestedRead(VehicleBase):
    id: int


class VehicleCreate(VehicleBase):
    pass

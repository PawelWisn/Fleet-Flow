from datetime import datetime
from typing import TYPE_CHECKING

from database import SQLModel
from sqlalchemy.sql import Select
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from contractors.models import Contractor, ContractorNestedRead
    from documents.models import Document, DocumentNestedRead
    from users.models import User
    from vehicles.models import Vehicle, VehicleNestedRead


class EventBase(SQLModel):
    event_type: str = Field(max_length=128)
    date: datetime = Field(default_factory=lambda: datetime.now())
    description: str = Field(max_length=1024)
    price: float | None = None
    vehicle_id: int = Field(foreign_key="vehicles.id", ondelete="CASCADE")
    document_id: int = Field(foreign_key="documents.id", ondelete="CASCADE")
    contractor_id: int = Field(foreign_key="contractors.id", ondelete="CASCADE")


class Event(EventBase, table=True):
    __tablename__ = "events"
    id: int | None = Field(primary_key=True, default=None)
    vehicle: "Vehicle" = Relationship(back_populates="events")
    document: "Document" = Relationship(back_populates="events")
    contractor: "Contractor" = Relationship(back_populates="events")

    @classmethod
    def for_user(cls, user: "User") -> Select["Event"]:
        return select(cls)


class EventRead(EventBase):
    id: int
    vehicle: "VehicleNestedRead"
    document: "DocumentNestedRead | None"
    contractor: "ContractorNestedRead | None"


class EventNestedRead(EventBase):
    id: int


class EventCreate(EventBase):
    pass

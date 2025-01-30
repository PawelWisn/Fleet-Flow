from enum import Enum
from typing import TYPE_CHECKING

from database import SQLModel
from sqlalchemy.sql import Select
from sqlmodel import Column
from sqlmodel import Enum as EnumSQL
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from events.models import Event, EventNestedRead
    from insurrances.models import Insurrance, InsurranceNestedRead
    from refuels.models import Refuel, RefuelNestedRead
    from users.models import User
    from vehicles.models import Vehicle, VehicleNestedRead


class DocumentType(str, Enum):
    RECEIPT = "receipt"
    INVOICE = "invoice"
    OTHER = "other"


class VehicleDocument(SQLModel, table=True):
    __tablename__ = "vehicle_documents"
    id: int | None = Field(primary_key=True, default=None)
    vehicle_id: int = Field(foreign_key="vehicles.id", ondelete="CASCADE")
    document_id: int = Field(foreign_key="documents.id", ondelete="CASCADE")


class DocumentBase(SQLModel):
    name: str = Field(max_length=128)
    document_type: DocumentType = Field(sa_column=Column(EnumSQL(DocumentType)))


class Document(DocumentBase, table=True):
    __tablename__ = "documents"
    id: int | None = Field(primary_key=True, default=None)
    vehicles: list["Vehicle"] = Relationship(back_populates="documents", link_model=VehicleDocument)
    refuels: list["Refuel"] = Relationship(back_populates="document", cascade_delete=True)
    events: list["Event"] = Relationship(back_populates="document", cascade_delete=True)
    insurrances: list["Insurrance"] = Relationship(back_populates="document", cascade_delete=True)

    @classmethod
    def for_user(cls, user: "User") -> Select["Document"]:
        return select(cls)


class DocumentRead(DocumentBase):
    id: int
    vehicles: list["VehicleNestedRead"]
    refuels: list["RefuelNestedRead"]
    events: list["EventNestedRead"]
    insurrances: list["InsurranceNestedRead"]


class DocumentNestedRead(DocumentBase):
    id: int


class DocumentCreate(DocumentBase):
    vehicle_id: int

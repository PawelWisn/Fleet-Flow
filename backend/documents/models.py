from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional, Union

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
    REGISTRATION = "registration"
    INSURANCE = "insurance"
    MAINTENANCE = "maintenance"
    INSPECTION = "inspection"
    MANUAL = "manual"
    OTHER = "other"


class DocumentBase(SQLModel):
    title: str = Field(max_length=255)
    description: str = Field(default="")
    file_path: Optional[str] = Field(default=None, max_length=500)
    file_type: str = Field(max_length=50)
    file_size: Optional[int] = Field(default=None)
    vehicle_id: int = Field(foreign_key="vehicles.id")
    user_id: int = Field(foreign_key="users.id")


class Document(DocumentBase, table=True):
    __tablename__ = "documents"
    id: Optional[int] = Field(primary_key=True, default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    vehicle: "Vehicle" = Relationship(back_populates="documents")
    user: "User" = Relationship(back_populates="documents")
    refuels: list["Refuel"] = Relationship(back_populates="document", cascade_delete=True)
    events: list["Event"] = Relationship(back_populates="document", cascade_delete=True)
    insurrances: list["Insurrance"] = Relationship(back_populates="document", cascade_delete=True)

    @classmethod
    def for_user(cls, user: "User") -> Select["Document"]:
        return select(cls)


class DocumentRead(DocumentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    vehicle: Optional["VehicleNestedRead"] = None
    user: Optional["User"] = None


class DocumentNestedRead(SQLModel):
    id: int
    title: str
    description: str
    file_path: Optional[str]
    file_type: str
    file_size: Optional[int]
    vehicle_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


class DocumentCreate(SQLModel):
    title: str = Field(max_length=255)
    description: str = Field(default="")
    file_type: str = Field(max_length=50)
    vehicle_id: int
    user_id: int


class DocumentUpdate(SQLModel):
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None)
    file_path: Optional[str] = Field(default=None, max_length=500)
    file_type: Optional[str] = Field(default=None, max_length=50)
    file_size: Optional[int] = Field(default=None)
    vehicle_id: Optional[int] = Field(default=None)
    user_id: Optional[int] = Field(default=None)


class DocumentCreateWithFile(SQLModel):
    title: str = Field(max_length=255)
    description: str = Field(default="")
    file_type: str = Field(max_length=50)
    vehicle_id: int
    user_id: int
    file: Optional[bytes] = Field(default=None, exclude=True)  # File content as bytes
    filename: Optional[str] = Field(default=None, exclude=True)  # Original filename

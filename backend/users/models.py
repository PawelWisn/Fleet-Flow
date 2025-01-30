from enum import Enum
from typing import TYPE_CHECKING

from database import SQLModel
from pydantic import field_validator, model_validator
from sqlalchemy.sql import Select
from sqlmodel import Column
from sqlmodel import Enum as EnumSQL
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from comments.models import Comment, CommentNestedRead
    from companies.models import Company, CompanyNestedRead
    from refuels.models import Refuel, RefuelNestedRead
    from reservations.models import Reservation, ReservationNestedRead


class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    WORKER = "worker"


class UserBase(SQLModel):
    email: str = Field(max_length=64, unique=True)
    name: str = Field(max_length=128)
    role: UserRole = Field(sa_column=Column(EnumSQL(UserRole)))
    company_id: int | None = Field(default=None, foreign_key="companies.id", ondelete="CASCADE")


class User(UserBase, table=True):
    __tablename__ = "users"
    id: int | None = Field(primary_key=True, default=None)
    password: str = Field(max_length=128)
    refuels: list["Refuel"] = Relationship(back_populates="user", cascade_delete=True)
    reservations: list["Reservation"] = Relationship(back_populates="user", cascade_delete=True)
    comments: list["Comment"] = Relationship(back_populates="user", cascade_delete=True)
    company: "Company" = Relationship(back_populates="users")

    @classmethod
    def for_user(cls, user: "User") -> Select["User"]:
        qs = select(cls)
        if not user.is_admin:
            qs = qs.filter(cls.company_id == user.company_id).filter(cls.role != UserRole.ADMIN)
        return qs

    def get_subordinates(self) -> Select["User"]:
        if self.is_admin:
            return select(User).filter(User.role != UserRole.ADMIN)
        elif self.is_manager:
            return select(User).filter(User.company_id == self.company_id).filter(User.role == UserRole.WORKER)
        return select(User).filter(False)

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def is_manager(self) -> bool:
        return self.role == UserRole.MANAGER

    @property
    def is_worker(self) -> bool:
        return self.role == UserRole.WORKER


class UserRead(UserBase):
    id: int
    refuels: list["RefuelNestedRead"]
    reservations: list["ReservationNestedRead"]
    comments: list["CommentNestedRead"]
    company: "CompanyNestedRead | None"


class UserNestedRead(UserBase):
    id: int


class UserCreate(UserBase):
    password1: str = Field(min_length=8, max_length=64)
    password2: str = Field(min_length=8, max_length=64)

    @model_validator(mode="before")
    @classmethod
    def passwords_match(cls, data: dict) -> dict:
        if not data.get("password1") or not data.get("password2"):
            raise ValueError("Passwords required")
        if data["password1"] != data["password2"]:
            raise ValueError("Passwords do not match")
        return data

    @field_validator("email")
    @classmethod
    def email_validation(cls, value: str) -> str:
        if "@" not in value:
            raise ValueError("Email must contain '@'")
        if any(char.isspace() for char in value):
            raise ValueError("Email cannot contain whitespace characters")
        return value

    @field_validator("password1")
    @classmethod
    def password_validation(cls, value: str) -> str:
        if any(char.isspace() for char in value):
            raise ValueError("Password cannot contain whitespace characters")
        if not value.strip():
            raise ValueError("Password cannot be empty")
        if not any(char.isupper() for char in value):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in value):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one digit")
        if not any(char in "!@#$%^&*()-_=+[]|;:',.<>?/`~" for char in value):
            raise ValueError("Password must contain at least one special character")
        return value


class UserLogin(SQLModel):
    email: str
    password: str

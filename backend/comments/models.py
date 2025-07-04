from datetime import datetime
from typing import TYPE_CHECKING

from database import SQLModel
from sqlalchemy.sql import Select
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from users.models import User, UserNestedRead
    from vehicles.models import Vehicle, VehicleNestedRead


class CommentBase(SQLModel):
    content: str = Field(max_length=2048)
    vehicle_id: int = Field(foreign_key="vehicles.id", ondelete="CASCADE")
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    date: datetime = Field(default_factory=lambda: datetime.now())


class Comment(CommentBase, table=True):
    __tablename__ = "comments"
    id: int | None = Field(primary_key=True, default=None)
    vehicle: "Vehicle" = Relationship(back_populates="comments")
    user: "User" = Relationship(back_populates="comments")

    @classmethod
    def for_user(cls, user: "User") -> Select["Comment"]:
        qs = select(cls)
        if not user.is_admin:
            subordinates = user.get_subordinates()
            suboridante_comments = select(cls).filter(cls.user_id.in_(subordinates))
            qs = qs.filter(cls.user_id == user.id).union(suboridante_comments)
        return qs


class CommentRead(CommentBase):
    id: int
    vehicle: "VehicleNestedRead"
    user: "UserNestedRead"


class CommentNestedRead(CommentBase):
    id: int


class CommentCreate(CommentBase):
    content: str = Field(min_length=1, max_length=1000, description="Comment content")

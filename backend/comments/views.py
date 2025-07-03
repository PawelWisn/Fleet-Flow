from commons import Page, get_filters, get_from_qs_or_404, validate_obj_reference, validate_user_reference
from dependencies import LoginReqDep, SessionDep
from fastapi import APIRouter, Query, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.sql import Select
from users.models import User
from vehicles.models import Vehicle

from .models import Comment, CommentCreate, CommentRead

router = APIRouter(prefix="/comments", tags=["comments"])


def get_queryset(request_user: User) -> Select[Comment]:
    return Comment.for_user(request_user)


@router.get("/")
async def list_comments(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle_id: int = Query(None),
    user_id: int = Query(None),
) -> Page[CommentRead]:
    filters = get_filters({"vehicle_id": vehicle_id, "user_id": user_id})
    qs = get_queryset(request_user).filter_by(**filters)
    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_comment(
    session: SessionDep,
    request_user: LoginReqDep,
    comment: CommentCreate,
    response: Response,
) -> CommentRead:
    validate_obj_reference(session, comment, Vehicle, comment.vehicle_id)
    validate_obj_reference(session, comment, User, comment.user_id)
    validate_user_reference(session, comment, request_user)

    db_comment = Comment.model_validate(comment)
    session.add(db_comment)
    session.commit()
    session.refresh(db_comment)
    response.status_code = status.HTTP_201_CREATED
    return db_comment


@router.get("/{comment_id}/")
async def retrive_comment(
    session: SessionDep,
    request_user: LoginReqDep,
    comment_id: int,
) -> CommentRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, comment_id)


@router.put("/{comment_id}/")
async def update_comment(
    session: SessionDep,
    request_user: LoginReqDep,
    comment_id: int,
    comment: CommentCreate,
) -> CommentRead:
    validate_obj_reference(session, comment, Vehicle, comment.vehicle_id)
    validate_obj_reference(session, comment, User, comment.user_id)

    qs = get_queryset(request_user)
    db_comment = get_from_qs_or_404(session, qs, comment_id)
    db_comment.sqlmodel_update(comment)
    session.commit()
    session.refresh(db_comment)
    return db_comment


@router.delete("/{comment_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    session: SessionDep,
    request_user: LoginReqDep,
    comment_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_comment = get_from_qs_or_404(session, qs, comment_id)
    session.delete(db_comment)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT

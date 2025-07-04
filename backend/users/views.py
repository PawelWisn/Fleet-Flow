from commons import Page, get_filters, get_from_qs_or_404, get_user, raise_perm_error, raise_validation_error, validate_obj_reference
from companies.models import Company
from dependencies import LoginReqDep, SessionDep
from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from permissions import require_role
from sqlalchemy.sql import Select
from sqlmodel import select

from .models import User, UserCreate, UserLogin, UserRead, UserRole
from .utils import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/users", tags=["users"])


def get_queryset(request_user: User) -> Select[User]:
    return User.for_user(request_user)


@router.get("/")
async def list_users(
    session: SessionDep,
    request_user: LoginReqDep,
    company_id: int = Query(None),
) -> Page[UserRead]:
    filters = get_filters({"company_id": company_id})
    qs = get_queryset(request_user).filter_by(**filters)
    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
@require_role([UserRole.ADMIN, UserRole.MANAGER])
async def create_user(
    session: SessionDep,
    user: UserCreate,
    request_user: LoginReqDep,
    response: Response,
) -> UserRead:
    if request_user.role == UserRole.MANAGER and user.role != UserRole.WORKER:
        raise_perm_error(user.model_dump())

    if get_user(session, user.email):
        raise_validation_error("This email has already been taken.", user.model_dump())
    validate_obj_reference(session, user, Company, user.company_id)

    db_user = User.model_validate(user, update={"password": hash_password(user.password1)})
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    response.status_code = status.HTTP_201_CREATED
    return db_user


@router.put("/{user_id}/")
async def update_user(
    session: SessionDep,
    request_user: LoginReqDep,
    user_id: int,
    user: UserCreate,
) -> UserRead:
    if request_user.role != UserRole.ADMIN and request_user.id != user_id:
        raise_perm_error(user.model_dump())
    if request_user.id == user_id and request_user.email != user.email and get_user(session, user.email):
        raise_validation_error("This email has already been taken.", user.model_dump())
    validate_obj_reference(session, user, Company, user.company_id)

    user = User.model_validate(user, update={"password": hash_password(user.password1), "id": user_id})

    qs = get_queryset(request_user)
    db_user = get_from_qs_or_404(session, qs, user_id)
    db_user.sqlmodel_update(user)
    session.commit()
    session.refresh(db_user)
    return db_user


@router.delete("/{user_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    session: SessionDep,
    request_user: LoginReqDep,
    user_id: int,
    response: Response,
) -> None:
    if not request_user.is_admin and request_user.id != user_id:
        raise_perm_error({"user_id": user_id})

    qs = get_queryset(request_user)
    db_user = get_from_qs_or_404(session, qs, user_id)
    session.delete(db_user)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT


@router.post("/login/")
def login(session: SessionDep, response: Response, data: UserLogin) -> dict:
    user = get_user(session, data.email)
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access_token = create_access_token(user.email)

    # Set cookie with the token
    response.set_cookie(
        key="token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600  # Set to True in production with HTTPS  # 1 hour, matches token expiration
    )

    return {"access_token": access_token, "token_type": "bearer", "user": UserRead.model_validate(user)}


@router.post("/logout/", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> Response:
    response.delete_cookie(key="token")
    response.status_code = status.HTTP_204_NO_CONTENT


@router.get("/me/")
def retrive_current_user(request_user: LoginReqDep) -> UserRead:
    return request_user

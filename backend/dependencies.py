import os
from typing import Annotated

from commons import get_user, raise_auth_error
from database import get_session
from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlmodel import Session
from users.models import User


def authenticate_user(session: "SessionDep", token: str | None = Cookie(None)) -> User:
    if not token:
        raise raise_auth_error()

    try:
        payload = jwt.decode(token, os.getenv("SECRET_KEY"))
    except JWTError:
        raise raise_auth_error()

    if email := payload.get("sub"):
        if user := get_user(session, email):
            return user

    raise raise_auth_error()


SessionDep = Annotated[Session, Depends(get_session)]
LoginReqDep = Annotated[User, Depends(authenticate_user)]

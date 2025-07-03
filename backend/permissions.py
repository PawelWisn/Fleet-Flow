from functools import wraps

from commons import raise_perm_error
from users.models import UserRole


def require_role(roles: list[UserRole]):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs["request_user"]
            if user.role not in roles:
                raise_perm_error()
            return await func(*args, **kwargs)

        return wrapper

    return decorator

import logging

logger = logging.getLogger("uvicorn.critical")


def entrypoint():
    from commons import get_user
    from database import get_session
    from users.models import User, UserRole
    from users.utils import hash_password

    session = next(get_session())
    email = "admin@example.com"
    admin = get_user(session, email)
    if admin:
        logger.info("Admin user already exists")
    if not admin:
        admin = User(
            email=email,
            name="admin",
            role=UserRole.ADMIN,
            password=hash_password("Admin1#Admin"),
        )
        session.add(admin)
        try:
            session.commit()
            logger.info("Admin user created")
        except Exception as e:
            logger.exception(f"Failed to create admin user: {e}")
            session.rollback()

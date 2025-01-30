from datetime import datetime, timedelta

from refuels.models import Refuel, RefuelStat
from sqlalchemy import func
from sqlmodel import Session, select
from users.models import User


def get_yearly_stats(session: Session, user: User) -> list[RefuelStat]:
    today = datetime.today()
    start_of_current_month = today.replace(day=1)
    start_of_previous_12_months = (start_of_current_month - timedelta(days=365)).replace(day=1)

    aggregated_query = (
        select(
            func.to_char(Refuel.date, "MM/YY").label("month_year"),
            func.sum(Refuel.fuel_amount).label("total_fuel"),
        )
        .where(Refuel.date >= start_of_previous_12_months)
        .group_by(func.to_char(Refuel.date, "MM/YY"))
        .subquery()
    )

    user_refuel_query = Refuel.for_user(user).filter(Refuel.date >= start_of_previous_12_months).subquery()

    statement = (
        select(
            func.to_char(user_refuel_query.c.date, "MM/YY").label("month_year"),
            func.sum(user_refuel_query.c.fuel_amount).label("total_fuel"),
        )
        .select_from(user_refuel_query)
        .join(aggregated_query, func.to_char(user_refuel_query.c.date, "MM/YY") == aggregated_query.c.month_year)
        .group_by(func.to_char(user_refuel_query.c.date, "MM/YY"))
    )

    refuels = {r.month_year: r.total_fuel for r in session.exec(statement)}

    all_months = [(today - timedelta(days=i * 31)).strftime("%m/%y") for i in range(12)]

    results = []
    for month in all_months:
        results.append({"month_year": month, "total_fuel": round(refuels.get(month, 0.0), 2)})

    return results

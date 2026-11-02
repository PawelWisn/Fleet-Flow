# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

FleetFlow is a fleet management app: a FastAPI + SQLModel + PostgreSQL backend (`backend/`) and a Next.js 16 (App Router, React 19, TypeScript, Tailwind 4) frontend (`frontend/`). Both halves have automated tests (see Testing).

## Commands

Everything is configured through a root `.env` (copy `env_example` → `.env`; `docker-compose.yml` reads it, and the backend reads `DB_URL`, `SECRET_KEY`, `MAX_FILE_SIZE`, etc. from it).

- Run everything: `docker compose up` (db, backend on `$BE_PORT`=8000, frontend on `$FE_PORT`=8080). API docs at `http://localhost:8000/docs`.
- Seed demo data (wipes existing data, requires running compose stack): `./seed_demo_data.sh` (runs `backend/seed_data_raw.py` in the backend container). Demo logins are printed by the script (e.g. `admin@example.com` / `FleetFlow1!`).
- Frontend (from `frontend/`, Node ≥ 20.9): `npm run dev` (port 8080), `npm run build`, `npm run lint` (flat `eslint.config.mjs`; only warnings expected), `npm run type-check`.
- Formatting is enforced via pre-commit (`pre-commit install`): black and isort with line length **180**, prettier for `.tsx`/`.scss` with print width 120 and **tabs**. Match this when editing.
- Alembic (run inside the backend container, from `/app`): `alembic revision --autogenerate -m "msg"`; migration files are bind-mounted to `backend/alembic/versions/` and named `YYYY_MM_DD_HHMM-<rev>_<slug>.py`.

## Testing

- **Backend** (`backend/tests`, pytest + FastAPI `TestClient`): needs a real Postgres (refuel stats use `to_char`). Set `DB_URL` to a server; tests create and use a separate `<db>_test` database (refuses to run against anything else) and TRUNCATE between tests. From `backend/`: `pip install -r requirements.txt && pytest (pytest is in the single requirements file, so it is also installed in the backend image)`. Known bugs are recorded as strict `xfail`s with the reason (e.g. password hash leaked by `/documents/`, role self-promotion, missing tenant scoping for documents/events, cross-company vehicle references) — fix the bug and the xfail starts failing, so remove the marker.
- **Frontend unit/component/page tests** (`frontend/tests`, Vitest + jsdom + Testing Library): `npm test` (`npm run test:coverage` for coverage). API modules are mocked per test (`tests/pageMocks.ts`, `tests/helpers.ts`); `tests/pages/smoke.test.tsx` renders every route.
- **Frontend e2e** (`frontend/e2e`, Playwright): `npm run test:e2e` against a running, seeded stack (`BASE_URL` default is the frontend, `API_URL` the backend, `PLAYWRIGHT_CHROMIUM_PATH` to use a system Chromium). It creates and deletes its own records; seeded demo logins are used for the three roles.
- Running the dev/build tooling in docker as root leaves root-owned files in `frontend/.next`; remove them with a container if `next build` fails with EACCES.

## Backend architecture

Backend modules are imported as top-level packages (`from users.models import User`, `PYTHONPATH` is `/` and workdir `/app`), not as `backend.*`. Run Python from `backend/`.

- **Per-domain packages** (`comments`, `companies`, `documents`, `events`, `insurrances` [sic], `refuels`, `reservations`, `users`, `vehicles`), each with `models.py`, `views.py` (an `APIRouter`), and `utils.py`. Routers are registered in `main.py` (keep alphabetical).
- **Schema startup**: on app start `main.py` lifespan calls `SQLModel.metadata.create_all` **and then** `alembic upgrade head`. `alembic/env.py` imports every model explicitly — new models must be added there (and to `rebuild_models()` in `commons.py` for their Read schemas).
- **Model convention**: in `models.py`, a `XBase` (shared fields), `X` (`table=True`), `XRead` (full read schema with nested relations), `XNestedRead` (slim version used when nested in other Read schemas), and `XCreate`. Cross-module relations use `TYPE_CHECKING` imports and string forward refs; `commons.rebuild_models()` calls `model_rebuild()` on all SQLModel subclasses after all routers are imported, so any new `*Read` model with forward refs must be imported there.
- **Authorization / tenancy**: roles are `admin` / `manager` / `worker` (`users.models.UserRole`). Each model exposes a `for_user(request_user)` classmethod returning a pre-scoped `select` (admins see all; managers/workers are scoped by `company_id`, with extra user-level scoping for comments/refuels etc.). Views always start from `get_queryset(request_user)` and use `get_from_qs_or_404` so out-of-scope rows 404. Write endpoints additionally call `validate_obj_reference` / `validate_company_reference` / `validate_user_reference` from `commons.py`; role-gated endpoints use `@require_role([...])` from `permissions.py` (requires the handler param to be named `request_user`).
- **Search/filter**: models define `with_search` / `with_<filter>` classmethods that take and return a `Select`; list endpoints chain them and return `paginate(session, qs)` with `commons.Page` (default size 15, max 100).
- **Auth**: `POST /users/login/` sets an HTTP-only `token` cookie (JWT signed with `SECRET_KEY`); `dependencies.authenticate_user` reads the cookie. `LoginReqDep` / `SessionDep` are the shared FastAPI dependencies. Error payloads use the pydantic-style shape from `commons.get_body_error_info`.
- **Documents** accept multipart form data and store files on disk under `uploads/documents` (a docker volume) via `DocumentFileManager` (extension allowlist, `MAX_FILE_SIZE`).
- PDF fuel reports for a vehicle are generated with reportlab (`vehicles/utils.py`).
- CORS only allows `http://localhost:$FE_PORT` and `http://localhost:3000`.

## Frontend architecture

- App Router pages under `frontend/app/<resource>/{page,add/page,[id]/page,[id]/edit/page}.tsx` for each resource; shared forms in `components/*Form.tsx` (used by both add and edit pages), plus `SearchableDropdown`, `Pagination`, `RoleGuard`, `DashboardLayout`.
- API layer: `frontend/lib/api.ts` is a shared axios instance (`withCredentials: true`, base URL from `NEXT_PUBLIC_API_URL`; a 401 outside the login call sends you back to `/`, the login form), and `services/api.ts` exposes per-resource `*Api` objects. Types are in `types/index.ts`. `@/*` maps to the frontend root.
- Auth state lives in `contexts/AuthContext.tsx` (fetches `/users/me/`); role-based UI gating uses `RoleGuard` / `hasRole` / `CanModifyUser` — this mirrors but does not replace backend permission checks. **`AuthProvider` is rendered inside `DashboardLayout`**, so `useAuth()` only works in components rendered as its children, not in the page component itself.
- Events, insurances and comments are built on shared generics rather than hand-written pages: `ResourceList` (vehicle filter via `?vehicle_id=`, pagination, optional mode tabs), `ResourceDetail`, `EditLoader`, `AddPage`, plus per-resource `*Form` components. Older resources (vehicles, refuels, …) have bespoke pages.
- Relation pickers should use `SearchableDropdown` with `relationSearch.ts` search helpers (the backend paginates at 15, so plain `<select>`s only show the first page). Pass `valueLabel` when editing so the label does not depend on the item being in the first results page.
- Use `getErrorMessage()` (`services/errors.ts`) for toasts: backend `detail` is either a string or a list of validation errors, and rendering the list directly crashes react-hot-toast.
- The login form is at the root route (`app/page.tsx`); authenticated pages live under `/dashboard`, etc.

## Gotchas

- Naming: the backend router/model is spelled `insurrances` (`/insurrances/`), the frontend route and `insuranceApi` say `insurances`. Always call `/insurrances/` on the API.
- `for_user()` querysets must scope with subqueries (`col.in_(select(...))`), not `.join()`: views call `filter_by(id=...)`/`filter_by(**filters)`, which target the *last joined* entity and silently filter the wrong table (or 500) for non-admin users.
- `PUT` on models with a `default_factory` field (e.g. `Comment.date`) resets it to "now" unless the client sends the existing value.
- `alembic.ini` hardcodes `sqlalchemy.url` with host `db`; migrations fail outside the compose network (startup still succeeds because `create_all` runs first). To run a second stack on other ports, give the Postgres container a network alias `db`.
- Dependency pins that look odd are deliberate: `sqlmodel==0.0.44` (0.0.45+ maps `datetime` to timezone-aware UTC columns, which needs a migration and aware datetimes everywhere), `SQLAlchemy==2.0.x` (2.1 makes `postgresql://` default to psycopg3), `bcrypt==4.3.0` (passlib 1.7.4 breaks on bcrypt 5), `typescript@6` (typescript-eslint does not support TS 7 yet).
- FastAPI now turns an empty form value into `None`; endpoints that must accept `""` (document description on update) read `await request.form()` instead.
- FastAPI keeps included routers nested in `app.routes`; enumerate endpoints through `app.openapi()["paths"]` instead.
- `Event.for_user` does not scope by company, so every authenticated user can see all events.

- Root `.gitignore` contains `lib/` (Python template) with a `!frontend/lib/` exception; keep that exception or `frontend/lib/api.ts` goes untracked.
- `frontend/app/companies/page_new.tsx` is a stray non-routed file.
- `README.md` rule: pull before pushing.

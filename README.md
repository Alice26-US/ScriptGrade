# ScriptGrade

AI-assisted assessment of handwritten student exercises for St. Louis University.

This is **not** the university exam platform, SIS, or CA calculator. Lecturers remain the final authority. Original page images are the source of truth. AI only proposes marks and feedback. Similarity is a lecturer flag, never automatic proof.

## Layout

| Path | What |
|---|---|
| `web/` | Next.js 16 App Router PWA (existing frontend) |
| `api/` | NestJS modular monolith |
| `packages/domain` | Shared enums, scoring rules, submission policy |

## Prerequisites

- Node 20+
- Docker (PostgreSQL 16 + Redis 7)

## Run the API (MVP backend)

```bash
docker compose up -d
copy api\.env.example api\.env   # Windows
# cp api/.env.example api/.env  # macOS/Linux

npm install
npm run build:domain
cd api
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

API: `http://localhost:3001/api/health`

Frontend (PWA UI):

```bash
cd web
npm run dev
```

Open `http://localhost:3000`. The Next.js app proxies `/api/*` to the Nest server so login cookies stay first-party.

Bootstrap admin (from `.env`):

- email: `admin@scriptgrade.local`
- password: `ChangeMeNow1`

## CSV import (admin)

`POST /api/admin/import/:kind` with multipart field `file`.

Kinds (in order):

1. `campuses` — `code,name,timezone` (Bonaberi, Bonamoussadi, Ndogpassi)
2. `faculties` / `departments` / `programmes`
3. `courses` — `code,title`
4. `terms` — `code,name`
5. `offerings` — `offeringKey,courseCode,termCode,campusCode,programmeCode,level,group`
6. `enrolments` — `matricule,offeringKey,active` (student must already have registered)
7. `offering-lecturers` — `email,offeringKey` (lecturer must already have registered)

Students and lecturers are **not** imported. They register in the app.

Student registration: `POST /api/auth/register/start` `{ "matricule", "universityEmail" }` then `POST /api/auth/register/verify` with campus, faculty, department, programme, level, academic year, password. Campus must be one of Bonaberi, Bonamoussadi, Ndogpassi.

Lecturer registration: `POST /api/auth/register/lecturer/start` then `/register/lecturer/verify`.

Login: students use **matricule + password** (`role: "STUDENT"`); lecturers use **email + password** (`role: "LECTURER"`); admin uses email (`role: "ADMIN"`).

## API (prefix `/api`)

| Area | Routes |
|---|---|
| Health | `GET /health` |
| Auth | `POST /auth/register/start`, `/register/verify`, `/register/lecturer/start`, `/register/lecturer/verify`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `/admin-activate`, `/complete-profile`, `/password`, `/photo`, `GET /auth/me` |
| Admin import | `POST /admin/import/:kind`, `GET /admin/students`, `GET /admin/lecturers`, `POST /admin/lecturers`, `POST /admin/lecturers/:id/password`, `POST /admin/students/:id/activate`, `POST /admin/students/:id/reset-onboarding`, `POST /admin/lecturers/:id/reset-onboarding` |
| Offerings | `GET /offerings` |
| Exercises | `GET/POST /exercises`, `GET/PATCH /exercises/:id`, `POST /exercises/:id/publish`, `/access`, `/reassign` |
| Submit | `POST /exercises/:id/drafts/:slot`, `/reserve`, `POST /versions/:id/pages/:slot`, `/complete` |
| Mark | `GET /exercises/:id/marking`, `POST /submissions/:id/start-review`, `/apply-proposal`, `/criteria/:criterionId`, `/feedback`, `/finalize`, `/release`, `/return` |
| Student results | `GET /results/:id` (empty until lecturer **Release**) |

Cookies: `sg_access`, `sg_refresh` (httpOnly). CORS origin: `WEB_ORIGIN`.

## Adapters (env)

| Concern | Env | Default |
|---|---|---|
| Images | `STORAGE_DRIVER=local\|s3` | local disk |
| Email | `EMAIL_DRIVER=noop\|smtp` | noop (OTP in logs) |
| Vision | `VISION_DRIVER=gemma\|spacexai` | Gemma 3.6 (`GEMMA_*`); SpaceXAI (`XAI_*`) |
| Gemma | `GEMMA_API_KEY`, `GEMMA_BASE_URL`, `GEMMA_VISION_MODEL` | OpenAI-compatible; key stays server-side; abstain-all if unset |
| OCR | `OCR_DRIVER` | noop (verbatim adapter TBD) |
| Spellcheck | `SPELLCHECK_DRIVER` | noop |
| Quality | `QUALITY_DRIVER=basic` | image header checks (blur/darkness CV later) |
| Retention | `RETENTION_YEARS=5` | 5 years |
| Release email | `RELEASE_EMAIL_ENABLED=false` | off |

Timestamps are stored in UTC. Display timezone comes from the offering, else the campus.

## Out of MVP

CA calculation, official result write-back, AI-writing detection, web plagiarism, native apps, microservices, extra admin hierarchies, mandatory OCR proofreading.

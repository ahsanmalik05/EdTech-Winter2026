# METY: CSA Translation & Template API

METY is a backend API platform built for [MyEdMaster](https://myedmaster.com), an
educational research organization developing Cognitive Structure Analysis (CSA)
self-assessments. CSA is a learning technique that trains students to reflect on four
types of knowledge (facts, strategies, procedures, and rationales) to identify their
own strengths and knowledge gaps. Research across the US, Scotland, India, and China
has shown that students using CSA improve their academic performance by 1.5 to 2.5
letter grades on average.

The core problem this platform solves is accessibility. CSA templates are written by
hand in English, which makes them expensive to produce and inaccessible to
non-English-speaking students. The API automates two things: generating CSA
templates for any subject, topic, and grade level using AI, and translating those
templates into over 130 languages while preserving their educational structure and
meaning.

The platform is designed to be integrated into MyEdMaster's existing systems by other
partner teams. The frontend included in this repository is just a demo interface. It
exists only to make the API easier to test and demonstrate.

---

## Quick Start

The API is deployed and live at:

**https://edtech-winter2026-production.up.railway.app/**

If you want to use or test the application without any local setup, just visit the link above and register an account. No API keys or installation
required.

For developers who want to run the project locally, please continue reading below.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js + TypeScript | Backend runtime and language |
| Express.js | HTTP server and API routing |
| PostgreSQL | Primary database |
| Drizzle ORM + drizzle-kit | Database queries and schema migrations |
| Cohere (`command-a-translate-08-2025`) | Primary AI model for PDF translation |
| OpenAI (`gpt-5-nano`) | CSA template generation and translation fallback |
| Vercel AI SDK | Structured output and schema-validated AI responses |
| Multer | PDF upload handling and validation |
| Railway Bucket (S3-compatible) | PDF archiving after processing |
| Resend | Transactional email for email verification |
| React 19 + Vite | Frontend demo interface |
| Tailwind CSS + Material UI | Frontend styling |
| Vitest + Supertest | Unit and integration testing |
| Railway | Production deployment |

---

## Project Structure
```
.
├── app.ts                  # Server entry point — Express setup, middleware, route mounting
├── config/
│   └── config.ts           # Environment variable loading and validation
├── controllers/            # Request handlers — one file per route group
├── middleware/
│   ├── api_key.ts          # API key validation middleware
│   ├── auth.ts             # JWT cookie authentication middleware
│   └── upload.ts           # Multer PDF upload configuration
├── routes/                 # Express routers — wire URLs to controllers
├── services/               # Business logic and external integrations
│   ├── cohere.ts           # Cohere AI — translation and embeddings
│   ├── openai.ts           # OpenAI — template generation and similarity scoring
│   ├── pdf.ts              # PDF text extraction and structure parsing
│   ├── glossary.ts         # In-memory glossary cache and term matching
│   ├── templates.ts        # CSA template generation orchestration
│   ├── validate.ts         # Translation back-check and confidence scoring
│   ├── translation_log.ts  # Translation logging and retrieval
│   ├── translation_cache.ts# Translation result caching
│   ├── bucket.ts           # Railway S3-compatible PDF archiving
│   ├── mailer.ts           # Email sending via Resend
│   └── email_verification.ts # Email verification token handling
├── db/
│   ├── index.ts            # Database connection
│   └── schema.ts           # Drizzle ORM table definitions
├── drizzle/                # Auto-generated SQL migration files
├── types/                  # Shared TypeScript interfaces and types
├── utils/
│   └── cost.ts             # AI token cost calculation helpers
├── scripts/
│   ├── seed-glossary.ts    # Seeds glossary terms into the database
│   └── seed-languages.ts   # Seeds supported languages into the database
├── __tests__/              # Vitest unit and integration tests
├── frontend/               # Demo React frontend (not a production UI)
│   └── src/
│       ├── api/            # Axios client and useQuery caching hook
│       ├── components/     # Shared UI components
│       ├── pages/          # Page-level components
│       ├── context/        # React context providers (auth)
│       ├── lib/            # Utility functions and PDF font helpers
│       └── services/       # Frontend API service functions
├── render.yaml             # Render deployment configuration
└── architecture.xml        # Detailed technical architecture reference
```
## Prerequisites

Before running the project locally, make sure you have the following installed
and available:

- **Node.js** v18 or higher ([nodejs.org](https://nodejs.org))
- **npm** v8 or higher (comes bundled with Node.js)
- **PostgreSQL** (a running instance with a database created for the project)

You will also need accounts and API keys for the following external services:

- **Cohere** for PDF translation ([cohere.com](https://cohere.com))
- **OpenAI** for template generation and translation fallback
  ([platform.openai.com](https://platform.openai.com))
- **Resend** for email verification emails ([resend.com](https://resend.com))

---

## Environment Variables

Create a `.env` file in the project root before running locally. The
variables are listed below.

### Core

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Port the server listens on. Defaults to `3000`. |
| `NODE_ENV` | No | Set to `development` or `production`. |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens. Must be at least 32 characters. |
| `FRONTEND_URL` | No | CORS allowed origin. Defaults to `http://localhost:5173`. |

### AI Services

| Variable | Required | Description |
|----------|----------|-------------|
| `COHERE_API_KEY` | Yes | API key from [cohere.com](https://cohere.com). Used for translation. |
| `OPENAI_API_KEY` | Yes | API key from [platform.openai.com](https://platform.openai.com). Used for template generation and translation fallback. |


### Email

Verification emails are sent with [Resend](https://resend.com) over HTTPS (SMTP is not used).

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes (for sending mail) | API key from the Resend dashboard. Without it, `sendVerificationEmail` fails (registration still completes; explicit resend returns 500). |
| `MAIL_FROM` | No | Sender address. Defaults to `METY <onboarding@resend.dev>`. |

**Sandbox / testing:** Addresses on `@resend.dev` (including the default above) are for testing only. Resend only delivers to the account owner’s email until you verify a custom domain. The server logs a warning at startup when `MAIL_FROM` contains `@resend.dev`.

### Storage (Optional)

PDF files are archived to a Railway S3-compatible bucket on a best-effort
basis. However, the application should work without these; PDFs are processed and deleted
locally if no bucket is configured.

| Variable | Required | Description |
|----------|----------|-------------|
| `BUCKET` | No | Railway bucket name. |
| `ENDPOINT` | No | Railway bucket S3 endpoint URL. |
| `ACCESS_KEY_ID` | No | Railway bucket access key ID. |
| `SECRET_ACCESS_KEY` | No | Railway bucket secret access key. |
| `REGION` | No | Bucket region. Defaults to `auto`. |

---

## Running Locally

### Backend

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/CSC392-CSC492-Building-AI-ML-systems/EdTech-Winter2026.git
cd EdTech-Winter2026
npm install
```

2. Create a `.env` file in the project root and fill in the environment
variables listed in the previous section.

3. Set up the database by running migrations:
```bash
npm run db:migrate
```

4. Seed the glossary terms and supported languages:
```bash
npm run db:seed-glossary
npm run db:seed-languages
```

5. Start the backend server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`.

### Frontend (optional)

The frontend is a demo interface and is not required to use the API. If you
want to run it locally:

1. In a separate terminal, navigate to the frontend folder:
```bash
cd frontend
npm install
npm run dev
```

2. The frontend will be available at `http://localhost:5173`.

### Running Tests
```bash
npm test
```

### Database Utilities

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate new migration files after schema changes |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:push` | Push schema changes directly without migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed-glossary` | Seed the glossary terms |
| `npm run db:seed-languages` | Seed the supported languages |

---

## API Reference

### Base URL
```
http://localhost:3000
```

For the deployed instance: `https://edtech-winter2026-production.up.railway.app`

---

### Authentication

Most API endpoints require authentication using one of two methods:

#### 1. Session cookie (JWT)

After a successful login, the API sets an `httpOnly` cookie named `token`. The browser sends it automatically on same-site requests when credentials are included (for example `fetch(..., { credentials: 'include' })`).

#### 2. API Key
Include in request header:
```
x-api-key: <api_key>
```

#### Admin role

Some endpoints are restricted to admin users. Admin accounts have
`role: "admin"` in the database. New accounts default to `role: "user"`.
Admin role must be assigned directly in the database — there is no
self-serve promotion endpoint.

---

### Authentication Endpoints

#### 1. Register User
Create a new user account

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "emailVerified": false
  },
  "message": "Registration successful. Please verify your email before logging in.",
  "verificationRequired": true
}
```

A verification link is emailed when `RESEND_API_KEY` and `MAIL_FROM` are configured and Resend accepts the send. If the send fails after the user is created, the response is still `201` with the same shape; use `POST /api/auth/resend-verification` to try again.

---

#### 2. Login User
Authenticate. On success, the server sets an `httpOnly` cookie `token` (JWT). The JSON body does not include the token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200)** — email verified:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Response (403)** — valid password but email not verified:
```json
{
  "error": "Email is not verified. Please check your inbox.",
  "verificationRequired": true
}
```

---

#### 3. Resend verification email

**Endpoint:** `POST /api/auth/resend-verification`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200)** — always when the account is missing or already verified (no email enumeration):
```json
{
  "message": "If this account exists, a verification email has been sent."
}
```

**Response (200)** — when an unverified account exists and Resend accepts the send:
```json
{
  "message": "Verification email sent."
}
```

**Response (500)** — when Resend rejects the send or another server error occurs during resend.

---

### 4. Verify email (link in email)

**Endpoint:** `GET /api/auth/verify-email?token=<token>`

Redirects to the frontend result page with `status` and optional `message` query parameters.

---

### 5. Get Current User
Retrieve authenticated user information. Uses the `token` cookie set at login.

**Endpoint:** `GET /api/auth/me`

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "createdAt": "2024-01-15T10:30:00Z",
    "emailVerified": true
  }
}
```

---

### API Keys Endpoints

#### 1. Create API Key
Generate a new API key for programmatic access

**Endpoint:** `POST /api/keys`

**Cookies:** `token` (JWT from login), sent automatically when the client uses `credentials: 'include'`.

**Request Body:**
```json
{
  "label": "My API Key",
  "scopes": ["read", "translate", "write"]
}
```

Valid scopes are `read`, `translate`, and `write`. The full key is shown
exactly once on creation and cannot be retrieved again.

**Response (201):**
```json
{
  "api_key": {
    "id": 1,
    "key": "mety_live_<public_key>_<secret>",
    "label": "My API Key",
    "scopes": ["read", "write"]
  }
}
```

#### 2. Get All API Keys
List all API keys for the authenticated user

**Endpoint:** `GET /api/keys`

**Cookies:** `token` (JWT from login).

**Response (200):**
```json
{
  "allKeys": [
    {
      "id": 1,
      "label": "My API Key",
      "scopes": ["read", "write"],
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 3. Get API Key Details
Retrieve information about a specific API key

**Endpoint:** `GET /api/keys/:id`

**Headers:**
```
x-api-key: <api_key>
```

**Response (200):**
```json
{
  "apiKey": {
    "id": 1,
    "label": "My API Key",
    "scopes": ["read", "write"],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### 4. Update API Key
Modify an existing API key's label or scopes

**Endpoint:** `PATCH /api/keys/:id`

**Cookies:** `token` (JWT from login).

**Request Body:**
```json
{
  "label": "Updated Label",
  "scopes": ["read"]
}
```

**Response (200):**
```json
{
  "updatedKey": {
    "id": 1,
    "label": "Updated Label",
    "scopes": ["read"]
  }
}
```

---

#### 5. Delete API Key
Remove an API key

**Endpoint:** `DELETE /api/keys/:id`

**Cookies:** `token` (JWT from login).

**Response (200):**
```json
{
  "message": "API key deleted successfully"
}
```

---

### Language Endpoints

All endpoints require authentication.

#### List languages

**Endpoint:** `GET /api/languages`

**Response (200):**
```json
[
  { "id": 1, "name": "French", "code": "fr" },
  { "id": 2, "name": "Spanish", "code": "es" }
]
```

---

#### Search languages

**Endpoint:** `GET /api/languages/search?code=fr`

**Endpoint:** `GET /api/languages/search?name=French`

---

#### Add language

**Endpoint:** `POST /api/languages`

**Request body:**
```json
{
  "name": "Japanese",
  "code": "ja"
}
```

---

#### Delete language

**Endpoint:** `DELETE /api/languages/:id`

---


### Template Endpoints

All endpoints require authentication.

#### Generate a CSA template

Uses OpenAI `gpt-5-nano` to generate a full three-section CSA
self-assessment script for a given subject, topic, and grade level.

**Endpoint:** `POST /api/templates/generate`

**Request body:**
```json
{
  "subject": "Mathematics",
  "topic": "Two-Step Equations",
  "gradeLevel": "8th Grade"
}
```

**Response (201):**
```json
{
  "id": 1,
  "subject": "Mathematics",
  "topic": "Two-Step Equations",
  "gradeLevel": "8th Grade",
  "version": 1,
  "isActive": true,
  "sections": {
    "introduction": "...",
    "model_assessment": "...",
    "self_review": "..."
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

#### List templates

**Endpoint:** `GET /api/templates`

Optional query parameters: `?subject=`, `?gradeLevel=`, `?isActive=`

---

#### Get template by ID

**Endpoint:** `GET /api/templates/:id`

---

#### Update template

**Endpoint:** `PATCH /api/templates/:id`

**Request body:**
```json
{
  "subject": "Mathematics",
  "topic": "Three-Step Equations",
  "gradeLevel": "9th Grade",
  "sections": {
    "introduction": "Updated introduction text"
  }
}
```

---

#### Deactivate template

Soft-deletes the template by setting `isActive` to `false`.

**Endpoint:** `DELETE /api/templates/:id`

---

### Translation Endpoints

All endpoints require authentication. PDF files must be uploaded as
`multipart/form-data`. Maximum file size is 10 MB per PDF.

#### Translate a single PDF

**Endpoint:** `POST /api/translate/pdf`

**Form fields:**
- `pdf` - the PDF file
- `language` - target language name (e.g. `French`)
- `gradeLevel` - optional grade level for vocabulary adjustment

**Response (200):**
```json
{
  "originalName": "template.pdf",
  "targetLanguage": "French",
  "extractedText": "...",
  "translatedText": "..."
}
```

---

#### Translate a single PDF with streaming

Returns a stream of Server-Sent Events (SSE) showing real-time progress.

**Endpoint:** `POST /api/translate/pdf/stream`

**Form fields:** same as above.

**SSE events:**

| Event | Data | When |
|-------|------|------|
| `status` | `{ step: "extracting" }` | PDF extraction begins |
| `extracted` | `{ extractedText }` | Extraction complete |
| `status` | `{ step: "translating" }` | Translation begins |
| `translated` | `{ translatedText }` | Translation complete |
| `complete` | `{}` | Stream finished |
| `error` | `{ error }` | Something went wrong |

---

#### Batch translate multiple PDFs

**Endpoint:** `POST /api/translate/batch`

**Form fields:**
- `pdfs` - one or more PDF files (up to 10)
- `targetLanguage` - target language name
- `gradeLevel` - optional

**Response (200):**
```json
{
  "results": {
    "template.pdf": {
      "translatedText": "...",
      "tokenCount": 1234
    }
  }
}
```

---

#### Batch translate with streaming

Returns SSE progress events for each file as it completes.

**Endpoint:** `POST /api/translate/batch/stream`

**Form fields:** same as batch above.

**SSE events:**

| Event | Data | When |
|-------|------|------|
| `status` | `{ totalFiles }` | Stream starts |
| `extracting` | `{ fileName }` | Extraction begins per file |
| `translating` | `{ fileName }` | Translation begins per file |
| `item_done` | `{ fileName, translatedText }` | File complete |
| `item_error` | `{ fileName, error }` | File failed |
| `complete` | `{ totalFiles, successCount }` | All files done |
| `error` | `{ error }` | Fatal failure |

---

#### Validate a translation

Back-translates the translated text to English using Cohere, then scores
semantic similarity against the original using OpenAI. Also checks
structural preservation.

**Endpoint:** `POST /api/translate/validate`

**Form fields:**
- `original` - the original PDF file
- `translated` - the translated PDF file
- `targetLanguage` - the language the translated file is in (e.g. `French`)

**Response (200):**
```json
{
  "backTranslated": "...",
  "similarityScore": 0.95,
  "similarityReasoning": "Meaning is fully preserved with only minor wording differences.",
  "structuralChecks": {
    "sectionCountMatch": true,
    "originalSectionCount": 5,
    "translatedSectionCount": 5,
    "headersIntact": true
  },
  "overallConfidence": 1.0
}
```

---

#### Get translation statistics

**Endpoint:** `GET /api/translate/stat`

Returns aggregated usage statistics across all translations.

---

### Translation Log Endpoints

All endpoints require authentication.

#### Get all translation logs

**Endpoint:** `GET /api/translation-log`

#### Filter logs by language

**Endpoint:** `GET /api/translation-log/filter?target_language=French`

#### Get logs by date range

**Endpoint:** `GET /api/translation-log/range?start=2024-01-01&end=2024-12-31`

#### Delete a log entry

**Endpoint:** `DELETE /api/translation-log/:id`

---

### Template Generation Log Endpoints

#### Get all template generation logs

**Endpoint:** `GET /api/template-generation-log`

Returns a log of all template generation attempts including success/failure
status, model used, token count, and latency.

---

### Admin Endpoints

All endpoints require authentication and an admin role. Requests from
non-admin users receive a `403 Forbidden` response.

#### Get translation statistics

**Endpoint:** `GET /api/admin/stats`

Returns aggregated translation statistics including token counts, cost,
latency, and model usage across all users.

---


### Authentication Flow

1. **Register**: Receive `201` with `verificationRequired: true` and verify
via the email link (or resend).
2. **Login**: After verification, login sets the `token` cookie; JSON
returns `{ user }` only.
3. **Create an API Key** while authenticated (cookie sent with
`credentials: 'include'`).
4. **Use API Key** (`x-api-key` header) for programmatic API requests.
5. **JWT cookies expire** after one hour: Log in again to refresh.

---

### Error Responses

All endpoints may return error responses in the following format:

**400 Bad Request:**
```json
{
  "error": "Missing required fields"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to process request"
}
```

---

### Rate Limiting & Best Practices

- Always use HTTPS in production
- Keep API keys secure and rotate regularly
- Use appropriate scopes for API keys
- Handle 500 errors gracefully with exponential backoff

---

## Database Schema

The database uses PostgreSQL managed with Drizzle ORM. The schema is
defined in `db/schema.ts` and migrations live in the `drizzle/` folder.

### Core tables

**`users`** - registered user accounts. Passwords are stored as bcrypt
hashes. Includes email verification status and a `role` field
(`user` or `admin`). All new accounts default to the `user` role.

**`email_verification_tokens`** - one-time tokens sent by email on
registration. Linked to a user, has an expiry timestamp, and is marked
used after verification.

**`api_keys`** - scoped API keys belonging to a user. The raw key is shown
once on creation and stored as a SHA-256 hash. Each key has an array of
scopes (`read`, `translate`, `write`).

**`languages`** - supported translation languages. Each row has a `name`
(e.g. `French`) and an ISO `code` (e.g. `fr`). Seeded via
`npm run db:seed-languages`.

**`translation_glossary`** - domain-specific terminology used to guide
translation. Each term has a meaning, category, usage context, and a
`doNotTranslate` flag. Loaded into memory at server startup as a fast
lookup cache. Seeded via `npm run db:seed-glossary`.

### Template tables

**`templates`** - CSA self-assessment templates. Each row stores the
subject, topic, grade level, version number, and active status.

**`template_sections`** - the three sections of each template
(`introduction`, `model_assessment`, `self_review`), stored as separate
rows linked to a template by `templateId`.

**`template_translations`** - cached translated versions of templates,
stored as JSONB keyed by language code.

### Translation tables

**`source_documents`** - deduplicated source texts identified by a SHA-256
hash. Allows the system to avoid re-translating identical content.

**`translation_log`** - a record of every translation performed. Stores
source and translated text, target language, model used, token counts,
cost in USD, latency, and whether the result was served from cache.

**`pdf_uploads`** - tracks every PDF file uploaded for translation,
including its content hash, bucket object key, file size, and upload
status (`uploaded`, `failed`, `skipped`).

### Logging and validation tables

**`template_generation_log`** - a record of every template generation
attempt, including success/failure status, model used, token counts, cost,
and latency.

**`template_validations`** - background quality checks run after template
generation. Stores whether the template passed validation and any issues
found.

**`translation_validations`** - results of back-translation quality checks.
Stores the back-translated text, similarity score, reasoning, structural
checks, and overall confidence score.


---

## Known Limitations and Notes

### Translation quality

Translation is performed by Cohere's `command-a-translate-08-2025` model
with a domain-specific glossary injected into every prompt. While this
significantly improves consistency for CSA terminology, translation quality
may still vary across languages. This holds especially true for rarer languages,
specialized academic terminology, and culturally nuanced expressions. The
back-translation validate endpoint (`POST /api/translate/validate`) exists
specifically to help assess translation quality.

### Translation scoring

The validate endpoint uses Cohere for back-translation and OpenAI for
similarity scoring. However, note that LLM-based scoring is inherently approximate 
and should be treated as a guide rather than a definitive quality measure.

### Frontend

The frontend in the `frontend/` folder is a demo interface only. It is not
intended as a production UI. The real frontend has been built by a partner
team and will integrate with this API.

### Not yet tested in production classrooms

The system has not been tested in a live classroom environment. All
validation has been performed on simulated or sample data. Real-world
performance, student engagement outcomes, and edge cases in authentic
educational contexts remain unverified at this point.


---

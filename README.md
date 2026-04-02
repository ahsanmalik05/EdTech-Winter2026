# EdTech API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication

Most API endpoints require authentication using one of two methods:

### 1. Session cookie (JWT)

After a successful login, the API sets an `httpOnly` cookie named `token`. The browser sends it automatically on same-site requests when credentials are included (for example `fetch(..., { credentials: 'include' })`).

### 2. API Key
Include in request header:
```
x-api-key: <api_key>
```

---

## Environment variables (email)

Verification emails are sent with [Resend](https://resend.com) over HTTPS (SMTP is not used).

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes (for sending mail) | API key from the Resend dashboard. Without it, `sendVerificationEmail` fails (registration still completes; explicit resend returns 500). |
| `MAIL_FROM` | No | Sender address. Defaults to `METY <onboarding@resend.dev>`. |

**Sandbox / testing:** Addresses on `@resend.dev` (including the default above) are for testing only. Resend only delivers to the account owner’s email until you verify a custom domain. The server logs a warning at startup when `MAIL_FROM` contains `@resend.dev`.

Other required configuration includes `JWT_SECRET` (min 32 characters) and `DATABASE_URL`; see your deployment platform or local `.env`.

---

## Public Endpoints (No Authentication Required)

### 1. Translation Service
Translate text to French using Cohere AI

**Endpoint:** `GET /translation`

**Query Parameters:**
- `text` (required): Text to translate

**Response:**
```json
{
  "originalLanguage": "English",
  "targetLanguage": "French",
  "originalText": "Hello",
  "translatedText": "Bonjour"
}
```

---

## Authentication Endpoints

### 1. Register User
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

### 2. Login User
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

### 3. Resend verification email

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

### 4. Verify email (link in email)

**Endpoint:** `GET /api/auth/verify-email?token=<token>`

Redirects to the frontend result page with `status` and optional `message` query parameters.

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

## API Keys Endpoints

### 1. Create API Key
Generate a new API key for programmatic access

**Endpoint:** `POST /api/keys`

**Cookies:** `token` (JWT from login), sent automatically when the client uses `credentials: 'include'`.

**Request Body:**
```json
{
  "label": "My API Key",
  "scopes": ["read", "write"]
}
```

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

### 2. Get All API Keys
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

### 3. Get API Key Details
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

### 4. Update API Key
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

### 5. Delete API Key
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

## Classroom Endpoints

### 1. Get Classes by Teacher ID
Retrieve all classes owned or taught by a teacher

**Endpoint:** `GET /api/classrooms/teacher/:teacherId`

**Headers:**
```
x-api-key: <api_key>
```

**Response (200):**
```json
{
  "classes": [
    {
      "id": 1,
      "name": "Advanced JavaScript",
      "classCode": "ADV-JS-2024",
      "ownerUserId": 1,
      "createdAt": "2024-01-01T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. Get Classes by Student ID
Retrieve all classes the student is enrolled in

**Endpoint:** `GET /api/classrooms/student/:studentId`

**Headers:**
```
x-api-key: <api_key>
```

**Response (200):**
```json
{
  "classes": [
    {
      "id": 1,
      "name": "Advanced JavaScript",
      "classCode": "ADV-JS-2024",
      "ownerUserId": 1,
      "createdAt": "2024-01-01T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Worksheet Endpoints

### 1. Get Worksheets by Title
Search for worksheets by exact title match

**Endpoint:** `GET /api/worksheets/title/:title`

**Headers:**
```
x-api-key: <api_key>
```

**Response (200):**
```json
{
  "worksheets": [
    {
      "id": 1,
      "title": "Quadratic Equations",
      "content": "...",
      "classId": 1,
      "createdAt": "2024-01-10T09:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## AI Endpoints

### 1. Cohere Chat Service
Send a message to Cohere AI and receive a response

**Endpoint:** `GET /cohere/:message`

**Headers:**
```
x-api-key: <api_key>
```

**URL Parameters:**
- `message` (required): Message to send to Cohere AI

**Response (200):**
```json
{
  "message": "Hello, how are you?",
  "response": "I'm doing well, thank you for asking!"
}
```

---

## Test Endpoint

### Health Check
Simple test endpoint to verify server connectivity

**Endpoint:** `GET /test`

**Headers:**
```
x-api-key: <api_key>
```

**Response:**
```
Test
```

---

## Error Responses

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

## Authentication Flow

1. **Register** — receive `201` with `verificationRequired: true` and verify via the email link (or resend).
2. **Login** — after verification, login sets the `token` cookie; JSON returns `{ user }` only.
3. **Create an API Key** while authenticated (cookie sent with `credentials: 'include'`).
4. **Use API Key** (`x-api-key` header) for programmatic API requests.
5. **JWT cookies expire** after one hour — log in again to refresh.

---

## Rate Limiting & Best Practices

- Always use HTTPS in production
- Keep API keys secure and rotate regularly
- Use appropriate scopes for API keys
- Handle 500 errors gracefully with exponential backoff

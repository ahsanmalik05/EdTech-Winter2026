# EdTech API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication

Most API endpoints require authentication using one of two methods:

### 1. Bearer Token (JWT)
Include in request header:
```
Authorization: Bearer <jwt_token>
```

### 2. API Key
Include in request header:
```
x-api-key: <api_key>
```

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
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login User
Authenticate and receive JWT token

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Get Current User
Retrieve authenticated user information

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## API Keys Endpoints

### 1. Create API Key
Generate a new API key for programmatic access

**Endpoint:** `POST /api/keys`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

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

**Headers:**
```
Authorization: Bearer <jwt_token>
```

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

**Headers:**
```
Authorization: Bearer <jwt_token>
```

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

1. **Register/Login** to get a JWT token
2. **Create an API Key** using your JWT token
3. **Use API Key** (`x-api-key` header) for subsequent API requests
4. **JWT tokens expire** after 1 hour - refresh by logging in again

---

## Rate Limiting & Best Practices

- Always use HTTPS in production
- Keep API keys secure and rotate regularly
- Use appropriate scopes for API keys
- Handle 500 errors gracefully with exponential backoff

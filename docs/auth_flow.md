# Nexora Authentication & Session Management

This document details the security model, cryptographic primitives, and sequence of events for user authentication, session refreshment, and Multi-Factor Authentication (MFA).

---

## 1. Sequence Diagrams

### 1.1 User Registration & Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / Front-End
    participant API as Registration API (/api/auth/register)
    database DB as SQLite Database

    Client->>API: POST /api/auth/register (payload)
    API->>DB: Check email/phone uniqueness
    alt Already exists
        DB-->>API: Conflict found
        API-->>Client: 409 Conflict
    else Available
        API->>API: Hash password (Bcrypt, 12 rounds)
        API->>DB: Create User (status: 'pending_verification')
        API->>DB: Create default Customer Role & preferences
        API->>API: Generate 6-digit OTP code
        API->>DB: Store Otp record (expires in 24 hours)
        API-->>Client: 201 Created (Verification simulated)
    end
```

### 1.2 User Login & Token Issuance Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / Front-End
    participant API as Login API (/api/auth/login)
    database DB as SQLite Database
    participant Jose as Jose JWT Signer

    Client->>API: POST /api/auth/login (email, password)
    API->>DB: Fetch User & associated roles
    API->>API: Bcrypt compare password
    alt Credentials Invalid
        API-->>Client: 401 Unauthorized
    else Account Suspended
        API-->>Client: 403 Forbidden
    else MFA Enabled (First check, code missing)
        API-->>Client: 200 OK (mfaRequired: true, userId)
    end

    Note over Client, API: Step 2 (If MFA Required): Post email, password + TOTP code
    Client->>API: POST /api/auth/login (email, password, code)
    API->>API: Verify TOTP secret via otplib
    alt MFA Code Invalid
        API-->>Client: 401 Unauthorized
    end
    
    API->>DB: Insert Session record (IP, User Agent)
    API->>Jose: Sign Access Token (15m expiry, roles payload)
    API->>Jose: Sign Refresh Token (30d/1d expiry, sessionId payload)
    API->>DB: Update Session record (store refresh token value)
    API-->>Client: 200 OK (Set Cookies: access_token, refresh_token)
```

---

## 2. Token Specifications

Nexora handles token logic via HTTP-Only, SameSite cookies to protect against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).

### Access Token (JWT)
*   **Cookie Name**: `access_token`
*   **Validity**: 15 Minutes
*   **Payload Schema**:
    ```json
    {
      "userId": "string (UUID)",
      "email": "string",
      "roles": ["string"]
    }
    ```
*   **Alg**: HMAC using SHA-256 (`HS256`)

### Refresh Token (JWT)
*   **Cookie Name**: `refresh_token`
*   **Validity**: 30 Days (if `rememberMe` checked) or 24 Hours
*   **Payload Schema**:
    ```json
    {
      "sessionId": "string (UUID)"
    }
    ```
*   **Database Match**: Validated cryptographically, then matched against the SQLite `Session` table.

---

## 3. Session Refresh Cycle

To maintain active logins without requesting password credentials, the front-end requests new Access Tokens periodically:

1.  Client invokes `POST /api/auth/refresh`.
2.  Route handler extracts the `refresh_token` cookie.
3.  Token is verified cryptographically by `jose`.
4.  The extracted `sessionId` is queried in the DB.
5.  **Validation Checks**:
    *   Session must exist.
    *   `isRevoked` must be `false`.
    *   `expiresAt` must be in the future.
6.  The backend signs a fresh Access Token (15m duration) and updates the client's cookies.

---

## 4. Session Revocation (Logout)

When a user logs out (`POST /api/auth/logout`):
1.  Both cookies (`access_token`, `refresh_token`) are expired by setting `Max-Age: 0`.
2.  The matching refresh token's DB `Session` record is updated to `isRevoked: true`.

Admins can review active user login sessions via `GET /api/auth/sessions` and terminate specific session IDs via `POST /api/auth/sessions/revoke`.

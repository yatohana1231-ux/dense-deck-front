# User Management Model

## 1. User Entity
- `user_id`: primary key
- `username`: display name (unique)
- `email`: nullable, unique
- `password_hash`: nullable
- `status`: lifecycle state
- `role`: authorization role
- `last_connected_at`: last connection timestamp
- `username_changed`: one-time username change flag

## 2. Status Values
- `ANONYMOUS`: guest state
- `PROVISIONAL`: username + password are set, email is not confirmed
- `PENDING`: email confirmation pending (reserved for future use)
- `VERIFIED`: email confirmed

Notes:
- In the current implementation, email verification flow is out of scope.
- Therefore `PENDING` is prepared as a model value but not used in normal flows.
- Guest detection uses `status === "ANONYMOUS"`.

## 3. Role Values
- `USER`: default role
- `ADMIN`: reserved for future admin features

## 4. State Transitions (Current Implementation)
1. First access creates guest user: `ANONYMOUS`
2. Register API accepts `username?`, `email?`, `password`
3. Register with email -> `VERIFIED`
4. Register without email -> `PROVISIONAL`
5. `PUT /api/user/account` updates provisional email and sets `VERIFIED`

## 5. Session Model
- `sessions` table fields: `session_id`, `user_id`, `expires_at`, `created_at`
- `sessions.is_guest` is removed
- Guest logic is derived from `users.status`

## 6. last_connected_at Update Policy
- Update on successful login
- Update on logout
- Update when session expiration is detected

## 7. Related APIs
- `POST /api/auth/guest`
- `GET /api/auth/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `PUT /api/user/account`
- `POST /api/user/username`
- `PUT /api/user/password`

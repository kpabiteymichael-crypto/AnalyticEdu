# EduAnalytics — API Reference

Base URL: `https://your-backend.onrender.com/api`  
All authenticated endpoints require: `Authorization: Bearer <jwt_token>`

---

## Authentication

### POST /auth/login
```json
Body: { "email": "string", "password": "string" }
Response: { "token": "jwt", "user": { "id", "name", "email", "role" } }
```

### POST /auth/register
```json
Body: { "name": "string", "email": "string", "password": "string", "role": "student|teacher|parent", "grade": 1-12 }
Response: { "token": "jwt", "user": { ... } }
```

### GET /auth/me *(requires auth)*
Returns the authenticated user object.

### PUT /auth/profile *(requires auth)*
```json
Body: { "name?": "string", "email?": "string", "currentPassword?": "string", "newPassword?": "string" }
```

---

## Students *(admin | teacher)*

| Method | Path | Description |
|--------|------|-------------|
| GET | /students | List all students |
| GET | /students/me | Current student's own record |
| GET | /students/:id | Get student by ID |
| POST | /students | Create student |
| PUT | /students/:id | Update student |
| DELETE | /students/:id | Delete student |
| GET | /students/:id/activity | Activity log |
| GET | /students/summary/overview | Aggregate stats |
| POST | /students/bulk-import | Bulk create from CSV data |

---

## Scores

| Method | Path | Description |
|--------|------|-------------|
| POST | /scores | Record a new score |
| DELETE | /scores/:id | Delete a score |
| GET | /scores/student/:id | Scores for a student |
| GET | /scores/student/:id/trends | Monthly trend data |
| GET | /scores/analytics/subject-breakdown | Class-wide averages by subject |
| GET | /scores/analytics/monthly-trend | Monthly aggregate trend |
| POST | /scores/reset/student/:id | Reset a student's scores |
| POST | /scores/reset/subject/:subject | Reset all scores for a subject |
| POST | /scores/reset/class/:classId | Reset all scores in a class |

**Score object:**
```json
{ "studentId": 1, "subject": "math", "score": 88, "maxScore": 100, "assessmentType": "exam", "assessmentName": "Mid-term", "semester": 1, "academicYear": "2025-2026" }
```

---

## Rankings

| Method | Path | Description |
|--------|------|-------------|
| GET | /rankings/leaderboard | Overall top students |
| GET | /rankings/leaderboard/subject/:subject | Per-subject leaderboard |
| GET | /rankings/student/:id | Student's rank data |

---

## Gamification

| Method | Path | Description |
|--------|------|-------------|
| GET | /gamification/badges | All badge definitions |
| GET | /gamification/badges/student/:id | Badges earned by student |
| POST | /gamification/badges/award | Award badge manually |
| GET | /gamification/activity/:id | Activity log with XP |
| PUT | /gamification/badges/xp/bulk | Bulk update badge XP rewards |

---

## Analytics *(admin | teacher)*

| Method | Path | Description |
|--------|------|-------------|
| GET | /analytics/overview | Aggregated class stats |
| GET | /analytics/performance-distribution | Grade band distribution |

---

## AI Predictions

| Method | Path | Description |
|--------|------|-------------|
| POST | /predictions/generate/:studentId | Generate predictions for student |
| GET | /predictions/student/:studentId | Get student's predictions |
| GET | /predictions/at-risk | List at-risk students |

---

## Parents *(parent)*

| Method | Path | Description |
|--------|------|-------------|
| POST | /parents/link | Link to child by student code |
| GET | /parents/my-children | List linked children |
| GET | /parents/child/:studentId/report | Full child report |

---

## Reports *(admin | teacher)*

| Method | Path | Description |
|--------|------|-------------|
| GET | /reports/class-performance | Class performance table |
| GET | /reports/student/:id/full | Individual full report |
| GET | /reports/export-summary | Download CSV (streams file) |

---

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | /notifications | List notifications for current user |
| PATCH | /notifications/:id/read | Mark notification read |
| PATCH | /notifications/read-all | Mark all notifications read |

---

## Classes *(admin | teacher)*

| Method | Path | Description |
|--------|------|-------------|
| GET | /classes | List all classes |
| POST | /classes | Create class |
| PUT | /classes/:id | Update class |
| DELETE | /classes/:id | Delete class |
| GET | /classes/unassigned | Students not in any class |
| GET | /classes/:id/students | Students in a class |
| POST | /classes/:id/assign | Assign student to class |
| DELETE | /classes/:id/students/:studentId | Remove student from class |
| GET | /classes/:id/subjects | Class subjects |
| PUT | /classes/:id/subjects | Set class subjects |

---

## Settings *(admin)*

| Method | Path | Description |
|--------|------|-------------|
| GET | /settings | Get all configurable settings |
| PUT | /settings/level-thresholds | Update XP level thresholds |
| PUT | /settings/subject-max-marks | Update per-subject max marks |
| PUT | /settings/xp-rewards | Update XP reward tiers |
| PUT | /settings/subject-labels | Update subject display names |

---

## Health Check

### GET /health
```json
Response: {
  "status": "ok",
  "timestamp": "2026-05-15T14:00:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "db": "connected",
  "responseTimeMs": 4
}
```
Status `503` with `"db": "disconnected"` if the database is unreachable.

---

## Error Format

All errors return:
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

Common codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `INTERNAL_ERROR` (500).

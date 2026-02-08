# API Documentation

CityShield Backend REST API reference. Full interactive documentation available at http://localhost:8000/docs

## Authentication

All endpoints except `/api/auth/login` and `/api/health` require JWT authentication.

**Login**:
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}

Response: {
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**Authentication Header**:
```http
Authorization: Bearer eyJ...
```

## Endpoints

### Health
- `GET /api/health` - Health check
- `GET /api/status` - System status with component health

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `POST /api/users` - Create user
- `GET /api/users` - List users
- `GET /api/users/{username}` - Get user
- `PUT /api/users/{username}` - Update user
- `DELETE /api/users/{username}` - Delete user

### Rules (Researcher/Admin create/edit, all can view)
- `POST /api/rules` - Create rule
- `GET /api/rules` - List rules
- `GET /api/rules/{rule_id}` - Get rule
- `PUT /api/rules/{rule_id}` - Update rule
- `DELETE /api/rules/{rule_id}` - Delete rule

### Scenarios (Researcher/Admin create/edit, all can view)
- `POST /api/scenarios` - Create scenario
- `GET /api/scenarios` - List scenarios
- `GET /api/scenarios/{scenario_id}` - Get scenario
- `PUT /api/scenarios/{scenario_id}` - Update scenario
- `DELETE /api/scenarios/{scenario_id}` - Delete scenario
- `POST /api/scenarios/runs` - Create scenario run
- `GET /api/scenarios/runs` - List scenario runs
- `GET /api/scenarios/runs/{run_id}` - Get scenario run

### Alerts (Analyst/Admin can update, all can view)
- `GET /api/alerts` - List alerts (with filters)
- `GET /api/alerts/{alert_id}` - Get alert
- `PUT /api/alerts/{alert_id}` - Update alert
- `GET /api/alerts/stats/summary` - Alert summary stats

### Metrics
- `GET /api/metrics` - Get all metrics
- `GET /api/metrics/mttd` - Mean Time To Detect
- `GET /api/metrics/mttr` - Mean Time To Respond
- `GET /api/metrics/accuracy` - Detection accuracy
- `GET /api/metrics/resources` - Resource utilization
- `GET /api/metrics/ingestion` - Log ingestion rate

See http://localhost:8000/docs for full request/response schemas.

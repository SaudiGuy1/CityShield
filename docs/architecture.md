# CityShield Architecture

## Overview

CityShield follows a microservices architecture with clear separation of concerns across simulation, data, detection, and presentation layers.

## System Components

### UI Layer
- **Frontend (React + TypeScript)**: Web-based dashboard for all user interactions
- **OpenSearch Dashboards**: Data visualization and log exploration

### Application Layer
- **Backend API (FastAPI)**: REST API with JWT authentication and RBAC
- **Detection Engine**: Rule-based threat detection with MITRE ATT&CK mapping
- **Response Manager**: Automated response orchestration using Ansible
- **Scenario Runner**: Attack scenario orchestration service

### Simulation Layer
- **Traffic Simulator**: Simulates smart city traffic management events
- **IoT Simulator**: Simulates IoT sensor readings and anomalies
- **Network Emulator**: Simulates network attacks (scans, DoS, brute force)

### Data Layer
- **OpenSearch**: Document store for logs, alerts, rules, scenarios, users
- **Filebeat**: Log shipping from simulators to OpenSearch

## Data Flow

1. **Log Generation**: Simulators write JSON logs to shared volume
2. **Log Ingestion**: Filebeat tails logs and ships to OpenSearch (logs-* indices)
3. **Threat Detection**: Detection engine queries logs-*, matches rules, enriches with threat intel
4. **Alert Creation**: Alerts written to alerts index
5. **Automated Response**: Response manager polls alerts, executes playbooks
6. **User Interaction**: Frontend queries backend API, which queries OpenSearch

## Security Architecture

### Network Isolation
- All services on isolated Docker network (cityshield_network)
- Only frontend, backend, and dashboards exposed to host

### Authentication & Authorization
- JWT-based authentication for backend API
- Role-based access control (Administrator, Analyst, Researcher)
- OpenSearch internal authentication

### Secrets Management
- Environment variables via .env file
- No hardcoded credentials
- Separate service accounts for each component

## Scalability Considerations

- Stateless services (detection, response, scenario runner)
- Horizontal scaling possible for simulators
- OpenSearch clustering supported for large deployments
- Log rotation via index lifecycle management

## High Availability

- Health checks for all services
- Restart policies in Docker Compose
- Graceful degradation (e.g., mock threat intel if AbuseIPDB unavailable)

## Monitoring & Observability

- Service health endpoints
- OpenSearch cluster health monitoring
- Log ingestion rate tracking
- Detection and response metrics

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Python 3.11, FastAPI, Pydantic |
| Data Store | OpenSearch 2.11 |
| Log Shipping | Filebeat 8.11 |
| Response | Ansible, Python |
| Containerization | Docker, Docker Compose |
| Authentication | JWT (jose library) |
| Password Hashing | bcrypt (passlib) |

## Index Schema

### logs-*
Stores all simulator events with @timestamp for time-series analysis.

### alerts
Stores detected threats with triggered_at timestamp, rule information, evidence, and response data.

### rules
Stores detection rule definitions in YAML format.

### scenarios
Stores scenario definitions with attack patterns and parameters.

### users
Stores user accounts with hashed passwords and roles.

## API Architecture

RESTful API with OpenAPI documentation at /docs:
- `/api/auth/*` - Authentication
- `/api/users/*` - User management (Admin)
- `/api/rules/*` - Detection rule CRUD
- `/api/scenarios/*` - Scenario management
- `/api/alerts/*` - Alert viewing and triage
- `/api/metrics/*` - Evaluation metrics
- `/api/health` - System health

## Deployment Architecture

### Local Development
Single-host Docker Compose deployment with all services.

### Production Considerations
- Reverse proxy (nginx/Traefik) with TLS termination
- External OpenSearch cluster
- Separate monitoring stack
- Secret management (Vault, AWS Secrets Manager)
- CI/CD pipeline for automated deployment

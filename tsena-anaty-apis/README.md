# TsenaAnaty

**Backend Framework:** FastAPI  
**Database:** SQLite  
**Containerized:** Yes ✓

---

## Overview

This is a **FastAPI** backend project with SQLite integration. It provides RESTful API endpoints with automatic database schema management through Alembic migrations.

### Tech Stack

- **Framework:** FastAPI 0.100+
- **Database:** SQLite
- **ORM:** SQLAlchemy
- **Migrations:** Alembic
- **Python Version:** 3.10+

---

## Prerequisites

- **Python 3.10** or higher
- **pip** or **poetry**
- **SQLite** server (for non-SQLite databases)
- **Docker** and **Docker Compose**

---

## Installation

### 1. Clone/Download Project

```bash
cd TsenaAnaty
```

### 2. Create Virtual Environment

**Linux/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Database Setup

### SQLite Configuration

SQLite is a file-based database. The database file is automatically created in the project directory.

**In .env:**
```
SQLITE_DATABASE='project_name.db'
```

SQLite is ideal for development and testing. For production, consider upgrading to MySQL or PostgreSQL.


### Run Migrations

After configuring the database connection in `.env`, apply pending migrations:

```bash
alembic upgrade head
```

### Create a New Migration

When you modify models, generate a new migration:

```bash
alembic revision --autogenerate -m "your_migration_description"
```

Then apply it:

```bash
alembic upgrade head
```

---

## Running the Server

### Development Mode (with Auto-Reload)

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8081
```

The API is now available at **`http://localhost:8081`**

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8081 --workers 4
```

---

## API Documentation

FastAPI provides **interactive API documentation** out of the box:

- **Swagger UI:** http://localhost:8081/docs
- **ReDoc:** http://localhost:8081/redoc
- **OpenAPI JSON:** http://localhost:8081/openapi.json

Use these to explore and test API endpoints directly from your browser.

---

## Project Structure

```
TsenaAnaty/
├── alembic/                  # Database migrations
│   ├── versions/             # Migration files
│   └── env.py               # Alembic configuration
├── app/
│   ├── models/              # SQLAlchemy models (database schemas)
│   ├── schemas/             # Pydantic schemas (request/response models)
│   ├── crud/                # CRUD operations
│   ├── routers/             # API endpoint definitions
│   └── dependencies.py      # Shared dependencies (auth, DB session, etc.)
├── tests/                    # Test files
├── main.py                   # Application entry point
├── .env                      # Environment variables
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container configuration ✓
└── README.md               # This file
```

---

## Testing

Run automated tests:

```bash
pytest
```

Run tests with coverage report:

```bash
pytest --cov=app tests/
```

---

## Troubleshooting

### Database Connection Error

**Problem:** `sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError)`

**Solution:**
1. Verify database server is running
2. Check connection string in `.env`
3. Ensure database user has proper permissions
4. For MySQL: `mysql -u root -p -e "SHOW DATABASES;"`
5. For PostgreSQL: `psql -U postgres -l`

### Migration Error: "Target database is not up to date"

**Solution:**
```bash
alembic downgrade base  # Reset to initial state
alembic upgrade head    # Re-apply all migrations
```

### Port Already in Use

**Solution:**
```bash
# Change port in command:
uvicorn main:app --reload --host 0.0.0.0 --port 8082
```


## Docker Support

This project includes a **Dockerfile** and **docker-compose.yml** for containerized deployment.

### Docker Compose (Recommended)

Run the entire stack (backend + SQLite) with a single command:

```bash
docker compose up --build
```

The service will be available at `http://localhost:8081`.

### Manual Docker Build

Build the Docker image:

```bash
docker build -t tsenaanaty .
```

Run the container:

```bash
docker run -p 8081:8081 --env-file .env tsenaanaty
```

### Docker Environment

Ensure your `.env` file is properly configured for the container environment, particularly database connection strings.


---

## Environment Variables

Key variables in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `postgresql+psycopg2://user:pwd@localhost/db` |
| `SQLITE_DATABASE` | SQLite file path (SQLite only) | `project.db` |
| `SECRET_KEY` | Secret key for JWT tokens | `your-secret-key-here` |
| `API_V1_STR` | API version prefix | `/api/v1` |
| `ENVIRONMENT` | Deployment environment | `development` / `production` |

---

## Development Workflow

1. **Design Models** → Define entities in `app/models/`
2. **Create Migration** → `alembic revision --autogenerate -m "description"`
3. **Apply Migration** → `alembic upgrade head`
4. **Write Schemas** → Define request/response models in `app/schemas/`
5. **Implement CRUD** → Logic in `app/crud/`
6. **Create Endpoints** → Routers in `app/routers/`
7. **Test** → Run `pytest`
8. **Deploy** → Use Docker or native deployment

---

## API Response Format

All endpoints return JSON with a consistent structure:

**Success Response:**
```json
{
  "data": {"id": 1, "name": "Example"},
  "success": true
}
```

**Error Response:**
```json
{
  "detail": "Error message",
  "error_code": "FIELD_ERROR"
}
```

---

## Additional Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com
- **SQLAlchemy Docs:** https://docs.sqlalchemy.org
- **Alembic Docs:** https://alembic.sqlalchemy.org
- **Pytest Docs:** https://docs.pytest.org

---

**Generated:** TsenaAnaty FastAPI Backend  
**Last Updated:** 2026-06-07

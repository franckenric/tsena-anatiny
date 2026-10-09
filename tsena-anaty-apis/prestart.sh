#!/bin/bash
set -e

# Ensure critical scripts are executable (works with volume mounts)
chmod +x /app/run_tests.sh 2>/dev/null || echo "⚠️  Could not set executable permissions on run_tests.sh"

# Run tests if TESTING is enabled (from environment variable)
if [ "$TESTING" -eq 1 ]; then
    echo "🧪 Running tests (mandatory pre-launch check)..."
    if /app/run_tests.sh; then
        echo "✅ All tests passed - proceeding with startup"
    else
        echo "❌ Tests failed - aborting startup"
        exit 1
    fi
fi

# Normal startup procedure
echo "⚙️ Initializing service..."
python /app/backend_pre_start.py

echo "📜 Running migrations..."
alembic upgrade head

# Load initial data
echo "🌱 Loading initial data..."
python /app/initial_data.py

# Start with auto-reload only in development
if [ "$ENVIRONMENT" = "development" ]; then
    echo "🚀 Starting application with reload..."
    exec uvicorn main:app --host 0.0.0.0 --port 8084 --reload
else
    echo "🚀 Starting application..."
    exec uvicorn main:app --host 0.0.0.0 --port 8084
fi
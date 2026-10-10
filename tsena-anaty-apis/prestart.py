import os
import sys
import subprocess
from pathlib import Path


def run_command(command: list[str], description: str) -> None:
    print(f"[prestart] {description}...")
    result = subprocess.run(command)
    if result.returncode != 0:
        raise RuntimeError(f"{description} failed with exit code {result.returncode}")


def is_truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}



def run_tests() -> None:
    """Run tests using pytest directly from Python."""
    root = Path(__file__).resolve().parent
    test_db_path = root / "test.db"
    
    # Remove test.db if it exists
    if test_db_path.exists():
        print(f"[prestart] Removing {test_db_path}...")
        test_db_path.unlink()
    else:
        print("[prestart] test.db not found, nothing to remove.")
    
    print("[prestart] Running tests...")
    
    # Build pytest command
    pytest_cmd = [
        sys.executable, "-m", "pytest",
        "tests/",
        "-v"
    ]
    
    # Add coverage options only if pytest-cov is available
    pytest_cmd.extend(["--cov=app", "--cov-report=term"])
    print("[prestart] Running with coverage...")
    
    result = subprocess.run(pytest_cmd)
    
    if result.returncode != 0:
        print("[prestart] Tests failed, stopping.")
        sys.exit(1)
    
    print("[prestart] Tests passed!")


def main() -> None:
    root = Path(__file__).resolve().parent
    os.chdir(root)

    testing_enabled = is_truthy(os.getenv("TESTING"))
    environment = (os.getenv("ENVIRONMENT") or "").strip().lower()
    
    # Check if we should skip coverage
    skip_coverage = is_truthy(os.getenv("SKIP_COVERAGE"))

    if testing_enabled:
        print("[prestart] TESTING=1 → Running tests...")
        run_tests()
    else:
        print("[prestart] TESTING=0 → Tests skipped.")

    run_command([sys.executable, str(root / "backend_pre_start.py")], "Initializing service")
    run_command(["alembic", "upgrade", "head"], "Running migrations")
    run_command([sys.executable, str(root / "initial_data.py")], "Loading initial data")

    uvicorn_cmd = [
        sys.executable, "-m", "uvicorn", 
        "main:app", 
        "--host", "0.0.0.0", 
        "--port", os.getenv("PORT", "8081")
    ]
    
    if environment == "development":
        uvicorn_cmd.append("--reload")

    print("[prestart] Starting application...")
    os.execv(sys.executable, uvicorn_cmd)


if __name__ == "__main__":
    main()
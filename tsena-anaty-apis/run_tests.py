#!/usr/bin/env python3
"""
Standalone test runner script.
Usage: python run_tests.py
"""

import os
import sys
import subprocess
from pathlib import Path


def is_truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def main() -> None:
    root = Path(__file__).resolve().parent
    os.chdir(root)
    
    testing_enabled = is_truthy(os.getenv("TESTING"))
    
    if not testing_enabled:
        print("TESTING=0 → Tests skipped.")
        return
    
    print("TESTING=1 → Running tests...")
    
    test_db_path = root / "test.db"
    
    # Remove test.db if it exists
    if test_db_path.exists():
        print(f"Removing {test_db_path}...")
        test_db_path.unlink()
    else:
        print("test.db not found, nothing to remove.")
    
    print("Launching tests...")
    
    # Build pytest command
    pytest_cmd = [
        sys.executable, "-m", "pytest",
        "tests/",
        "--cov=app",
        "-v"
    ]
    
    result = subprocess.run(pytest_cmd)
    
    if result.returncode != 0:
        print("Tests failed, stopping.")
        sys.exit(1)
    
    print("Tests passed!")


if __name__ == "__main__":
    main()
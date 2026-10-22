"""Pytest configuration and environment setup."""

import sys
from pathlib import Path

# Ensure backend root is on Python module search path
backend_root = Path(__file__).parent.resolve()
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

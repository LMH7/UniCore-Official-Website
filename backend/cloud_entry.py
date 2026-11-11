"""Cloud Web-function entry; packaged as app.py at the archive root."""
import sys

from backend.__main__ import main


if __name__ == "__main__":
    if sys.version_info < (3, 12):
        raise SystemExit("Use a supported Python 3.12 runtime and the matching dependency bundle.")
    if "--host" not in sys.argv:
        sys.argv.extend(["--host", "0.0.0.0"])
    main()

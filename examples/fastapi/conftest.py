"""Before the tests: make sure the Cnamio SDK file (app/cnamio.py) is there, downloading it once if it is missing."""
from scripts.get_sdk import main as get_sdk

if get_sdk() != 0:
    raise SystemExit("The Cnamio SDK could not be downloaded: run python scripts/get_sdk.py")

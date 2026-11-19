"""What the routes do, framework-free: start a connection for a user's domain, read its status, handle the webhook."""
from __future__ import annotations

import json
import re
from typing import Any, Callable, Mapping, Optional, Tuple

from .cnamio import CnamioError, verify_webhook
from .cnamio_client import CnamioClient

Reply = Tuple[int, dict]
DOMAIN = re.compile(r"^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
JOB_ID = re.compile(r"^job_[0-9a-f-]{36}$")


def _failure(error: CnamioError) -> Reply:
    """Cnamio's errors as answers the page can show (never the raw upstream body)."""
    if error.status == 409:
        return 409, {"error": "records_conflict", "conflicts": error.conflicts or [], "message": "Existing DNS records are in the way; nothing was changed."}
    if error.status == 422:
        return 422, {"error": "provider_token_refused", "message": "The DNS provider refused the token. Add the records by hand instead."}
    if error.status in (429, 503):
        return 503, {"error": "try_again", "message": "Cnamio is busy; try again in a few seconds."}
    if error.status == 400:
        return 400, {"error": "invalid_request", "message": str(error)}
    return 502, {"error": "cnamio_unavailable", "message": f"Cnamio answered {error.status}."}


def connect_domain(client: CnamioClient, user_id: str, domain: Any, provider_token: Any = None) -> Reply:
    """Checks where the domain's DNS is, then connects it: with the user's provider API token when they gave one and the
    provider supports it, otherwise by returning the exact records to create (Cnamio watches propagation either way)."""
    name = domain.strip().lower().rstrip(".") if isinstance(domain, str) else ""
    if not DOMAIN.match(name):
        return 400, {"error": "invalid_domain", "message": "Type a domain such as shop.example.com."}
    try:
        records = client.records_for(user_id)
    except RuntimeError as error:
        return 500, {"error": "not_configured", "message": str(error)}
    # Jobs and webhooks carry your user id. A sandbox session has a user id of its own and refuses another one.
    owner = None if client.mode == "sandbox" else user_id
    try:
        check = client.cnamio.check_domain(name, records)
        token = provider_token.strip() if isinstance(provider_token, str) and provider_token.strip() else None
        if token and "api_token" in check.get("connectMethods", []):
            # Used for this call only: never store or log a provider token.
            job = client.cnamio.connect_automatic(name, records, token, user_id=owner)
            return 201, {"mode": client.mode, "domain": name, "provider": check["provider"], "setup": "automatic",
                         "jobId": job["job_id"], "status": job["status"], "records": check.get("records", [])}
        job = client.cnamio.connect(name, records, user_id=owner)
        return 201, {"mode": client.mode, "domain": name, "provider": check["provider"], "setup": "manual",
                     "automaticAvailable": "api_token" in check.get("connectMethods", []), "jobId": job["job_id"],
                     "status": job["status"], "records": job.get("records", []), "conflicts": check.get("recordConflicts") or []}
    except CnamioError as error:
        return _failure(error)


def connection_status(client: CnamioClient, job_id: Any) -> Reply:
    if not isinstance(job_id, str) or not JOB_ID.match(job_id):
        return 400, {"error": "invalid_job"}
    try:
        s = client.cnamio.status(job_id)
    except CnamioError as error:
        return _failure(error)
    return 200, {"jobId": s["job_id"], "domain": s["domain"], "status": s["status"], "connected": s["connected"], "health": s.get("health")}


def handle_webhook(raw: bytes, headers: Mapping[str, str], on_event: Callable[[dict], None], secret: Optional[str]) -> Reply:
    """The webhook is the source of truth: domain.added means every record is live. Verify the signature over the raw
    body first. Handle each event once (by event["id"]); answer 2xx only after storing the result."""
    if not secret:
        return 503, {"error": "webhook_secret_missing"}  # Cnamio retries later
    if not verify_webhook(raw, headers, secret):
        return 401, {"error": "bad_signature"}
    on_event(json.loads(raw))
    return 200, {"received": True}

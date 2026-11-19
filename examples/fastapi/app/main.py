"""Add custom domains to a SaaS with FastAPI and Cnamio. Runs on the sandbox without an account; set
CNAMIO_APPLICATION_ID and CNAMIO_SECRET to use your own application. See README.md."""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from .cnamio_client import CnamioClient, create_cnamio
from .domains import connect_domain, connection_status, handle_webhook

log = logging.getLogger("cnamio-example")
app = FastAPI(title="Custom domains (Cnamio example)")
PAGE = (Path(__file__).parent / "static" / "index.html").read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def get_client() -> CnamioClient:
    """One client per process, so the session (and the sandbox session) is reused across requests."""
    return create_cnamio()


def current_user() -> dict:
    # Replace with your own auth: every connection belongs to the signed-in user (echoed in jobs and webhooks).
    return {"id": "demo-user"}


def on_event(event: dict) -> None:
    # Idempotent by event["id"]. domain.added: mark event["domain"] connected for event["user_id"]; store it first.
    log.info("cnamio webhook %s %s", event.get("type"), event.get("domain"))


@app.get("/", response_class=HTMLResponse)
def page() -> str:
    return PAGE


@app.get("/api/mode")
def mode(client: CnamioClient = Depends(get_client)) -> dict:
    return {"mode": client.mode}


class DomainIn(BaseModel):
    domain: str = ""
    providerToken: str | None = None  # the user's DNS provider API token: used once, never stored or logged


# Plain `def` routes: the SDK uses blocking HTTP, and FastAPI runs these in its thread pool.
@app.post("/api/domains")
def start_connection(body: DomainIn, client: CnamioClient = Depends(get_client), user: dict = Depends(current_user)):
    status, answer = connect_domain(client, user["id"], body.domain, body.providerToken)
    return JSONResponse(answer, status_code=status)


@app.get("/api/domains/{job_id}")
def get_status(job_id: str, client: CnamioClient = Depends(get_client)):
    status, answer = connection_status(client, job_id)
    return JSONResponse(answer, status_code=status)


@app.post("/webhooks/cnamio")
async def webhook(request: Request):
    raw = await request.body()  # the raw body: the signature covers it byte for byte
    status, answer = handle_webhook(raw, request.headers, on_event, os.environ.get("CNAMIO_WEBHOOK_SECRET"))
    return JSONResponse(answer, status_code=status)

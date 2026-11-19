"""The app's Cnamio client: the server SDK with your credentials, or the Cnamio agent sandbox without them.

- CNAMIO_APPLICATION_ID and CNAMIO_SECRET set: the real test (or live) application.
- Not set: a 30-minute sandbox session from POST https://api.cnamio.com/v1/agent/sandbox, renewed when it expires.
  No account, nothing real read or written: any domain connects, conflict.<domain> has a record in the way,
  pending.<domain> never propagates. The sandbox has no webhooks and no management API.

The app code is the same in both modes: only how the SDK gets its session token changes (SandboxCnamio).
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Callable, Mapping, Optional

from .cnamio import Cnamio, records_for_user

DEFAULT_BASE_URL = "https://api.cnamio.com"
# utm_source tells Cnamio which channel the sandbox session came from (aggregated counts only).
SANDBOX_PATH = "/v1/agent/sandbox?utm_source=agent-kit"


class SandboxCnamio(Cnamio):
    """The SDK with its session request (POST /token with the secret) swapped for a sandbox session. The placeholder
    id and secret are never sent: the SDK asks create_session for every session it needs."""

    def __init__(self, base_url: str = DEFAULT_BASE_URL):
        super().__init__(application_id="app_sandbox", secret="not-used-in-sandbox", base_url=base_url)

    def create_session(self, user_id=None, dns_records=None, domain=None) -> dict:
        data = self._request("POST", SANDBOX_PATH, {"client": {"name": "cnamio-agent-kit"}})
        self.application_id = data["application_id"]
        return {"token": data["auth_token"], "applicationId": self.application_id, "expiresAt": int((time.time() + 1800) * 1000)}


@dataclass
class CnamioClient:
    mode: str  # "credentials" or "sandbox"
    cnamio: Cnamio
    records_for: Callable[[str], list]


def records_for(user_id: str, mode: str, env: Mapping[str, str]) -> list:
    """A CNAME to your hosting plus a TXT unique to the user, so nobody can claim a domain another user already pointed
    at you. In sandbox mode a fixed, non-secret key is used when none is set."""
    key = env.get("CNAMIO_OWNERSHIP_KEY") or ("sandbox-only-not-a-secret" if mode == "sandbox" else "")
    if not key:
        raise RuntimeError("Set CNAMIO_OWNERSHIP_KEY (any long random string of yours) in the server environment.")
    target = env.get("CUSTOM_DOMAIN_TARGET") or "customers.example-saas.com"
    return records_for_user(target=target, user_id=user_id, ownership_key=key, prefix="example-saas-verify")


def create_cnamio(env: Optional[Mapping[str, str]] = None) -> CnamioClient:
    env = os.environ if env is None else env
    base_url = (env.get("CNAMIO_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
    if env.get("CNAMIO_APPLICATION_ID") and env.get("CNAMIO_SECRET"):
        client = Cnamio(application_id=env["CNAMIO_APPLICATION_ID"], secret=env["CNAMIO_SECRET"], base_url=base_url)
        return CnamioClient("credentials", client, lambda user_id: records_for(user_id, "credentials", env))
    return CnamioClient("sandbox", SandboxCnamio(base_url), lambda user_id: records_for(user_id, "sandbox", env))

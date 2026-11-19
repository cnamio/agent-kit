"""Offline tests: the SDK's HTTP calls go to a fake Cnamio, so nothing leaves the machine.
`python scripts/smoke.py` runs against the real sandbox."""
import hashlib
import hmac
import io
import json
import time
import urllib.error
import uuid

import pytest
from fastapi.testclient import TestClient

from app import main
from app.cnamio_client import create_cnamio


class FakeCnamio:
    """Stands in for urllib.request.urlopen, which the SDK uses."""

    def __init__(self):
        self.calls = []

    def __call__(self, request, timeout=None):
        url = request.full_url.replace("https://api.cnamio.com", "")
        path = url.split("?")[0]
        body = json.loads(request.data) if request.data else None
        headers = {k.lower(): v for k, v in request.header_items()}
        self.calls.append({"method": request.get_method(), "url": url, "headers": headers, "body": body})
        if path == "/v1/agent/sandbox":
            return self._json(201, {"application_id": "app_sandbox_test", "auth_token": "sandbox-session", "expires_at": "2030-01-01T00:00:00Z"})
        if path == "/token":
            return self._json(200, {"auth_token": "app-session"})
        if path == "/checkdomain":
            return self._json(200, {"domain": body["domain"], "provider": "sandbox", "connectMethods": ["api_token"], "records": body["dnsRecords"], "recordConflicts": []})
        if path == "/connect":
            if "userId" in body and any(c["url"].startswith("/v1/agent/sandbox") for c in self.calls):
                return self._json(403, {"message": "Not allowed for this session."})
            return self._json(201, {"job_id": f"job_{uuid.uuid4()}", "status": "pending", "domain": body["domain"], "records": body["dnsRecords"]})
        if path == "/connect/automatic":
            if body["providerToken"] == "invalid":
                return self._json(422, {"message": "The DNS provider rejected the access token."})
            return self._json(201, {"job_id": f"job_{uuid.uuid4()}", "status": "pending", "domain": body["domain"], "written": True})
        if path.startswith("/connect/job_") and path.endswith("/status"):
            return self._json(200, {"job_id": path.split("/")[2], "domain": "shop.example.com", "status": "completed", "connected": True, "health": "healthy"})
        return self._json(404, {"message": "Not found."})

    @staticmethod
    def _json(status, payload):
        raw = json.dumps(payload).encode()
        if status >= 400:
            raise urllib.error.HTTPError("https://api.cnamio.com", status, "error", {}, io.BytesIO(raw))
        return io.BytesIO(raw)  # a context manager with read(), like the real response


@pytest.fixture
def fake(monkeypatch):
    f = FakeCnamio()
    monkeypatch.setattr("urllib.request.urlopen", f)
    return f


def client_for(env):
    main.app.dependency_overrides[main.get_client] = lambda c=create_cnamio(env): c
    return TestClient(main.app)


@pytest.fixture(autouse=True)
def reset():
    yield
    main.app.dependency_overrides.clear()


def test_sandbox_without_credentials(fake):
    http = client_for({})
    assert http.get("/api/mode").json() == {"mode": "sandbox"}
    r = http.post("/api/domains", json={"domain": "Shop.Example.com"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["domain"] == "shop.example.com"
    assert [x["type"] for x in body["records"]] == ["CNAME", "TXT"]  # plus the per-user ownership TXT
    assert fake.calls[0]["url"] == "/v1/agent/sandbox?utm_source=agent-kit"
    assert not any(c["url"] == "/token" for c in fake.calls)
    check = next(c for c in fake.calls if c["url"] == "/checkdomain")
    assert check["headers"]["authorization"] == "Bearer sandbox-session"
    assert check["headers"]["applicationid"] == "app_sandbox_test"
    assert "not-used-in-sandbox" not in json.dumps(fake.calls)
    assert http.get(f"/api/domains/{body['jobId']}").json()["connected"] is True


def test_credentials_use_your_application(fake):
    env = {"CNAMIO_APPLICATION_ID": "app_test_example", "CNAMIO_SECRET": "example-secret-for-tests"}
    assert client_for(env).post("/api/domains", json={"domain": "links.example.org"}).json()["error"] == "not_configured"
    assert fake.calls == []
    r = client_for({**env, "CNAMIO_OWNERSHIP_KEY": "k" * 32}).post("/api/domains", json={"domain": "links.example.org"})
    assert r.status_code == 201
    assert next(c for c in fake.calls if c["url"] == "/token")["body"]["applicationId"] == "app_test_example"
    assert next(c for c in fake.calls if c["url"] == "/connect")["body"]["userId"] == "demo-user"


def test_provider_token_and_bad_input(fake):
    http = client_for({})
    assert http.post("/api/domains", json={"domain": "shop.example.com", "providerToken": "user-token"}).json()["setup"] == "automatic"
    refused = http.post("/api/domains", json={"domain": "shop.example.com", "providerToken": "invalid"})
    assert refused.status_code == 422
    before = len(fake.calls)
    assert http.post("/api/domains", json={"domain": "not a domain"}).status_code == 400
    assert http.get("/api/domains/nope").status_code == 400
    assert len(fake.calls) == before


def test_webhook_signature(monkeypatch):
    secret = "whsec-example-for-tests"
    monkeypatch.setenv("CNAMIO_WEBHOOK_SECRET", secret)
    raw = json.dumps({"id": "evt_1", "type": "domain.added", "domain": "shop.example.com", "user_id": "demo-user"}).encode()
    ts = str(int(time.time()))
    signature = "sha256=" + hmac.new(secret.encode(), ts.encode() + b"." + raw, hashlib.sha256).hexdigest()
    http = TestClient(main.app)
    headers = {"content-type": "application/json", "cnamio-timestamp": ts}
    assert http.post("/webhooks/cnamio", content=raw, headers={**headers, "cnamio-signature": signature}).status_code == 200
    assert http.post("/webhooks/cnamio", content=raw, headers={**headers, "cnamio-signature": "sha256=00"}).status_code == 401
    monkeypatch.delenv("CNAMIO_WEBHOOK_SECRET")
    assert http.post("/webhooks/cnamio", content=raw, headers=headers).status_code == 503

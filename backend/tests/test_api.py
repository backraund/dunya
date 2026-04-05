"""API smoke tests (requires MongoDB + MinIO reachable with same env as production)."""

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("MONGO_URI", "mongodb://127.0.0.1:27017")
os.environ.setdefault("MINIO_ENDPOINT", "http://127.0.0.1:9000")

from main import app  # noqa: E402

client = TestClient(app)


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert "Dünyam" in r.json().get("message", "")


def test_public_meta_404_for_unknown():
    r = client.get("/api/public/nonexistent_user_xyz/meta")
    assert r.status_code == 404

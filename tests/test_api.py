import sys
from pathlib import Path

# Ensure src is on path so we can import app
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from fastapi.testclient import TestClient
import pytest

from app import app

client = TestClient(app)


def test_get_activities_structure():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # expect at least one known activity
    assert "Basketball Team" in data


def test_signup_and_unregister_cycle():
    activity = "Test Club"
    email = "testuser@example.com"

    # create a temporary activity in-memory for testing
    # (mutates the app.activities in src.app)
    from app import activities

    activities[activity] = {
        "description": "Temporary",
        "schedule": "Now",
        "max_participants": 5,
        "participants": [],
    }

    # signup should succeed
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert email in activities[activity]["participants"]

    # duplicate signup should fail
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400

    # unregister should succeed
    r3 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r3.status_code == 200
    assert email not in activities[activity]["participants"]

    # unregister non-existing should return 404
    r4 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r4.status_code == 404


def test_signup_invalid_activity():
    r = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert r.status_code == 404

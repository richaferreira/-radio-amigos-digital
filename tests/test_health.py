import os
os.environ["DATABASE_URL"]="sqlite:///:memory:"
from backend import create_app

def test_health():
    app=create_app(); app.config["TESTING"]=True
    with app.test_client() as c:
        r=c.get("/health")
        assert r.status_code==200
        assert r.get_json()["status"]=="ok"

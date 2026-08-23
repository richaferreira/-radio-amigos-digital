from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt

ROLE_LEVEL={"listener":1,"dj":2,"moderator":3,"admin":4}

def role_required(min_role):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            role=get_jwt().get("role","listener")
            if ROLE_LEVEL.get(role,0) < ROLE_LEVEL[min_role]:
                return jsonify({"error":"Permissão insuficiente"}),403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

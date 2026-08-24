from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from .extensions import db
from .models import User

ROLE_LEVEL = {"listener": 1, "dj": 2, "moderator": 3, "admin": 4}


def role_required(min_role):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            identity = get_jwt_identity()
            try:
                user = db.session.get(User, int(identity)) if identity else None
            except (TypeError, ValueError):
                user = None
            if not user or user.is_banned:
                return jsonify({"error": "Conta sem acesso"}), 403
            if ROLE_LEVEL.get(user.role, 0) < ROLE_LEVEL[min_role]:
                return jsonify({"error": "Permissão insuficiente"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

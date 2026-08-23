from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from ..extensions import db, limiter
from ..models import User

bp=Blueprint("auth",__name__)

@bp.post("/login")
@limiter.limit("10 per minute")
def login():
    data=request.get_json(silent=True) or {}
    username=(data.get("username") or "").strip()
    password=data.get("password") or ""
    user=User.query.filter_by(username=username).first()
    if not user or not user.check_password(password) or user.is_banned:
        return jsonify({"error":"Usuário ou senha inválidos"}),401
    token=create_access_token(identity=str(user.id), additional_claims={"role":user.role,"name":user.display_name})
    return {"access_token":token,"user":user.to_dict()}

@bp.post("/register")
@limiter.limit("5 per hour")
def register():
    data=request.get_json(silent=True) or {}
    username=(data.get("username") or "").strip()[:40]
    email=(data.get("email") or "").strip()[:120] or None
    password=data.get("password") or ""
    display=(data.get("display_name") or username).strip()[:80]
    if len(username)<3 or len(password)<8:
        return jsonify({"error":"Usuário deve ter 3+ caracteres e senha 8+"}),400
    if User.query.filter_by(username=username).first() or (email and User.query.filter_by(email=email).first()):
        return jsonify({"error":"Usuário/e-mail já cadastrado"}),409
    u=User(username=username,email=email,display_name=display,role="listener")
    u.set_password(password); db.session.add(u); db.session.commit()
    token=create_access_token(identity=str(u.id), additional_claims={"role":u.role,"name":u.display_name})
    return {"access_token":token,"user":u.to_dict()},201

@bp.get("/me")
@jwt_required()
def me():
    u=db.session.get(User,int(get_jwt_identity()))
    return u.to_dict() if u else ({"error":"Não encontrado"},404)

@bp.post("/change-password")
@jwt_required()
def change_password():
    data=request.get_json(silent=True) or {}; current=data.get("current_password") or ""; new=data.get("new_password") or ""
    u=db.session.get(User,int(get_jwt_identity()))
    if not u or not u.check_password(current): return jsonify({"error":"Senha atual inválida"}),400
    if len(new)<8:return jsonify({"error":"A nova senha precisa ter pelo menos 8 caracteres"}),400
    u.set_password(new);db.session.commit();return {"ok":True}

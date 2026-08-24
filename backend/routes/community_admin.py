from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from ..extensions import db
from ..models import (
    User,
    BadgeDefinition,
    UserBadge,
    UserChatStyle,
    StaffNotification,
    AuditLog,
)
from ..security import role_required

bp = Blueprint("community_admin", __name__)

FONT_STYLES = {"default", "bold", "mono", "serif", "rounded", "italic"}
TEXT_COLORS = {"default", "pink", "cyan", "purple", "gold", "green", "white"}
TEXT_EFFECTS = {"none", "glow", "neon", "shadow", "pulse"}
BADGE_COLORS = {"pink", "cyan", "purple", "gold", "green", "red", "blue"}

DEFAULT_BADGES = [
    ("Resenha Ativa", "🔥", "pink", "Participa e movimenta o chat da rádio."),
    ("Top Ouvinte", "🎧", "cyan", "Ouvinte presente e participativo."),
    ("Veterano RAD", "⭐", "gold", "Faz parte da comunidade há bastante tempo."),
    ("Apoiador", "💜", "purple", "Apoia e fortalece a Rádio Amigos Digital."),
    ("VIP", "💎", "blue", "Membro VIP da comunidade."),
    ("Lenda RAD", "👑", "gold", "Reconhecimento especial da equipe."),
]


def actor():
    identity = get_jwt_identity()
    return db.session.get(User, int(identity)) if identity else None


def audit(action, details=""):
    current = actor()
    db.session.add(AuditLog(user_id=current.id if current else None, action=action, details=details))


def ensure_badges():
    if BadgeDefinition.query.count():
        return
    for name, icon, color, description in DEFAULT_BADGES:
        db.session.add(BadgeDefinition(name=name, icon=icon, color=color, description=description, active=True))
    db.session.commit()


def can_moderate(target):
    current = actor()
    if not current or not target:
        return False
    if current.role == "admin":
        return True
    return current.role == "moderator" and target.role != "admin"


@bp.get("/badges")
@role_required("moderator")
def badges():
    ensure_badges()
    return [b.to_dict() for b in BadgeDefinition.query.order_by(BadgeDefinition.name).all()]


@bp.post("/badges")
@role_required("admin")
def create_badge():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()[:60]
    icon = (data.get("icon") or "🏅").strip()[:16]
    color = (data.get("color") or "purple").strip().lower()
    description = (data.get("description") or "").strip()[:180]
    if not name:
        return jsonify({"error": "Informe o nome do emblema"}), 400
    if BadgeDefinition.query.filter_by(name=name).first():
        return jsonify({"error": "Já existe um emblema com esse nome"}), 409
    if color not in BADGE_COLORS:
        color = "purple"
    badge = BadgeDefinition(name=name, icon=icon or "🏅", color=color, description=description, active=True)
    db.session.add(badge)
    audit("badge.create", f"name={name}")
    db.session.commit()
    return badge.to_dict(), 201


@bp.post("/users/<int:user_id>/badges/<int:badge_id>")
@role_required("moderator")
def award_badge(user_id, badge_id):
    user = db.session.get(User, user_id)
    badge = db.session.get(BadgeDefinition, badge_id)
    if not user or not badge or not badge.active:
        return jsonify({"error": "Usuário ou emblema não encontrado"}), 404
    current = actor()
    existing = UserBadge.query.filter_by(user_id=user.id, badge_id=badge.id).first()
    if not existing:
        db.session.add(UserBadge(user_id=user.id, badge_id=badge.id, awarded_by=current.id if current else None))
        audit("badge.award", f"user_id={user.id}; badge={badge.name}")
        db.session.commit()
    return user.to_dict()


@bp.delete("/users/<int:user_id>/badges/<int:badge_id>")
@role_required("moderator")
def remove_badge(user_id, badge_id):
    user = db.session.get(User, user_id)
    link = UserBadge.query.filter_by(user_id=user_id, badge_id=badge_id).first()
    if not user or not link:
        return jsonify({"error": "Emblema não atribuído"}), 404
    db.session.delete(link)
    audit("badge.remove", f"user_id={user_id}; badge_id={badge_id}")
    db.session.commit()
    return user.to_dict()


@bp.put("/users/<int:user_id>/style")
@role_required("moderator")
def update_style(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    data = request.get_json(silent=True) or {}
    font_style = (data.get("font_style") or "default").lower()
    text_color = (data.get("text_color") or "default").lower()
    effect = (data.get("effect") or "none").lower()
    if font_style not in FONT_STYLES or text_color not in TEXT_COLORS or effect not in TEXT_EFFECTS:
        return jsonify({"error": "Estilo de chat inválido"}), 400
    current = actor()
    style = UserChatStyle.query.filter_by(user_id=user.id).first()
    if not style:
        style = UserChatStyle(user_id=user.id)
        db.session.add(style)
    style.font_style = font_style
    style.text_color = text_color
    style.effect = effect
    style.updated_by = current.id if current else None
    audit("chat.style", f"user_id={user.id}; font={font_style}; color={text_color}; effect={effect}")
    db.session.commit()
    return user.to_dict()


@bp.patch("/users/<int:user_id>/moderation")
@role_required("moderator")
def moderate_user(user_id):
    target = db.session.get(User, user_id)
    current = actor()
    if not target:
        return jsonify({"error": "Usuário não encontrado"}), 404
    if not can_moderate(target):
        return jsonify({"error": "Você não pode moderar este usuário"}), 403
    data = request.get_json(silent=True) or {}
    if target.id == current.id and (data.get("is_banned") is True or data.get("is_muted") is True):
        return jsonify({"error": "Você não pode banir ou mutar a própria conta"}), 400
    if "is_muted" in data:
        target.is_muted = bool(data["is_muted"])
    if "is_banned" in data:
        target.is_banned = bool(data["is_banned"])
    audit("user.moderate", f"user_id={target.id}; muted={target.is_muted}; banned={target.is_banned}")
    db.session.commit()
    return target.to_dict()


@bp.get("/notifications")
@role_required("moderator")
def notifications():
    current = actor()
    rows = StaffNotification.query.filter_by(recipient_user_id=current.id).order_by(StaffNotification.id.desc()).limit(80).all()
    unread = sum(1 for row in rows if not row.is_read)
    return {"unread": unread, "items": [row.to_dict() for row in rows]}


@bp.patch("/notifications/<int:notification_id>/read")
@role_required("moderator")
def read_notification(notification_id):
    current = actor()
    item = StaffNotification.query.filter_by(id=notification_id, recipient_user_id=current.id).first()
    if not item:
        return jsonify({"error": "Notificação não encontrada"}), 404
    item.is_read = True
    db.session.commit()
    return item.to_dict()


@bp.post("/notifications/read-all")
@role_required("moderator")
def read_all_notifications():
    current = actor()
    StaffNotification.query.filter_by(recipient_user_id=current.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return {"ok": True}

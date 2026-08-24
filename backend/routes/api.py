from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from sqlalchemy import func
from ..extensions import db, limiter, socketio
from ..models import (
    ChatMessage,
    SongRequest,
    Dedication,
    Program,
    Poll,
    PollOption,
    PlayedTrack,
    User,
    Advertisement,
    StaffNotification,
)
from ..services import fetch_stream_status

bp = Blueprint("api", __name__)


@bp.get("/stream/status")
def stream_status():
    return fetch_stream_status()


@bp.get("/chat/history")
def chat_history():
    rows = ChatMessage.query.filter_by(deleted=False).order_by(ChatMessage.id.desc()).limit(80).all()
    return [x.to_dict() for x in reversed(rows)]


def _request_user():
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            return db.session.get(User, int(identity))
    except Exception:
        return None
    return None


def _notify_staff(kind, title, body, link="/admin"):
    staff = User.query.filter(User.role.in_(["moderator", "admin"]), User.is_banned.is_(False)).all()
    for user in staff:
        db.session.add(
            StaffNotification(
                recipient_user_id=user.id,
                kind=kind,
                title=title[:140],
                body=body[:500],
                link=link[:255],
            )
        )


@bp.post("/chat/song-request")
@limiter.limit("5 per 10 minutes")
def chat_song_request():
    data = request.get_json(silent=True) or {}
    user = _request_user()
    requester = (user.display_name if user else (data.get("requester") or "Ouvinte")).strip()[:80]
    artist = (data.get("artist") or "").strip()[:120]
    song = (data.get("song") or "").strip()[:120]
    note = (data.get("note") or "").strip()[:250]
    if not artist or not song:
        return jsonify({"error": "Informe artista e música"}), 400
    if user and user.is_banned:
        return jsonify({"error": "Usuário banido."}), 403

    item = SongRequest(requester=requester, artist=artist, song=song, note=note)
    db.session.add(item)
    db.session.flush()

    text = f"🎵 {requester} pediu: {song} — {artist}. @ADM @MOD"
    if note:
        text += f" · {note[:120]}"
    chat_message = ChatMessage(
        user_id=user.id if user else None,
        nickname="🎵 Pedido musical",
        role="system",
        message=text[:500],
    )
    db.session.add(chat_message)
    db.session.flush()
    _notify_staff(
        "song_request",
        "Novo pedido musical no chat",
        f"{requester} pediu {song} — {artist}" + (f" · {note}" if note else ""),
        "/admin#requests",
    )
    db.session.commit()
    socketio.emit("request_updated", item.to_dict())
    socketio.emit("chat_message", chat_message.to_dict())
    return {"request": item.to_dict(), "message": chat_message.to_dict()}, 201


@bp.get("/requests")
def requests_list():
    rows = SongRequest.query.filter(SongRequest.status.in_(["pending", "approved"])).order_by(SongRequest.id.desc()).limit(50).all()
    return [x.to_dict() for x in rows]


@bp.post("/requests")
@limiter.limit("5 per 10 minutes")
def request_song():
    data = request.get_json(silent=True) or {}
    requester = (data.get("requester") or "").strip()[:80]
    artist = (data.get("artist") or "").strip()[:120]
    song = (data.get("song") or "").strip()[:120]
    if not all([requester, artist, song]):
        return jsonify({"error": "Preencha nome, artista e música"}), 400
    item = SongRequest(requester=requester, artist=artist, song=song, note=(data.get("note") or "").strip()[:250])
    db.session.add(item)
    _notify_staff("song_request", "Novo pedido musical", f"{requester} pediu {song} — {artist}", "/admin#requests")
    db.session.commit()
    socketio.emit("request_updated", item.to_dict())
    return item.to_dict(), 201


@bp.post("/dedications")
@limiter.limit("5 per 10 minutes")
def dedication():
    data = request.get_json(silent=True) or {}
    sender = (data.get("sender") or "").strip()[:80]
    recipient = (data.get("recipient") or "").strip()[:80]
    message = (data.get("message") or "").strip()[:300]
    if not all([sender, recipient, message]):
        return jsonify({"error": "Preencha todos os campos"}), 400
    item = Dedication(sender=sender, recipient=recipient, message=message)
    db.session.add(item)
    db.session.commit()
    return item.to_dict(), 201


@bp.get("/programs")
def programs():
    return [p.to_dict() for p in Program.query.filter_by(active=True).order_by(Program.weekday, Program.start_time).all()]


@bp.get("/djs")
def djs():
    return [u.to_dict() for u in User.query.filter(User.role.in_(["dj", "moderator", "admin"]), User.bio != "").all()]


@bp.get("/polls/active")
def active_poll():
    p = Poll.query.filter_by(active=True).order_by(Poll.id.desc()).first()
    return p.to_dict() if p else {"active": False}


@bp.post("/polls/<int:poll_id>/vote")
@limiter.limit("10 per hour")
def vote(poll_id):
    data = request.get_json(silent=True) or {}
    option_id = data.get("option_id")
    p = db.session.get(Poll, poll_id)
    o = db.session.get(PollOption, option_id) if option_id else None
    if not p or not p.active or not o or o.poll_id != p.id:
        return jsonify({"error": "Voto inválido"}), 400
    o.votes += 1
    db.session.commit()
    socketio.emit("poll_updated", p.to_dict())
    return p.to_dict()


@bp.get("/ranking")
def ranking():
    played = db.session.query(PlayedTrack.artist, PlayedTrack.title, func.count(PlayedTrack.id).label("plays")).group_by(PlayedTrack.artist, PlayedTrack.title).order_by(func.count(PlayedTrack.id).desc()).limit(10).all()
    requested = db.session.query(SongRequest.artist, SongRequest.song, func.count(SongRequest.id).label("requests")).group_by(SongRequest.artist, SongRequest.song).order_by(func.count(SongRequest.id).desc()).limit(10).all()
    return {
        "played": [{"artist": a, "song": t, "count": c} for a, t, c in played],
        "requested": [{"artist": a, "song": s, "count": c} for a, s, c in requested],
    }


@bp.get("/history")
def history():
    return [t.to_dict() for t in PlayedTrack.query.order_by(PlayedTrack.played_at.desc()).limit(12).all()]


@bp.get("/ads")
def ads():
    return [a.to_dict() for a in Advertisement.query.filter_by(active=True).all()]

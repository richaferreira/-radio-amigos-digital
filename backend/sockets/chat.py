from time import time
from collections import defaultdict, deque
from flask import request
from flask_socketio import emit
from flask_jwt_extended import decode_token
from ..extensions import db
from ..models import ChatMessage, ChatReaction, User, StaffNotification
from ..services import clean_chat_text

windows = defaultdict(deque)
REACTIONS = {"👍", "❤️", "🔥", "😂", "👏", "😍", "🎉", "💯", "😎", "🤯", "🎧", "🎵"}
STAFF_TAGS = {"@adm", "@admin", "@mod", "@moderador", "@moderadora", "@equipe"}


def allowed(sid):
    now = time()
    q = windows[sid]
    while q and q[0] < now - 10:
        q.popleft()
    if len(q) >= 6:
        return False
    q.append(now)
    return True


def notify_mentions(message, author_name):
    text = (message.message or "").casefold()
    staff = User.query.filter(User.role.in_(["moderator", "admin"]), User.is_banned.is_(False)).all()
    notify_all_staff = any(tag in text for tag in STAFF_TAGS)
    for user in staff:
        exact_mention = f"@{user.username.casefold()}" in text
        if not notify_all_staff and not exact_mention:
            continue
        if message.user_id and message.user_id == user.id:
            continue
        db.session.add(
            StaffNotification(
                recipient_user_id=user.id,
                kind="mention",
                title="Você foi mencionado no chat",
                body=f"{author_name}: {(message.message or '')[:220]}",
                link="/admin#chat",
            )
        )


def register_socket_handlers(socketio):
    @socketio.on("connect")
    def on_connect():
        emit("connected", {"ok": True})

    @socketio.on("disconnect")
    def on_disconnect():
        windows.pop(request.sid, None)

    @socketio.on("chat_message")
    def on_chat(data):
        if not allowed(request.sid):
            emit("chat_error", {"error": "Muitas mensagens. Aguarde alguns segundos."})
            return

        data = data or {}
        nickname = (data.get("nickname") or "Ouvinte").strip()[:60]
        text = clean_chat_text(data.get("message"))
        token = data.get("token")
        if not text:
            return

        role = "listener"
        user_id = None
        user = None
        if token:
            try:
                payload = decode_token(token)
                user_id = int(payload["sub"])
                user = db.session.get(User, user_id)
                if user:
                    if user.is_banned:
                        emit("chat_error", {"error": "Usuário banido."})
                        return
                    if user.is_muted:
                        emit("chat_error", {"error": "Usuário mutado."})
                        return
                    nickname = user.display_name
                    role = user.role
            except Exception:
                user_id = None
                user = None

        message = ChatMessage(user_id=user_id, nickname=nickname, role=role, message=text)
        db.session.add(message)
        db.session.flush()
        notify_mentions(message, nickname)
        db.session.commit()
        socketio.emit("chat_message", message.to_dict())

    @socketio.on("react_message")
    def on_react(data):
        data = data or {}
        mid = data.get("message_id")
        emoji = data.get("emoji")
        if emoji not in REACTIONS:
            return
        try:
            mid = int(mid)
        except (TypeError, ValueError):
            return
        message = db.session.get(ChatMessage, mid)
        if not message or message.deleted:
            return
        reaction = ChatReaction.query.filter_by(message_id=message.id, emoji=emoji).first()
        if not reaction:
            reaction = ChatReaction(message_id=message.id, emoji=emoji, count=0)
            db.session.add(reaction)
        reaction.count += 1
        db.session.commit()
        socketio.emit(
            "reaction_updated",
            {
                "message_id": message.id,
                "reactions": {x.emoji: x.count for x in message.reactions},
            },
        )

from time import time
from collections import defaultdict, deque
from flask import request
from flask_socketio import emit
from flask_jwt_extended import decode_token
from ..extensions import db
from ..models import ChatMessage, ChatReaction, User
from ..services import clean_chat_text

windows=defaultdict(deque)

def allowed(sid):
    now=time(); q=windows[sid]
    while q and q[0] < now-10:q.popleft()
    if len(q)>=6:return False
    q.append(now); return True

def register_socket_handlers(socketio):
    @socketio.on("connect")
    def on_connect(): emit("connected",{"ok":True})

    @socketio.on("disconnect")
    def on_disconnect(): windows.pop(request.sid,None)

    @socketio.on("chat_message")
    def on_chat(data):
        if not allowed(request.sid):
            emit("chat_error",{"error":"Muitas mensagens. Aguarde alguns segundos."}); return
        data=data or {}; nickname=(data.get("nickname") or "Ouvinte").strip()[:60]; text=clean_chat_text(data.get("message")); token=data.get("token")
        if not text:return
        role="listener"; user_id=None
        if token:
            try:
                payload=decode_token(token); user_id=int(payload["sub"]); user=db.session.get(User,user_id)
                if user:
                    if user.is_banned: emit("chat_error",{"error":"Usuário banido."}); return
                    if user.is_muted: emit("chat_error",{"error":"Usuário mutado."}); return
                    nickname=user.display_name; role=user.role
            except Exception: pass
        m=ChatMessage(user_id=user_id,nickname=nickname,role=role,message=text); db.session.add(m); db.session.commit(); socketio.emit("chat_message",m.to_dict())

    @socketio.on("react_message")
    def on_react(data):
        data=data or {}; mid=data.get("message_id"); emoji=data.get("emoji")
        if emoji not in {"👍","❤️","🔥","😂"}: return
        m=db.session.get(ChatMessage,int(mid)) if mid else None
        if not m or m.deleted:return
        r=ChatReaction.query.filter_by(message_id=m.id,emoji=emoji).first()
        if not r:r=ChatReaction(message_id=m.id,emoji=emoji,count=0);db.session.add(r)
        r.count+=1;db.session.commit();socketio.emit("reaction_updated",{"message_id":m.id,"reactions":{x.emoji:x.count for x in m.reactions}})

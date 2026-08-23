from flask import Blueprint, request, jsonify
from sqlalchemy import func
from ..extensions import db, limiter, socketio
from ..models import ChatMessage, SongRequest, Dedication, Program, Poll, PollOption, PlayedTrack, User, Advertisement
from ..services import fetch_stream_status

bp=Blueprint("api",__name__)

@bp.get("/stream/status")
def stream_status(): return fetch_stream_status()

@bp.get("/chat/history")
def chat_history():
    rows=ChatMessage.query.filter_by(deleted=False).order_by(ChatMessage.id.desc()).limit(50).all()
    return [x.to_dict() for x in reversed(rows)]

@bp.get("/requests")
def requests_list():
    rows=SongRequest.query.filter(SongRequest.status.in_(["pending","approved"])).order_by(SongRequest.id.desc()).limit(50).all()
    return [x.to_dict() for x in rows]

@bp.post("/requests")
@limiter.limit("5 per 10 minutes")
def request_song():
    data=request.get_json(silent=True) or {}
    requester=(data.get("requester") or "").strip()[:80]
    artist=(data.get("artist") or "").strip()[:120]
    song=(data.get("song") or "").strip()[:120]
    if not all([requester,artist,song]): return jsonify({"error":"Preencha nome, artista e música"}),400
    item=SongRequest(requester=requester,artist=artist,song=song,note=(data.get("note") or "").strip()[:250])
    db.session.add(item); db.session.commit(); socketio.emit("request_updated",item.to_dict())
    return item.to_dict(),201

@bp.post("/dedications")
@limiter.limit("5 per 10 minutes")
def dedication():
    data=request.get_json(silent=True) or {}
    sender=(data.get("sender") or "").strip()[:80]; recipient=(data.get("recipient") or "").strip()[:80]; message=(data.get("message") or "").strip()[:300]
    if not all([sender,recipient,message]): return jsonify({"error":"Preencha todos os campos"}),400
    d=Dedication(sender=sender,recipient=recipient,message=message); db.session.add(d); db.session.commit()
    return d.to_dict(),201

@bp.get("/programs")
def programs(): return [p.to_dict() for p in Program.query.filter_by(active=True).order_by(Program.weekday,Program.start_time).all()]

@bp.get("/djs")
def djs(): return [u.to_dict() for u in User.query.filter(User.role.in_(["dj","moderator","admin"]), User.bio != "").all()]

@bp.get("/polls/active")
def active_poll():
    p=Poll.query.filter_by(active=True).order_by(Poll.id.desc()).first()
    return p.to_dict() if p else {"active":False}

@bp.post("/polls/<int:poll_id>/vote")
@limiter.limit("10 per hour")
def vote(poll_id):
    data=request.get_json(silent=True) or {}; option_id=data.get("option_id")
    p=db.session.get(Poll,poll_id)
    o=db.session.get(PollOption,option_id) if option_id else None
    if not p or not p.active or not o or o.poll_id!=p.id: return jsonify({"error":"Voto inválido"}),400
    o.votes += 1; db.session.commit(); socketio.emit("poll_updated",p.to_dict())
    return p.to_dict()

@bp.get("/ranking")
def ranking():
    played=db.session.query(PlayedTrack.artist,PlayedTrack.title,func.count(PlayedTrack.id).label("plays")).group_by(PlayedTrack.artist,PlayedTrack.title).order_by(func.count(PlayedTrack.id).desc()).limit(10).all()
    requested=db.session.query(SongRequest.artist,SongRequest.song,func.count(SongRequest.id).label("requests")).group_by(SongRequest.artist,SongRequest.song).order_by(func.count(SongRequest.id).desc()).limit(10).all()
    return {"played":[{"artist":a,"song":t,"count":c} for a,t,c in played],"requested":[{"artist":a,"song":s,"count":c} for a,s,c in requested]}

@bp.get("/history")
def history(): return [t.to_dict() for t in PlayedTrack.query.order_by(PlayedTrack.played_at.desc()).limit(12).all()]

@bp.get("/ads")
def ads(): return [a.to_dict() for a in Advertisement.query.filter_by(active=True).all()]

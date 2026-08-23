from flask import Blueprint, request, jsonify, current_app, Response, send_file
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import func
from werkzeug.utils import secure_filename
from reportlab.pdfgen import canvas
from io import BytesIO, StringIO
import csv, os, uuid
from ..extensions import db, socketio
from ..models import User, ChatMessage, SongRequest, Dedication, Program, Poll, PollOption, MediaAsset, Advertisement, SiteSetting, AuditLog, AudienceSample
from ..security import role_required

bp=Blueprint("admin",__name__)

def audit(action,details=""):
    uid=int(get_jwt_identity()) if get_jwt_identity() else None
    db.session.add(AuditLog(user_id=uid,action=action,details=details)); db.session.commit()

@bp.get("/dashboard")
@role_required("dj")
def dashboard():
    current=AudienceSample.query.order_by(AudienceSample.id.desc()).first()
    peak=db.session.query(func.max(AudienceSample.listeners)).scalar() or 0
    return {"ouvintes_agora":current.listeners if current else 0,"pico_audiencia":peak,"usuarios":User.query.count(),"mensagens_chat":ChatMessage.query.filter_by(deleted=False).count(),"pedidos_pendentes":SongRequest.query.filter_by(status="pending").count(),"dedicatorias_pendentes":Dedication.query.filter_by(status="pending").count()}

@bp.get("/users")
@role_required("moderator")
def users(): return [u.to_dict() for u in User.query.order_by(User.id.desc()).all()]

@bp.patch("/users/<int:user_id>")
@role_required("admin")
def update_user(user_id):
    u=db.session.get(User,user_id)
    if not u:return jsonify({"error":"Usuário não encontrado"}),404
    data=request.get_json(silent=True) or {}
    for f in ["role","is_muted","is_banned","display_name","bio","photo_url","social_url"]:
        if f in data:setattr(u,f,data[f])
    db.session.commit(); audit("user.update",f"user_id={user_id}")
    return u.to_dict()

@bp.get("/chat")
@role_required("moderator")
def chat(): return [m.to_dict() for m in ChatMessage.query.order_by(ChatMessage.id.desc()).limit(100).all()]

@bp.delete("/chat/<int:message_id>")
@role_required("moderator")
def delete_chat(message_id):
    m=db.session.get(ChatMessage,message_id)
    if not m:return jsonify({"error":"Mensagem não encontrada"}),404
    m.deleted=True; db.session.commit(); audit("chat.delete",f"message_id={message_id}"); socketio.emit("message_deleted",{"id":message_id})
    return {"ok":True}

@bp.get("/requests")
@role_required("dj")
def reqs(): return [x.to_dict() for x in SongRequest.query.order_by(SongRequest.id.desc()).limit(100).all()]

@bp.patch("/requests/<int:item_id>")
@role_required("dj")
def req_update(item_id):
    x=db.session.get(SongRequest,item_id)
    if not x:return jsonify({"error":"Não encontrado"}),404
    status=(request.get_json(silent=True) or {}).get("status")
    if status not in ["pending","approved","played","rejected"]:return jsonify({"error":"Status inválido"}),400
    x.status=status; db.session.commit(); audit("request.status",f"id={item_id}; status={status}"); socketio.emit("request_updated",x.to_dict())
    return x.to_dict()

@bp.get("/dedications")
@role_required("dj")
def dedications(): return [x.to_dict() for x in Dedication.query.order_by(Dedication.id.desc()).limit(100).all()]

@bp.patch("/dedications/<int:item_id>")
@role_required("dj")
def ded_update(item_id):
    x=db.session.get(Dedication,item_id)
    if not x:return jsonify({"error":"Não encontrado"}),404
    status=(request.get_json(silent=True) or {}).get("status")
    if status not in ["pending","approved","read","rejected"]:return jsonify({"error":"Status inválido"}),400
    x.status=status; db.session.commit(); audit("dedication.status",f"id={item_id}; status={status}")
    return x.to_dict()

@bp.get("/programs")
@role_required("dj")
def programs(): return [p.to_dict() for p in Program.query.order_by(Program.weekday,Program.start_time).all()]

@bp.post("/programs")
@role_required("admin")
def create_program():
    d=request.get_json(silent=True) or {}
    required=[d.get("title"),d.get("host_name"),d.get("start_time"),d.get("end_time")]
    if not all(required) or d.get("weekday") is None:return jsonify({"error":"Dados obrigatórios ausentes"}),400
    p=Program(title=d["title"][:120],description=(d.get("description") or ""),weekday=int(d["weekday"]),start_time=d["start_time"][:5],end_time=d["end_time"][:5],host_name=d["host_name"][:100],cover_url=(d.get("cover_url") or "")[:255],active=bool(d.get("active",True)))
    db.session.add(p); db.session.commit(); audit("program.create",f"id={p.id}"); return p.to_dict(),201

@bp.patch("/programs/<int:program_id>")
@role_required("admin")
def update_program(program_id):
    p=db.session.get(Program,program_id)
    if not p:return jsonify({"error":"Programa não encontrado"}),404
    d=request.get_json(silent=True) or {}
    for f in ["title","description","weekday","start_time","end_time","host_name","cover_url","active"]:
        if f in d:setattr(p,f,d[f])
    db.session.commit(); audit("program.update",f"id={program_id}"); return p.to_dict()

@bp.delete("/programs/<int:program_id>")
@role_required("admin")
def delete_program(program_id):
    p=db.session.get(Program,program_id)
    if not p:return jsonify({"error":"Programa não encontrado"}),404
    db.session.delete(p); db.session.commit(); audit("program.delete",f"id={program_id}"); return {"ok":True}

@bp.post("/polls")
@role_required("admin")
def create_poll():
    d=request.get_json(silent=True) or {}; question=(d.get("question") or "").strip(); opts=d.get("options") or []
    if not question or len(opts)<2:return jsonify({"error":"Informe pergunta e pelo menos 2 opções"}),400
    Poll.query.filter_by(active=True).update({"active":False})
    p=Poll(question=question[:220],active=True); db.session.add(p); db.session.flush()
    for label in opts[:8]: db.session.add(PollOption(poll_id=p.id,label=str(label)[:160]))
    db.session.commit(); audit("poll.create",f"id={p.id}"); socketio.emit("poll_updated",p.to_dict()); return p.to_dict(),201

@bp.patch("/polls/<int:poll_id>/close")
@role_required("admin")
def close_poll(poll_id):
    p=db.session.get(Poll,poll_id)
    if not p:return jsonify({"error":"Enquete não encontrada"}),404
    p.active=False; db.session.commit(); audit("poll.close",f"id={poll_id}"); socketio.emit("poll_updated",{"active":False}); return p.to_dict()

@bp.post("/media")
@role_required("admin")
def upload_media():
    f=request.files.get("file")
    if not f or not f.filename:return jsonify({"error":"Arquivo ausente"}),400
    ext=os.path.splitext(secure_filename(f.filename))[1].lower()
    if ext not in {".png",".jpg",".jpeg",".webp",".gif",".mp3",".ogg"}:return jsonify({"error":"Formato não permitido"}),400
    filename=f"{uuid.uuid4().hex}{ext}"; os.makedirs(current_app.config["UPLOAD_FOLDER"],exist_ok=True); f.save(os.path.join(current_app.config["UPLOAD_FOLDER"],filename))
    a=MediaAsset(name=(request.form.get("name") or f.filename)[:120],filename=filename,kind="audio" if ext in {".mp3",".ogg"} else "image"); db.session.add(a); db.session.commit(); audit("media.upload",filename); return a.to_dict(),201

@bp.get("/media")
@role_required("admin")
def media(): return [m.to_dict() for m in MediaAsset.query.order_by(MediaAsset.id.desc()).all()]

@bp.get("/ads")
@role_required("admin")
def ads(): return [a.to_dict() for a in Advertisement.query.all()]

@bp.post("/ads")
@role_required("admin")
def create_ad():
    d=request.get_json(silent=True) or {}
    if not d.get("title"):return jsonify({"error":"Título obrigatório"}),400
    a=Advertisement(title=d["title"][:120],kind=(d.get("kind") or "banner")[:20],media_url=(d.get("media_url") or "")[:255],target_url=(d.get("target_url") or "")[:255],active=bool(d.get("active",True))); db.session.add(a); db.session.commit(); audit("ad.create",f"id={a.id}"); return a.to_dict(),201

@bp.patch("/ads/<int:ad_id>")
@role_required("admin")
def update_ad(ad_id):
    a=db.session.get(Advertisement,ad_id)
    if not a:return jsonify({"error":"Anúncio não encontrado"}),404
    d=request.get_json(silent=True) or {}
    for f in ["title","kind","media_url","target_url","active"]:
        if f in d:setattr(a,f,d[f])
    db.session.commit(); audit("ad.update",f"id={ad_id}"); return a.to_dict()

@bp.get("/settings")
@role_required("admin")
def settings(): return {s.key:s.value for s in SiteSetting.query.all()}

@bp.put("/settings")
@role_required("admin")
def save_settings():
    d=request.get_json(silent=True) or {}
    for k,v in d.items():
        s=SiteSetting.query.filter_by(key=str(k)[:80]).first() or SiteSetting(key=str(k)[:80]); s.value=str(v)[:3000]; db.session.add(s)
    db.session.commit(); audit("settings.update",",".join(d.keys())); return {"ok":True}

@bp.get("/audit")
@role_required("admin")
def audit_list(): return [x.to_dict() for x in AuditLog.query.order_by(AuditLog.id.desc()).limit(200).all()]

@bp.get("/reports/summary.csv")
@role_required("admin")
def csv_report():
    out=StringIO(); w=csv.writer(out); w.writerow(["metrica","valor"]); w.writerow(["usuarios",User.query.count()]); w.writerow(["mensagens_chat",ChatMessage.query.count()]); w.writerow(["pedidos",SongRequest.query.count()]); w.writerow(["dedicatorias",Dedication.query.count()])
    return Response(out.getvalue(),mimetype="text/csv",headers={"Content-Disposition":"attachment; filename=relatorio-radio.csv"})

@bp.get("/reports/summary.pdf")
@role_required("admin")
def pdf_report():
    bio=BytesIO(); c=canvas.Canvas(bio); c.setFont("Helvetica-Bold",16); c.drawString(72,790,"Rádio Amigos Digital - Relatorio"); c.setFont("Helvetica",11)
    rows=[("Usuarios",User.query.count()),("Mensagens de chat",ChatMessage.query.count()),("Pedidos",SongRequest.query.count()),("Dedicatorias",Dedication.query.count())]
    y=750
    for name,val in rows:c.drawString(72,y,f"{name}: {val}"); y-=24
    c.save(); bio.seek(0); return send_file(bio,mimetype="application/pdf",as_attachment=True,download_name="relatorio-radio.pdf")

@bp.delete("/ads/<int:ad_id>")
@role_required("admin")
def delete_ad(ad_id):
    a=db.session.get(Advertisement,ad_id)
    if not a:return jsonify({"error":"Anúncio não encontrado"}),404
    db.session.delete(a);db.session.commit();audit("ad.delete",f"id={ad_id}");return {"ok":True}

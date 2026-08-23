from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db


def now_utc():
    return datetime.now(timezone.utc)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(40), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="listener")
    display_name = db.Column(db.String(80), nullable=False)
    bio = db.Column(db.Text, default="")
    photo_url = db.Column(db.String(255), default="")
    social_url = db.Column(db.String(255), default="")
    is_muted = db.Column(db.Boolean, default=False)
    is_banned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)

    def set_password(self, password): self.password_hash = generate_password_hash(password)
    def check_password(self, password): return check_password_hash(self.password_hash, password)
    def to_dict(self):
        return {"id":self.id,"username":self.username,"email":self.email,"role":self.role,"display_name":self.display_name,"bio":self.bio,"photo_url":self.photo_url,"social_url":self.social_url,"is_muted":self.is_muted,"is_banned":self.is_banned}

class ChatMessage(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    user_id=db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    nickname=db.Column(db.String(60), nullable=False)
    role=db.Column(db.String(20), default="listener")
    message=db.Column(db.String(500), nullable=False)
    deleted=db.Column(db.Boolean, default=False)
    created_at=db.Column(db.DateTime(timezone=True), default=now_utc, index=True)
    reactions=db.relationship("ChatReaction", backref="message", cascade="all, delete-orphan", lazy=True)
    def to_dict(self): return {"id":self.id,"user_id":self.user_id,"nickname":self.nickname,"role":self.role,"message":self.message,"deleted":self.deleted,"created_at":self.created_at.isoformat(),"reactions":{r.emoji:r.count for r in self.reactions}}

class ChatReaction(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    message_id=db.Column(db.Integer, db.ForeignKey("chat_message.id"), nullable=False)
    emoji=db.Column(db.String(12), nullable=False)
    count=db.Column(db.Integer, default=0)
    __table_args__=(db.UniqueConstraint("message_id","emoji",name="uq_chat_reaction"),)

class SongRequest(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    requester=db.Column(db.String(80), nullable=False)
    artist=db.Column(db.String(120), nullable=False)
    song=db.Column(db.String(120), nullable=False)
    note=db.Column(db.String(250), default="")
    status=db.Column(db.String(20), default="pending", index=True)
    created_at=db.Column(db.DateTime(timezone=True), default=now_utc)
    def to_dict(self): return {"id":self.id,"requester":self.requester,"artist":self.artist,"song":self.song,"note":self.note,"status":self.status,"created_at":self.created_at.isoformat()}

class Dedication(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    sender=db.Column(db.String(80), nullable=False)
    recipient=db.Column(db.String(80), nullable=False)
    message=db.Column(db.String(300), nullable=False)
    status=db.Column(db.String(20), default="pending", index=True)
    created_at=db.Column(db.DateTime(timezone=True), default=now_utc)
    def to_dict(self): return {"id":self.id,"sender":self.sender,"recipient":self.recipient,"message":self.message,"status":self.status,"created_at":self.created_at.isoformat()}

class Program(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    title=db.Column(db.String(120), nullable=False)
    description=db.Column(db.Text, default="")
    weekday=db.Column(db.Integer, nullable=False)
    start_time=db.Column(db.String(5), nullable=False)
    end_time=db.Column(db.String(5), nullable=False)
    host_name=db.Column(db.String(100), nullable=False)
    cover_url=db.Column(db.String(255), default="")
    active=db.Column(db.Boolean, default=True)
    def to_dict(self): return {"id":self.id,"title":self.title,"description":self.description,"weekday":self.weekday,"start_time":self.start_time,"end_time":self.end_time,"host_name":self.host_name,"cover_url":self.cover_url,"active":self.active}

class Poll(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    question=db.Column(db.String(220), nullable=False)
    active=db.Column(db.Boolean, default=True)
    created_at=db.Column(db.DateTime(timezone=True), default=now_utc)
    options=db.relationship("PollOption", backref="poll", cascade="all, delete-orphan", lazy=True)
    def to_dict(self): return {"id":self.id,"question":self.question,"active":self.active,"options":[o.to_dict() for o in self.options]}

class PollOption(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    poll_id=db.Column(db.Integer, db.ForeignKey("poll.id"), nullable=False)
    label=db.Column(db.String(160), nullable=False)
    votes=db.Column(db.Integer, default=0)
    def to_dict(self): return {"id":self.id,"label":self.label,"votes":self.votes}

class PlayedTrack(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    artist=db.Column(db.String(120), nullable=False)
    title=db.Column(db.String(160), nullable=False)
    cover_url=db.Column(db.String(255), default="")
    played_at=db.Column(db.DateTime(timezone=True), default=now_utc, index=True)
    def to_dict(self): return {"id":self.id,"artist":self.artist,"title":self.title,"cover_url":self.cover_url,"played_at":self.played_at.isoformat()}

class MediaAsset(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    name=db.Column(db.String(120), nullable=False)
    filename=db.Column(db.String(255), nullable=False)
    kind=db.Column(db.String(30), default="image")
    created_at=db.Column(db.DateTime(timezone=True), default=now_utc)
    def to_dict(self): return {"id":self.id,"name":self.name,"filename":self.filename,"kind":self.kind,"url":f"/uploads/{self.filename}"}

class Advertisement(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    title=db.Column(db.String(120), nullable=False)
    kind=db.Column(db.String(20), nullable=False, default="banner")
    media_url=db.Column(db.String(255), default="")
    target_url=db.Column(db.String(255), default="")
    active=db.Column(db.Boolean, default=True)
    def to_dict(self): return {"id":self.id,"title":self.title,"kind":self.kind,"media_url":self.media_url,"target_url":self.target_url,"active":self.active}

class SiteSetting(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    key=db.Column(db.String(80), unique=True, nullable=False)
    value=db.Column(db.Text, default="")

class AuditLog(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    user_id=db.Column(db.Integer, nullable=True)
    action=db.Column(db.String(120), nullable=False)
    details=db.Column(db.Text, default="")
    created_at=db.Column(db.DateTime(timezone=True), default=now_utc, index=True)
    def to_dict(self): return {"id":self.id,"user_id":self.user_id,"action":self.action,"details":self.details,"created_at":self.created_at.isoformat()}

class AudienceSample(db.Model):
    id=db.Column(db.Integer, primary_key=True)
    listeners=db.Column(db.Integer, default=0)
    sampled_at=db.Column(db.DateTime(timezone=True), default=now_utc, index=True)

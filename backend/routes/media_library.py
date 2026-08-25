import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from sqlalchemy import desc
from werkzeug.utils import secure_filename

from ..extensions import db, limiter
from ..security import role_required
from ..models import AuditLog

bp = Blueprint("media_library", __name__)

MUSIC_EXTENSIONS = {".mp3", ".ogg", ".wav", ".flac", ".m4a", ".aac"}
ALBUM_EXTENSIONS = {".zip"}
COVER_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_EXTENSIONS = MUSIC_EXTENSIONS | ALBUM_EXTENSIONS
CHUNK_SIZE = 5 * 1024 * 1024
MAX_MEDIA_SIZE = 1024 * 1024 * 1024
MAX_COVER_SIZE = 5 * 1024 * 1024


class DownloadMedia(db.Model):
    __tablename__ = "download_media"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(180), nullable=False)
    artist = db.Column(db.String(160), default="")
    album = db.Column(db.String(160), default="")
    description = db.Column(db.Text, default="")
    kind = db.Column(db.String(20), nullable=False, default="music", index=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    cover_filename = db.Column(db.String(255), default="")
    file_size = db.Column(db.BigInteger, default=0)
    download_count = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self):
        suffix = Path(self.filename).suffix.lower()
        return {
            "id": self.id,
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "description": self.description,
            "kind": self.kind,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_size": int(self.file_size or 0),
            "download_count": int(self.download_count or 0),
            "active": bool(self.active),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "cover_url": f"/uploads/media_library/covers/{self.cover_filename}" if self.cover_filename else "/static/img/logo-rad.svg",
            "preview_url": f"/uploads/media_library/files/{self.filename}" if suffix in MUSIC_EXTENSIONS else "",
            "download_url": f"/api/media/{self.id}/download",
        }


def _paths():
    base = Path(current_app.config["UPLOAD_FOLDER"])
    files = base / "media_library" / "files"
    covers = base / "media_library" / "covers"
    chunks = base / "media_library" / ".chunks"
    files.mkdir(parents=True, exist_ok=True)
    covers.mkdir(parents=True, exist_ok=True)
    chunks.mkdir(parents=True, exist_ok=True)
    return files, covers, chunks


def _safe_upload_id(value):
    value = (value or "").strip().lower()
    if len(value) != 32 or any(ch not in "0123456789abcdef" for ch in value):
        return None
    return value


def _audit(action, details=""):
    try:
        from flask_jwt_extended import get_jwt_identity
        identity = get_jwt_identity()
        uid = int(identity) if identity else None
    except Exception:
        uid = None
    db.session.add(AuditLog(user_id=uid, action=action[:120], details=details[:1000]))


@bp.get("/")
def public_media():
    rows = DownloadMedia.query.filter_by(active=True).order_by(desc(DownloadMedia.created_at), desc(DownloadMedia.id)).all()
    return [item.to_dict() for item in rows]


@bp.get("/<int:item_id>/download")
@limiter.limit("40 per minute")
def download_media(item_id):
    item = db.session.get(DownloadMedia, item_id)
    if not item or not item.active:
        return jsonify({"error": "Arquivo não encontrado"}), 404
    files, _, _ = _paths()
    path = files / item.filename
    if not path.is_file():
        return jsonify({"error": "Arquivo indisponível no servidor"}), 404
    item.download_count = int(item.download_count or 0) + 1
    db.session.commit()
    return send_from_directory(str(files), item.filename, as_attachment=True, download_name=item.original_filename)


@bp.get("/admin")
@role_required("admin")
def admin_media_list():
    rows = DownloadMedia.query.order_by(desc(DownloadMedia.created_at), desc(DownloadMedia.id)).all()
    return [item.to_dict() for item in rows]


@bp.post("/admin/init")
@role_required("admin")
def init_upload():
    data = request.get_json(silent=True) or {}
    original = secure_filename(data.get("filename") or "")
    suffix = Path(original).suffix.lower()
    try:
        expected_size = int(data.get("size") or 0)
    except (TypeError, ValueError):
        expected_size = 0
    if not original or suffix not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Formato não permitido. Use MP3, OGG, WAV, FLAC, M4A, AAC ou ZIP."}), 400
    if expected_size <= 0 or expected_size > MAX_MEDIA_SIZE:
        return jsonify({"error": "Arquivo inválido ou maior que 1 GB."}), 400

    _, _, chunks = _paths()
    upload_id = uuid.uuid4().hex
    folder = chunks / upload_id
    folder.mkdir(parents=True, exist_ok=False)
    kind = "album" if suffix in ALBUM_EXTENSIONS else "music"
    meta = {
        "filename": original,
        "size": expected_size,
        "suffix": suffix,
        "title": (data.get("title") or Path(original).stem).strip()[:180],
        "artist": (data.get("artist") or "").strip()[:160],
        "album": (data.get("album") or "").strip()[:160],
        "description": (data.get("description") or "").strip()[:2000],
        "kind": kind,
    }
    (folder / "meta.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return {"upload_id": upload_id, "chunk_size": CHUNK_SIZE, "kind": kind}


@bp.post("/admin/chunk/<upload_id>")
@role_required("admin")
def upload_chunk(upload_id):
    upload_id = _safe_upload_id(upload_id)
    if not upload_id:
        return jsonify({"error": "Upload inválido"}), 400
    try:
        index = int(request.args.get("index", "-1"))
    except ValueError:
        index = -1
    if index < 0 or index > 10000:
        return jsonify({"error": "Parte inválida"}), 400

    _, _, chunks = _paths()
    folder = chunks / upload_id
    if not folder.is_dir() or not (folder / "meta.json").is_file():
        return jsonify({"error": "Upload expirado ou inexistente"}), 404
    data = request.get_data(cache=False)
    if not data or len(data) > CHUNK_SIZE + 64 * 1024:
        return jsonify({"error": "Parte vazia ou grande demais"}), 413
    (folder / f"part-{index:06d}").write_bytes(data)
    return {"ok": True, "index": index, "received": len(data)}


@bp.post("/admin/complete/<upload_id>")
@role_required("admin")
def complete_upload(upload_id):
    upload_id = _safe_upload_id(upload_id)
    if not upload_id:
        return jsonify({"error": "Upload inválido"}), 400
    files, _, chunks = _paths()
    folder = chunks / upload_id
    meta_path = folder / "meta.json"
    if not meta_path.is_file():
        return jsonify({"error": "Upload expirado ou inexistente"}), 404
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    parts = sorted(folder.glob("part-*"))
    if not parts:
        return jsonify({"error": "Nenhuma parte recebida"}), 400

    final_name = f"{uuid.uuid4().hex}{meta['suffix']}"
    temp_path = files / f".{final_name}.part"
    final_path = files / final_name
    written = 0
    try:
        with temp_path.open("wb") as output:
            for part in parts:
                with part.open("rb") as source:
                    shutil.copyfileobj(source, output, length=1024 * 1024)
                written += part.stat().st_size
        if written != int(meta["size"]):
            temp_path.unlink(missing_ok=True)
            return jsonify({"error": f"Upload incompleto: esperado {meta['size']} bytes e recebido {written}."}), 400
        os.replace(temp_path, final_path)
        item = DownloadMedia(
            title=meta["title"] or Path(meta["filename"]).stem,
            artist=meta.get("artist", ""),
            album=meta.get("album", ""),
            description=meta.get("description", ""),
            kind=meta.get("kind", "music"),
            filename=final_name,
            original_filename=meta["filename"],
            file_size=written,
            active=True,
        )
        db.session.add(item)
        db.session.flush()
        _audit("download_media.upload", f"id={item.id}; file={item.original_filename}; bytes={written}")
        db.session.commit()
        return item.to_dict(), 201
    finally:
        shutil.rmtree(folder, ignore_errors=True)
        temp_path.unlink(missing_ok=True)


@bp.post("/admin/<int:item_id>/cover")
@role_required("admin")
def upload_cover(item_id):
    item = db.session.get(DownloadMedia, item_id)
    if not item:
        return jsonify({"error": "Mídia não encontrada"}), 404
    cover = request.files.get("cover")
    if not cover or not cover.filename:
        return jsonify({"error": "Capa ausente"}), 400
    clean = secure_filename(cover.filename)
    suffix = Path(clean).suffix.lower()
    if suffix not in COVER_EXTENSIONS:
        return jsonify({"error": "Capa deve ser PNG, JPG, JPEG ou WEBP."}), 400
    cover.stream.seek(0, os.SEEK_END)
    size = cover.stream.tell()
    cover.stream.seek(0)
    if size <= 0 or size > MAX_COVER_SIZE:
        return jsonify({"error": "A capa deve ter no máximo 5 MB."}), 400

    _, covers, _ = _paths()
    if item.cover_filename:
        (covers / item.cover_filename).unlink(missing_ok=True)
    filename = f"{uuid.uuid4().hex}{suffix}"
    cover.save(covers / filename)
    item.cover_filename = filename
    _audit("download_media.cover", f"id={item.id}")
    db.session.commit()
    return item.to_dict()


@bp.patch("/admin/<int:item_id>")
@role_required("admin")
def update_media(item_id):
    item = db.session.get(DownloadMedia, item_id)
    if not item:
        return jsonify({"error": "Mídia não encontrada"}), 404
    data = request.get_json(silent=True) or {}
    if "title" in data:
        item.title = str(data["title"]).strip()[:180] or item.title
    if "artist" in data:
        item.artist = str(data["artist"]).strip()[:160]
    if "album" in data:
        item.album = str(data["album"]).strip()[:160]
    if "description" in data:
        item.description = str(data["description"]).strip()[:2000]
    if "active" in data:
        item.active = bool(data["active"])
    _audit("download_media.update", f"id={item.id}")
    db.session.commit()
    return item.to_dict()


@bp.delete("/admin/<int:item_id>")
@role_required("admin")
def delete_media(item_id):
    item = db.session.get(DownloadMedia, item_id)
    if not item:
        return jsonify({"error": "Mídia não encontrada"}), 404
    files, covers, _ = _paths()
    (files / item.filename).unlink(missing_ok=True)
    if item.cover_filename:
        (covers / item.cover_filename).unlink(missing_ok=True)
    _audit("download_media.delete", f"id={item.id}; file={item.original_filename}")
    db.session.delete(item)
    db.session.commit()
    return {"ok": True}

import requests
from flask import current_app

BAD_WORDS={"porra","caralho","fdp","puta","merda"}

def clean_chat_text(text):
    text=" ".join((text or "").strip().split())[:500]
    words=[]
    for w in text.split():
        words.append("***" if w.lower() in BAD_WORDS else w)
    return " ".join(words)

def fetch_stream_status():
    stream_url=current_app.config.get("STREAM_URL","")
    status_url=current_app.config.get("STREAM_STATUS_URL","")
    base={"configured":bool(stream_url),"stream_url":stream_url,"listeners":0,"live":False,"mode":"automatic","now_playing":None}
    if not status_url:
        return base
    try:
        r=requests.get(status_url, timeout=4)
        r.raise_for_status(); data=r.json()
        # Compatibilidade principal com API nowplaying do AzuraCast.
        np=data.get("now_playing",{}) if isinstance(data,dict) else {}
        song=np.get("song",{}) or {}
        listeners=(data.get("listeners",{}) or {}).get("current",0)
        live=(data.get("live",{}) or {}).get("is_live",False)
        result={**base,"listeners":listeners,"live":live,"mode":"live" if live else "automatic","now_playing":{"artist":song.get("artist",""),"title":song.get("title",""),"cover_url":song.get("art","")}}
        try:
            from .extensions import db
            from .models import PlayedTrack, AudienceSample
            db.session.add(AudienceSample(listeners=int(listeners or 0)))
            artist=(song.get("artist") or "").strip(); title=(song.get("title") or "").strip()
            last=PlayedTrack.query.order_by(PlayedTrack.id.desc()).first()
            if title and (not last or last.title!=title or last.artist!=artist):
                db.session.add(PlayedTrack(artist=artist or "Desconhecido",title=title,cover_url=song.get("art","") or ""))
            db.session.commit()
        except Exception:
            db.session.rollback()
        return result
    except Exception:
        return base

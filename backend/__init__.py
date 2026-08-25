from flask import Flask, render_template, send_from_directory, request
from .config import Config
from .extensions import db, socketio, jwt, limiter


def create_app():
    app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")
    app.config.from_object(Config)
    db.init_app(app)
    socketio_options = {"async_mode": "threading"}
    redis_url = app.config.get("REDIS_URL", "")
    if redis_url.startswith("redis://"):
        socketio_options["message_queue"] = redis_url
    socketio.init_app(app, **socketio_options)
    jwt.init_app(app)
    limiter.init_app(app)

    from .routes.auth import bp as auth_bp
    from .routes.api import bp as api_bp
    from .routes.admin import bp as admin_bp
    from .routes.community_admin import bp as community_admin_bp
    from .routes.media_library import bp as media_library_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(community_admin_bp, url_prefix="/api/admin/community")
    app.register_blueprint(media_library_bp, url_prefix="/api/media")

    from .sockets.chat import register_socket_handlers
    register_socket_handlers(socketio)

    @app.get("/")
    def home():
        return render_template("index.html")

    @app.get("/admin")
    def admin_page():
        return render_template("admin.html")

    @app.get("/politica-de-privacidade")
    def privacy():
        return render_template("privacy.html")

    @app.get("/termos-de-uso")
    def terms():
        return render_template("terms.html")

    @app.get("/uploads/<path:filename>")
    def uploads(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.get("/health")
    def health():
        return {"status": "ok", "service": app.config["SITE_NAME"]}

    @app.get("/robots.txt")
    def robots():
        sitemap_url = app.config["BASE_URL"].rstrip("/") + "/sitemap.xml"
        return f"User-agent: *\nAllow: /\nSitemap: {sitemap_url}\n", 200, {"Content-Type": "text/plain; charset=utf-8"}

    @app.get("/sitemap.xml")
    def sitemap():
        base = app.config["BASE_URL"].rstrip("/")
        pages = ["/", "/politica-de-privacidade", "/termos-de-uso"]
        items = "".join(f"<url><loc>{base}{page}</loc></url>" for page in pages)
        xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>'
        return xml, 200, {"Content-Type": "application/xml; charset=utf-8"}

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if request.path.startswith("/static/js/") or request.path.endswith("/hero-radio.svg") or request.path.endswith("/hero-radio-real.webp"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

    with app.app_context():
        db.create_all()
    return app

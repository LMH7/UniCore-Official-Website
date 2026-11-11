"""Versioned, read-only Flask API. The site and API share a generated snapshot."""

import copy
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from uuid import uuid4

from flask import Flask, Response, g, request, send_from_directory
from werkzeug.exceptions import HTTPException

from .validation import canonical, validate_snapshot

DEFAULT_ASSET_BASE = "https://lmh7.github.io/UniCore-Official-Website/"
DEFAULT_ORIGINS = "https://lmh7.github.io,http://127.0.0.1:4173,http://127.0.0.1:4174"


def asset_base(value):
    if not isinstance(value, str) or re.search(r"[\s\\]", value):
        raise ValueError("Invalid PUBLIC_ASSET_BASE")
    parts = urlsplit(value)
    if (parts.scheme != "https" and not (parts.scheme == "http" and parts.hostname in ("127.0.0.1", "localhost"))) or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:
        raise ValueError("PUBLIC_ASSET_BASE must be an HTTPS directory URL (HTTP loopback is allowed for local preview)")
    parts.port  # Reject invalid port numbers while validating configuration.
    return value.rstrip("/") + "/"


def origins(value):
    items = [item.strip() for item in value.split(",") if item.strip()]
    if not items or "*" in items:
        raise ValueError("ALLOWED_ORIGINS must list exact frontend origins")
    for item in items:
        if re.search(r"[\s\\]", item):
            raise ValueError("Invalid ALLOWED_ORIGINS entry")
        p = urlsplit(item)
        if p.scheme not in ("http", "https") or not p.hostname or p.path or p.query or p.fragment or p.username or p.password:
            raise ValueError("ALLOWED_ORIGINS entries are origins, without paths or trailing slashes")
        p.port
        if p.scheme == "http" and p.hostname not in ("localhost", "127.0.0.1"):
            raise ValueError("Non-local frontend origins require HTTPS")
    return set(items)


def public_images(snapshot, base):
    result = copy.deepcopy(snapshot)
    for product in result["products"]:
        product["image"] = urljoin(base, product["image"])
    content = result["content"]
    for field in ("logo", "qrImage"):
        if content[field]:
            content[field] = urljoin(base, content[field])
    for contact in content["contacts"]:
        if contact["qrImage"]:
            contact["qrImage"] = urljoin(base, contact["qrImage"])
    return result


def create_app(config=None):
    app = Flask(__name__, static_folder=None)
    app.config.from_mapping(
        SNAPSHOT_PATH=os.environ.get("CONTENT_SNAPSHOT", str(Path(__file__).with_name("data") / "snapshot.json")),
        PUBLIC_ASSET_BASE=os.environ.get("PUBLIC_ASSET_BASE"),
        ALLOWED_ORIGINS=os.environ.get("ALLOWED_ORIGINS", DEFAULT_ORIGINS),
        SERVE_PREVIEW=False,
        SITE_ROOT=str(Path(__file__).parent.parent / "site"),
        MAX_CONTENT_LENGTH=16384,
    )
    if config:
        app.config.update(config)
    allowed = origins(app.config["ALLOWED_ORIGINS"])
    with open(app.config["SNAPSHOT_PATH"], encoding="utf-8") as handle:
        snapshot = validate_snapshot(json.load(handle))
    base = asset_base(app.config["PUBLIC_ASSET_BASE"] or snapshot.get("assetBase", DEFAULT_ASSET_BASE))
    data = public_images(snapshot, base)
    version = snapshot["version"]
    app.config["CONTENT_VERSION"] = version
    bodies = {
        key: canonical({"data": data[key], "meta": {"version": version, "apiVersion": "v1"}})
        for key in ("products", "content")
    }

    def reply(value, status=200, cache=False):
        body = value if isinstance(value, str) else canonical(value)
        response = Response(body, status=status, content_type="application/json; charset=utf-8")
        response.headers["Cache-Control"] = "public, max-age=60, must-revalidate" if cache else "no-store"
        if cache:
            response.set_etag(hashlib.sha256(body.encode("utf-8")).hexdigest())
            response.make_conditional(request)
        return response

    @app.before_request
    def identify():
        g.request_id = uuid4().hex

    @app.after_request
    def response_headers(response):
        response.headers["X-Request-ID"] = g.get("request_id", "")
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Content-Version"] = version
        response.headers.setdefault("Cache-Control", "no-store")
        origin = request.headers.get("Origin")
        response.vary.add("Origin")
        if origin in allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Accept, Content-Type, If-None-Match"
            response.headers["Access-Control-Expose-Headers"] = "ETag, X-Content-Version, X-Request-ID"
            response.headers["Access-Control-Max-Age"] = "600"
        if not app.config["SERVE_PREVIEW"] or request.path.startswith("/api/") or response.status_code >= 400:
            app.logger.info("request_id=%s method=%s path=%s status=%s", g.get("request_id"), request.method, request.path, response.status_code)
        return response

    @app.errorhandler(HTTPException)
    def http_error(error):
        messages = {404: "接口不存在", 405: "此接口只允许读取", 413: "请求过大"}
        response = reply({"error": {"code": error.name.upper().replace(" ", "_"), "message": messages.get(error.code, "请求无效"), "requestId": g.get("request_id", "")}}, error.code)
        if error.code == 405:
            response.headers["Allow"] = ", ".join(sorted(error.valid_methods or ["GET", "HEAD", "OPTIONS"]))
        return response

    @app.errorhandler(Exception)
    def server_error(error):
        app.logger.exception("request_id=%s unhandled server error", g.get("request_id"))
        return reply({"error": {"code": "INTERNAL_ERROR", "message": "服务暂时不可用", "requestId": g.get("request_id", "")}}, 500)

    def read(key):
        if request.method == "OPTIONS":
            return Response(status=204)
        return reply(bodies[key], cache=True)

    @app.route("/products", methods=["GET", "OPTIONS"])
    @app.route("/api/v1/products", methods=["GET", "OPTIONS"])
    def products():
        return read("products")

    @app.route("/site-content", methods=["GET", "OPTIONS"])
    @app.route("/api/v1/site-content", methods=["GET", "OPTIONS"])
    def site_content():
        return read("content")

    @app.route("/healthz", methods=["GET"])
    @app.route("/api/v1/health", methods=["GET"])
    def health():
        return reply({"data": {"ok": True, "service": "inex-content-api"}, "meta": {"version": version, "apiVersion": "v1"}})

    if app.config["SERVE_PREVIEW"]:
        site = Path(app.config["SITE_ROOT"])
        if not (site / "index.html").is_file():
            raise ValueError("Local preview requires the repository's site directory")

        @app.route("/assets/js/data-config.js")
        def preview_config():
            response = Response('window.DATA_CONFIG = Object.freeze({source:"api",apiBase:"/api/v1/",timeoutMs:5000});\n', content_type="text/javascript; charset=utf-8")
            response.headers["Cache-Control"] = "no-store"
            return response

        @app.route("/", defaults={"filename": "index.html"})
        @app.route("/<path:filename>")
        def preview(filename):
            return send_from_directory(site, filename, max_age=0)
    else:
        app.add_url_rule("/", "index", health)
    return app

"""Read-only smoke check for an actually deployed HTTPS API. No credentials required."""
import argparse
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def verify(base, expected=None, origin="https://lmh7.github.io"):
    parts = urlsplit(base)
    if (parts.scheme != "https" and not (parts.scheme == "http" and parts.hostname in ("127.0.0.1", "localhost"))) or parts.username or parts.password or parts.query or parts.fragment:
        raise ValueError("Supply an HTTPS service root URL, without credentials or query parameters")
    root = base.rstrip("/")

    def get(path, headers=None, status=200, method="GET"):
        req = Request(root + path, method=method, headers={"Origin": origin, "Accept": "application/json", **(headers or {})})
        try:
            r = urlopen(req, timeout=15)
        except HTTPError as error:
            r = error
        with r:
            if r.status != status:
                raise AssertionError(f"{path}: expected {status}, got {r.status}")
            payload = r.read()
            if r.headers.get("Access-Control-Allow-Origin") != origin:
                raise AssertionError(f"{path}: frontend origin is not allowed")
            if status not in (204, 304) and method != "HEAD" and "application/json" not in r.headers.get("Content-Type", ""):
                raise AssertionError(f"{path}: expected JSON content type")
            return (json.loads(payload) if payload else None), r.headers

    health, _ = get("/healthz")
    if health["data"]["ok"] is not True:
        raise AssertionError("Health check failed")
    version = health["meta"]["version"]
    if expected and version != expected:
        raise AssertionError(f"Wrong release: expected {expected}, got {version}")
    for short, path in [("/products", "/api/v1/products"), ("/site-content", "/api/v1/site-content")]:
        value, headers = get(path)
        alias, _ = get(short)
        if value != alias or value["meta"]["version"] != version:
            raise AssertionError("Alias or release mismatch")
        get(path, {"If-None-Match": headers["ETag"]}, status=304)
        get(path, method="HEAD")
        get(path, status=204, method="OPTIONS")
        print("PASS", path, "version=" + version)
    error, _ = get("/api/v1/not-a-route", status=404)
    if not error.get("error", {}).get("requestId"):
        raise AssertionError("Missing JSON error request ID")
    get("/api/v1/products", status=405, method="POST")
    print("PASS health, aliases, CORS, caching, read-only methods and JSON errors")
    return version


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("url", help="Service root URL, without /api/v1/")
    parser.add_argument("--version", help="Expected content version")
    parser.add_argument("--origin", default="https://lmh7.github.io")
    args = parser.parse_args()
    verify(args.url, args.version, args.origin)

"""Run the same Waitress WSGI server locally and in a cloud Web function."""

import argparse
import logging
import os

from waitress import serve

from .app import create_app


def main():
    parser = argparse.ArgumentParser(description="iNEX read-only content API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "9000")))
    parser.add_argument("--preview", action="store_true", help="Serve the website and use this local API, without changing published config")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port must be between 1 and 65535")
    if args.preview and args.host not in ("127.0.0.1", "localhost"):
        parser.error("local preview binds to loopback only")
    config = {"SERVE_PREVIEW": args.preview}
    if args.preview:
        config["PUBLIC_ASSET_BASE"] = "http://127.0.0.1:{}/".format(args.port)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    app = create_app(config)
    print("iNEX {}: http://{}:{}  content={}".format("website + API preview" if args.preview else "API", args.host, args.port, app.config["CONTENT_VERSION"]), flush=True)
    serve(app, host=args.host, port=args.port, threads=4, ident="iNEX", max_request_body_size=16384, channel_timeout=30, expose_tracebacks=False)


if __name__ == "__main__":
    main()

import copy
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from backend import create_app
from backend.validation import content_version, validate_snapshot

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = json.loads((ROOT / "backend/data/snapshot.json").read_text(encoding="utf-8"))


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True, "ALLOWED_ORIGINS": "https://lmh7.github.io"})
        self.client = self.app.test_client()

    def test_aliases_and_release(self):
        for old, new, key in [("/products", "/api/v1/products", "products"), ("/site-content", "/api/v1/site-content", "content")]:
            a, b = self.client.get(old), self.client.get(new)
            self.assertEqual(a.status_code, 200)
            self.assertEqual(a.data, b.data)
            self.assertEqual(b.json["meta"]["version"], SNAPSHOT["version"])
            self.assertEqual(len(b.json["data"]), len(SNAPSHOT[key]))
            self.assertIn("application/json", b.content_type)
            self.assertIn("charset=utf-8", b.content_type)
        image = self.client.get("/products").json["data"][0]["image"]
        self.assertEqual(image, SNAPSHOT["assetBase"] + SNAPSHOT["products"][0]["image"])

    def test_health_is_not_cached(self):
        for path in ["/", "/healthz", "/api/v1/health"]:
            r = self.client.get(path)
            self.assertEqual(r.status_code, 200)
            self.assertTrue(r.json["data"]["ok"])
            self.assertEqual(r.headers["Cache-Control"], "no-store")

    def test_conditional_get_head_and_options(self):
        r = self.client.get("/products")
        self.assertIn("max-age=60", r.headers["Cache-Control"])
        self.assertEqual(self.client.get("/products", headers={"If-None-Match": r.headers["ETag"]}).status_code, 304)
        head = self.client.head("/products")
        self.assertEqual(head.status_code, 200)
        self.assertEqual(head.data, b"")
        self.assertEqual(head.headers["ETag"], r.headers["ETag"])
        preflight = self.client.options("/api/v1/products", headers={"Origin": "https://lmh7.github.io", "Access-Control-Request-Method": "GET"})
        self.assertEqual(preflight.status_code, 204)
        self.assertIn("GET", preflight.headers["Access-Control-Allow-Methods"])

    def test_cors_is_exact_and_also_present_on_errors(self):
        for path in ["/products", "/no-such-api"]:
            r = self.client.get(path, headers={"Origin": "https://lmh7.github.io"})
            self.assertEqual(r.headers["Access-Control-Allow-Origin"], "https://lmh7.github.io")
            self.assertIn("Origin", r.headers["Vary"])
            for origin in ["https://evil.example", "https://lmh7.github.io.evil.example", "null"]:
                self.assertNotIn("Access-Control-Allow-Origin", self.client.get(path, headers={"Origin": origin}).headers)

    def test_errors_are_json_and_methods_read_only(self):
        for path, status in [("/missing", 404), ("/api/v2/products", 404)]:
            r = self.client.get(path)
            self.assertEqual(r.status_code, status)
            self.assertEqual(r.json["error"]["requestId"], r.headers["X-Request-ID"])
            self.assertEqual(r.headers["Cache-Control"], "no-store")
        for method in ["post", "put", "patch", "delete"]:
            r = getattr(self.client, method)("/api/v1/products")
            self.assertEqual(r.status_code, 405)
            self.assertIn("GET", r.headers["Allow"])
            self.assertIn("error", r.json)

    def test_unexpected_failure_does_not_leak_details(self):
        def broken():
            raise RuntimeError("secret-database-password")
        self.app.add_url_rule("/test-error", view_func=broken)
        with self.assertLogs(self.app.logger, level="ERROR"):
            r = self.client.get("/test-error")
        self.assertEqual(r.status_code, 500)
        self.assertEqual(r.json["error"]["code"], "INTERNAL_ERROR")
        self.assertNotIn("secret-database-password", r.get_data(as_text=True))

    def test_invalid_configuration_refused_at_startup(self):
        for value in ["*", "https://example.com/", "http://example.com", "https://a.example/path", ""]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                create_app({"ALLOWED_ORIGINS": value})
        for value in ["javascript:alert(1)", "http://example.com/", "https://u:p@example.com/", "https://example.com/?q=1"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                create_app({"PUBLIC_ASSET_BASE": value})

    def test_preview_uses_real_api_and_cannot_read_repo_files(self):
        client = create_app({"SERVE_PREVIEW": True, "PUBLIC_ASSET_BASE": "http://127.0.0.1:9000/"}).test_client()
        with client.get("/") as response:
            self.assertIn(b"<!doctype html>", response.data.lower())
        self.assertIn(b'source:"api"', client.get("/assets/js/data-config.js").data)
        self.assertTrue(client.get("/products").json["data"][0]["image"].startswith("http://127.0.0.1:9000/"))
        for path in ["/backend/app.py", "/.env", "/../backend/app.py", "/%2e%2e/backend/app.py"]:
            self.assertEqual(client.get(path).status_code, 404)

    def test_asset_configuration_does_not_mutate_content(self):
        app = create_app({"PUBLIC_ASSET_BASE": "https://cdn.example/site/"})
        r = app.test_client().get("/products")
        self.assertTrue(r.json["data"][0]["image"].startswith("https://cdn.example/site/"))
        self.assertEqual(SNAPSHOT["version"], r.json["meta"]["version"])

    def test_case_images_and_videos_follow_public_asset_base(self):
        snapshot = copy.deepcopy(SNAPSHOT)
        snapshot["products"][0]["video"] = "assets/videos/example.mp4"
        snapshot["content"]["solutions"][0]["case"]["image"] = "assets/images/nex-500.webp"
        snapshot["version"] = content_version(snapshot["products"], snapshot["content"])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "snapshot.json"
            path.write_text(json.dumps(snapshot), encoding="utf-8")
            client = create_app({"SNAPSHOT_PATH": str(path), "PUBLIC_ASSET_BASE": "https://cdn.example/site/"}).test_client()
            self.assertEqual(client.get("/products").json["data"][0]["video"], "https://cdn.example/site/assets/videos/example.mp4")
            self.assertEqual(client.get("/site-content").json["data"]["solutions"][0]["case"]["image"], "https://cdn.example/site/assets/images/nex-500.webp")


class SnapshotTests(unittest.TestCase):
    def test_generated_snapshot_matches_canonical_source(self):
        for key, path in [("products", "products.json"), ("content", "site-content.json")]:
            self.assertEqual(SNAPSHOT[key], json.loads((ROOT / "content" / path).read_text(encoding="utf-8")))
        self.assertEqual(validate_snapshot(copy.deepcopy(SNAPSHOT))["version"], SNAPSHOT["version"])

    def test_corrupt_or_stale_snapshot_refused(self):
        bad = copy.deepcopy(SNAPSHOT)
        bad["products"][0]["name"] = "changed without generation"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "snapshot.json"
            path.write_text(json.dumps(bad), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "version"):
                create_app({"SNAPSHOT_PATH": str(path)})

    def test_invalid_public_content_refused(self):
        cases = [
            lambda d: d["products"].append(copy.deepcopy(d["products"][0])),
            lambda d: d["products"][0].update(id="../escape"),
            lambda d: d["products"][0].update(image="javascript:alert(1)"),
            lambda d: d["products"][0].update(image="assets/images/../../secret"),
            lambda d: d["content"]["resources"][0].update(url="javascript:alert(1)"),
            lambda d: d["content"]["faqs"][0].update(answer=None),
            lambda d: d["content"]["contacts"].append(copy.deepcopy(d["content"]["contacts"][0])),
            lambda d: d["content"].update(email=None),
            lambda d: d["content"]["solutions"][0].update(platforms="nex-250"),
            lambda d: d["content"]["solutions"][0].update(case=[]),
            lambda d: d["content"]["solutions"][0]["case"].update(link="javascript:alert(1)"),
            lambda d: d["content"].update(resourceUpdates={}),
            lambda d: d["content"]["resourceUpdates"][0].update(status="ready", url=""),
            lambda d: d["products"][0].update(features="not-an-array"),
            lambda d: d["products"][0].update(series=None),
            lambda d: d["products"][0].update(video="javascript:alert(1)"),
            lambda d: d["products"][0]["specs"][0].update(group={}),
            lambda d: d["products"][0].update(applicationSolutions=["education"]),
        ]
        for mutate in cases:
            d = copy.deepcopy(SNAPSHOT)
            mutate(d)
            d["version"] = content_version(d["products"], d["content"])
            with self.subTest(mutate=mutate), self.assertRaises(ValueError):
                validate_snapshot(d)

    def test_legacy_optional_fields_remain_compatible(self):
        d = copy.deepcopy(SNAPSHOT)
        for product in d["products"]:
            for key in ("features", "series", "video", "contentStatus", "applicationSolutions"):
                product.pop(key, None)
            for spec in product["specs"]:
                spec.pop("group", None)
        for solution in d["content"]["solutions"]:
            solution.pop("platforms", None)
            solution.pop("case", None)
        d["content"].pop("resourceUpdates", None)
        d["version"] = content_version(d["products"], d["content"])
        self.assertEqual(validate_snapshot(d)["version"], d["version"])

    def test_product_documented_content_states_are_valid(self):
        for state in ("partial", "complete"):
            d = copy.deepcopy(SNAPSHOT)
            d["products"][0]["contentStatus"] = state
            d["version"] = content_version(d["products"], d["content"])
            with self.subTest(state=state):
                self.assertEqual(validate_snapshot(d)["products"][0]["contentStatus"], state)

    def test_preview_video_loopback_is_accepted_by_both_contracts(self):
        frontend = """
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const input = JSON.parse(readFileSync(0, 'utf8'));
const context = vm.createContext({URL});
vm.runInContext(readFileSync('site/assets/js/content-contract.js', 'utf8'), context);
try { context.ContentContract.validateProducts(input.products); process.stdout.write('accepted'); }
catch { process.stdout.write('rejected'); }
"""
        for value, valid in [("http://127.0.0.1:9000/assets/videos/demo.mp4", True),
                             ("http://localhost:9000/assets/videos/demo.mp4", True),
                             ("http://external.example/demo.mp4", False)]:
            d = copy.deepcopy(SNAPSHOT)
            d["products"][0]["video"] = value
            d["version"] = content_version(d["products"], d["content"])
            with self.subTest(video=value):
                if valid:
                    validate_snapshot(d)
                else:
                    with self.assertRaises(ValueError):
                        validate_snapshot(d)
                result = subprocess.run(["node", "--input-type=module", "-e", frontend],
                                        cwd=ROOT, input=json.dumps(d), capture_output=True, text=True, encoding="utf-8", check=True)
                self.assertEqual(result.stdout, "accepted" if valid else "rejected")

    def test_empty_products_and_optional_contacts_are_valid(self):
        d = copy.deepcopy(SNAPSHOT)
        d["products"] = []
        d["content"]["contacts"] = []
        d["version"] = content_version(d["products"], d["content"])
        self.assertEqual(validate_snapshot(d)["products"], [])


if __name__ == "__main__":
    unittest.main()

import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from backend.validation import validate_snapshot

ROOT = Path(__file__).resolve().parents[2]


class GenerationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for folder in ["content", "config", "site/assets/images"]:
            shutil.copytree(ROOT / folder, self.root / folder)
        for file in ["scripts/sync-content.mjs", "scripts/deployment-config.mjs", "site/assets/js/content-contract.js"]:
            (self.root / file).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / file, self.root / file)

    def run_generator(self, check=False, success=True):
        r = subprocess.run(["node", "scripts/sync-content.mjs"] + (["--check"] if check else []),
                           cwd=self.root, capture_output=True, text=True, encoding="utf-8")
        if success:
            self.assertEqual(r.returncode, 0, r.stderr)
        else:
            self.assertNotEqual(r.returncode, 0, r.stdout)
        return r

    def products(self):
        return json.loads((self.root / "content/products.json").read_text(encoding="utf-8"))

    def save_products(self, value):
        (self.root / "content/products.json").write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")

    def test_generate_edit_and_regenerate_one_consistent_release(self):
        self.run_generator()
        self.run_generator(check=True)
        old = json.loads((self.root / "backend/data/snapshot.json").read_text(encoding="utf-8"))
        p = self.products()
        p[0]["name"] = "New <platform> 飞行测试"
        self.save_products(p)
        self.run_generator(check=True, success=False)
        self.run_generator()
        new = json.loads((self.root / "backend/data/snapshot.json").read_text(encoding="utf-8"))
        self.assertNotEqual(old["version"], new["version"])
        self.assertEqual(validate_snapshot(new)["products"], p)
        example = json.loads((self.root / "docs/api-examples/products.json").read_text(encoding="utf-8"))
        self.assertEqual(example["data"], p)
        self.assertEqual(example["meta"]["version"], new["version"])
        self.assertIn("\\u003cplatform>", (self.root / "site/assets/js/products.js").read_text(encoding="utf-8"))
        self.run_generator(check=True)

    def test_invalid_data_never_overwrites_existing_release(self):
        self.run_generator()
        before = (self.root / "backend/data/snapshot.json").read_bytes()
        p = self.products()
        p.append(p[0])
        self.save_products(p)
        self.run_generator(success=False)
        self.assertEqual((self.root / "backend/data/snapshot.json").read_bytes(), before)

    def test_missing_image_refused(self):
        p = self.products()
        p[0]["image"] = "assets/images/nonexistent.webp"
        self.save_products(p)
        self.run_generator(success=False)

    def test_new_frontend_fields_are_validated_before_generation(self):
        products_path = self.root / "content/products.json"
        content_path = self.root / "content/site-content.json"
        products = products_path.read_text(encoding="utf-8")
        content = content_path.read_text(encoding="utf-8")
        mutations = [
            ("content", lambda d: d.update(email=None)),
            ("content", lambda d: d["solutions"][0].update(platforms="nex-250")),
            ("content", lambda d: d.update(resourceUpdates={})),
            ("content", lambda d: d["solutions"][0].update(case=[])),
            ("products", lambda d: d[0].update(features="not-an-array")),
            ("products", lambda d: d[0].update(series=None)),
            ("products", lambda d: d[0].update(video="javascript:alert(1)")),
            ("products", lambda d: d[0]["specs"][0].update(group={})),
            ("products", lambda d: d[0].update(applicationSolutions=["education"])),
        ]
        for name, mutate in mutations:
            products_path.write_text(products, encoding="utf-8")
            content_path.write_text(content, encoding="utf-8")
            path = content_path if name == "content" else products_path
            value = json.loads(path.read_text(encoding="utf-8"))
            mutate(value)
            path.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
            with self.subTest(field=name, mutate=mutate):
                self.run_generator(success=False)

    def test_local_mode_can_leave_api_unconfigured_but_api_mode_cannot(self):
        path = self.root / "config/public.json"
        config = json.loads(path.read_text(encoding="utf-8"))
        config.update(source="local", apiBase="")
        path.write_text(json.dumps(config), encoding="utf-8")
        self.run_generator()
        self.assertIn("connect-src 'self';", (self.root / "site/_headers").read_text(encoding="utf-8"))
        config["source"] = "api"
        path.write_text(json.dumps(config), encoding="utf-8")
        self.run_generator(success=False)

    def test_documented_product_states_generate_successfully(self):
        for state in ("partial", "complete"):
            products = self.products()
            products[0]["contentStatus"] = state
            self.save_products(products)
            with self.subTest(state=state):
                self.run_generator()

    def test_configuration_generates_exact_network_allowlist(self):
        path = self.root / "config/public.json"
        config = json.loads(path.read_text(encoding="utf-8"))
        config.update(source="api", apiBase="https://api.example/v1/", assetBase="https://media.example/site/")
        path.write_text(json.dumps(config), encoding="utf-8")
        products = self.products()
        products[0]["video"] = "https://video.example/demo.mp4"
        self.save_products(products)
        self.run_generator()
        policy = (self.root / "site/_headers").read_text(encoding="utf-8")
        self.assertIn("connect-src 'self' https://api.example;", policy)
        self.assertIn("img-src 'self' data: https://media.example;", policy)
        self.assertIn("media-src 'self' https://video.example;", policy)
        self.assertNotIn("connect-src *", policy)
        config["apiBase"] = "http://insecure.example/"
        path.write_text(json.dumps(config), encoding="utf-8")
        self.run_generator(success=False)

    def test_invalid_case_and_ready_download_are_rejected(self):
        path = self.root / "content/site-content.json"
        original = json.loads(path.read_text(encoding="utf-8"))
        original["solutions"][0]["case"]["link"] = "javascript:alert(1)"
        path.write_text(json.dumps(original), encoding="utf-8")
        self.run_generator(success=False)
        original["solutions"][0]["case"]["link"] = ""
        original["resourceUpdates"][0].update(status="ready", url="")
        path.write_text(json.dumps(original), encoding="utf-8")
        self.run_generator(success=False)


if __name__ == "__main__":
    unittest.main()

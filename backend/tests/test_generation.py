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
        for file in ["scripts/sync-content.mjs", "site/assets/js/content-contract.js"]:
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

    def test_configuration_generates_exact_network_allowlist(self):
        path = self.root / "config/public.json"
        config = json.loads(path.read_text(encoding="utf-8"))
        config.update(source="api", apiBase="https://api.example/v1/", assetBase="https://media.example/site/")
        path.write_text(json.dumps(config), encoding="utf-8")
        self.run_generator()
        policy = (self.root / "site/_headers").read_text(encoding="utf-8")
        self.assertIn("connect-src 'self' https://api.example;", policy)
        self.assertIn("img-src 'self' data: https://media.example;", policy)
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

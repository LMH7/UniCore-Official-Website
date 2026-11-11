import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]


class PackageTests(unittest.TestCase):
    def test_source_zip_manifest_permissions_and_extracted_startup(self):
        subprocess.run([sys.executable, "scripts/package-backend.py"], cwd=ROOT, check=True, capture_output=True)
        snapshot = json.loads((ROOT / "backend/data/snapshot.json").read_text(encoding="utf-8"))
        archive = ROOT / "release" / ("inex-backend-" + snapshot["version"] + "-source.zip")
        first_digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        subprocess.run([sys.executable, "scripts/package-backend.py"], cwd=ROOT, check=True, capture_output=True)
        self.assertEqual(first_digest, hashlib.sha256(archive.read_bytes()).hexdigest())
        with ZipFile(archive) as z:
            manifest = json.loads(z.read("manifest.json"))
            self.assertEqual(manifest["contentVersion"], snapshot["version"])
            self.assertEqual(set(z.namelist()), set(manifest["files"]) | {"manifest.json"})
            for path, digest in manifest["files"].items():
                self.assertEqual(hashlib.sha256(z.read(path)).hexdigest(), digest)
                self.assertNotIn("..", path)
                self.assertFalse(path.startswith("/"))
                self.assertFalse(path.endswith((".pyc", ".env")))
            self.assertEqual(z.getinfo("scf_bootstrap").external_attr >> 16 & 0o777, 0o755)
            self.assertNotIn(b"\r", z.read("scf_bootstrap"))
            self.assertIn("app.py", z.namelist())
            self.assertIn(b"exec python3.12 app.py", z.read("scf_bootstrap"))
            self.assertNotIn("site/index.html", z.namelist())
            with tempfile.TemporaryDirectory() as tmp:
                z.extractall(tmp)
                code = ("import os,sys; sys.path.insert(0,os.getcwd()); "
                        "from pathlib import Path; from backend import create_app; import backend; "
                        "assert Path(backend.__file__).is_relative_to(Path.cwd()); "
                        "a=create_app(); r=a.test_client().get('/api/v1/products'); "
                        "assert r.status_code==200; assert r.json['meta']['version']=='" + snapshot["version"] + "'")
                result = subprocess.run([sys.executable, "-I", "-c", code], cwd=tmp, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                entry = subprocess.run([sys.executable, "app.py", "--help"], cwd=tmp, capture_output=True, text=True)
                self.assertEqual(entry.returncode, 0, entry.stderr)
                self.assertIn("--host", entry.stdout)


if __name__ == "__main__":
    unittest.main()

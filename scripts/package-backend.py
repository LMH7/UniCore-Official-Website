"""Allowlisted backend ZIP; optionally bundle Linux x86_64 CPython 3.12 wheels."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "backend/__init__.py", "backend/__main__.py", "backend/app.py", "backend/validation.py",
    "backend/data/snapshot.json", "backend/requirements.txt", "backend/requirements.lock",
    "backend/README.md", "backend/Dockerfile", "backend/.dockerignore", "backend/Dockerfile.dockerignore",
    "deploy/production/compose.yml", "deploy/production/Caddyfile",
    "deploy/production/production.env.example", "deploy/production/README.md",
]


def package(linux=False):
    subprocess.run(["node", "scripts/sync-content.mjs", "--check"], cwd=ROOT, check=True)
    snapshot = json.loads((ROOT / "backend/data/snapshot.json").read_text(encoding="utf-8"))
    files = {name: (ROOT / name).read_bytes().replace(b"\r\n", b"\n") for name in FILES}
    files["app.py"] = (ROOT / "backend/cloud_entry.py").read_bytes().replace(b"\r\n", b"\n")
    files["scf_bootstrap"] = (ROOT / "backend/scf_bootstrap").read_bytes().replace(b"\r\n", b"\n")
    with tempfile.TemporaryDirectory(prefix="inex-package-") as tmp:
        if linux:
            subprocess.run([
                sys.executable, "-m", "pip", "download", "--disable-pip-version-check",
                "--only-binary=:all:", "--platform", "manylinux2014_x86_64",
                "--implementation", "cp", "--python-version", "3.12", "--abi", "cp312",
                "--dest", tmp, "-r", str(ROOT / "backend/requirements.lock"),
            ], check=True)
            # Extract wheels directly: installing for Linux on Windows would create
            # Windows .exe entry points containing the builder's interpreter path.
            # Our service starts with python -m backend, so no console scripts are needed.
            for wheel in sorted(Path(tmp).glob("*.whl")):
                with ZipFile(wheel) as z:
                    for entry in z.infolist():
                        name = entry.filename
                        if entry.is_dir():
                            continue
                        if name.startswith("/") or ".." in name.split("/") or "\\" in name:
                            raise ValueError("Unsafe wheel path: " + name)
                        if ".data/" in name:
                            section, name = name.split(".data/", 1)[1].split("/", 1)
                            if section in ("scripts", "headers"):
                                continue
                            if section not in ("purelib", "platlib"):
                                raise ValueError("Unsupported wheel data section: " + section)
                        if name in files:
                            raise ValueError("Duplicate package path: " + name)
                        files[name] = z.read(entry)
        manifest = {
            "format": 1, "contentVersion": snapshot["version"],
            "python": "3.12",
            "target": "linux-x86_64-cp312" if linux else "source-install-requirements",
            "files": {name: hashlib.sha256(data).hexdigest() for name, data in sorted(files.items())},
        }
        files["manifest.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        archive = ROOT / "release" / ("inex-backend-" + snapshot["version"] + ("-linux-py312.zip" if linux else "-source.zip"))
        archive.parent.mkdir(exist_ok=True)
        with ZipFile(archive, "w", compression=ZIP_DEFLATED) as z:
            for name, data in sorted(files.items()):
                entry = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
                entry.create_system = 3
                entry.external_attr = (0o100755 if name == "scf_bootstrap" else 0o100644) << 16
                entry.compress_type = ZIP_DEFLATED
                z.writestr(entry, data)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        archive.with_suffix(".zip.sha256").write_text(digest + "  " + archive.name + "\n", encoding="utf-8")
        print("Backend package:", archive)
        print("SHA256:", digest)
        return archive


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--linux", action="store_true", help="Include Linux x86_64 dependencies, not the interpreter")
    args = parser.parse_args()
    package(args.linux)

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const local = resolve(root, process.platform === "win32" ? ".venv-backend/Scripts/python.exe" : ".venv-backend/bin/python");
const python = process.env.BACKEND_PYTHON || (existsSync(local) ? local : "python");
const task = process.argv[2];
const extra = process.argv.slice(3);
const args = {
  test: ["-m", "unittest", "discover", "-s", "backend/tests", "-v"],
  preview: ["-m", "backend", "--preview", ...extra],
  package: ["scripts/package-backend.py", ...extra],
  smoke: ["scripts/verify-backend.py", ...extra],
}[task];
if (!args) throw new Error("Choose test, preview, package or smoke");
if (task !== "smoke") {
  const check = spawnSync(process.execPath, ["scripts/sync-content.mjs", "--check"], { cwd: root, stdio: "inherit" });
  if (check.status !== 0) process.exit(check.status || 1);
}
const child = spawn(python, args, { cwd: root, stdio: "inherit", env: { ...process.env, PYTHONUTF8: "1" } });
child.on("error", error => {
  console.error(`Cannot start backend: ${error.message}. See backend/README.md to install Python 3.12 and dependencies.`);
  process.exitCode = 1;
});
child.on("exit", code => { process.exitCode = code ?? 1; });

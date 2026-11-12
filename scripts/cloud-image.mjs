// Build and verify locally before an optional push; no cloud API keys required.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let repository = "inex-api";
let push = false;
let baseImage;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--image" && args[i + 1]) repository = args[++i];
  else if (args[i] === "--push") push = true;
  else if (args[i] === "--base" && args[i + 1]) baseImage = args[++i];
  else throw new Error("Usage: npm run build:cloud -- [--image registry/namespace/repository] [--base python-image] [--push]");
}
if (baseImage && !/^[a-z0-9][a-z0-9._/:@-]*$/.test(baseImage)) throw new Error("Invalid base image reference");
if (!/^[a-z0-9][a-z0-9._/-]*$/.test(repository) || repository.includes("..")) {
  throw new Error("Use a lowercase image repository, without a tag or password.");
}
if (push && !repository.startsWith("ccr.ccs.tencentyun.com/") && !/^[a-z0-9.-]+\.tencentcloudcr\.com\//.test(repository)) {
  throw new Error("--push requires your Tencent TCR repository address from the console.");
}
function run(command, commandArgs, capture = false) {
  const result = spawnSync(command, commandArgs, { cwd: root, encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${capture ? result.stderr.trim() : "see output above"}`);
  return capture ? result.stdout.trim() : "";
}
run(process.execPath, ["scripts/sync-content.mjs", "--check"]);
const snapshot = JSON.parse(readFileSync(resolve(root, "backend/data/snapshot.json"), "utf8"));
if (run("docker", ["info", "--format", "{{.OSType}}"], true) !== "linux") {
  throw new Error("Start Docker Desktop with Linux containers, then try again.");
}
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "z").toLowerCase();
const tag = `v-${snapshot.version}-${stamp}`;
const image = `${repository}:${tag}`;
run("docker", ["build", "--pull", "--platform", "linux/amd64", ...(baseImage ? ["--build-arg", `PYTHON_BASE=${baseImage}`] : []), "-f", "backend/Dockerfile", "-t", image, "."]);
const info = JSON.parse(run("docker", ["image", "inspect", image], true))[0];
if (info.Architecture !== "amd64" || info.Os !== "linux") throw new Error("Expected a Linux amd64 image.");
const runtime = run("docker", ["run", "--rm", image, "python", "--version"], true);
if (!runtime.startsWith("Python 3.12.")) throw new Error("Expected Python 3.12.");
let container;
try {
  container = run("docker", ["run", "--rm", "--detach", "--publish", "127.0.0.1::9000",
    "--env", "ALLOWED_ORIGINS=https://lmh7.github.io", image], true);
  const port = run("docker", ["port", container, "9000/tcp"], true).match(/:(\d+)$/)?.[1];
  if (!port) throw new Error("Cannot find the local container port.");
  const url = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* startup */ }
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
  }
  if (!ready) {
    run("docker", ["logs", container]);
    throw new Error("The container did not become ready.");
  }
  run(process.execPath, ["scripts/backend-task.mjs", "smoke", url, "--version", snapshot.version]);
} finally {
  if (container) {
    // It may already have exited; still attempt cleanup without hiding a smoke failure.
    spawnSync("docker", ["rm", "--force", container], { cwd: root, encoding: "utf8" });
  }
}
let registryDigests = [];
if (push) {
  // docker login is performed by the account holder in their own terminal.
  run("docker", ["push", image]);
  registryDigests = JSON.parse(run("docker", ["image", "inspect", image], true))[0].RepoDigests;
}
mkdirSync(resolve(root, "release"), { recursive: true });
const record = {
  image, imageId: info.Id, architecture: info.Architecture, runtime, baseImage: baseImage || "python:3.12-slim-bookworm",
  contentVersion: snapshot.version, createdAt: new Date().toISOString(),
  localContainerSmoke: "passed", pushed: push, registryDigests,
  cloudDeployment: "pending-account-console-and-public-smoke",
};
const path = resolve(root, "release", `cloud-image-${tag}.json`);
writeFileSync(path, JSON.stringify(record, null, 2) + "\n");
console.log(`Verified image: ${image}\nRelease record: ${path}`);
console.log(push ? "Next: select this exact tag in SCF and verify its public function URL." : "Not pushed. Log in to TCR locally and rerun with --image YOUR_REPOSITORY --push when ready.");

import { mkdir, cp, readFile, writeFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
for (const script of ["sync-content.mjs", "sync-navigation.mjs", "sync-solutions.mjs"]) {
  execFileSync(process.execPath, [path.join(root, "scripts", script), "--check"], { stdio: "inherit" });
}
execFileSync(process.execPath, [path.join(root, "scripts/check.mjs")], {
  stdio: "inherit",
});
const release = path.join(root, "release");
await mkdir(release, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const folder = path.join(release, `unicore-site-${stamp}`);
await cp(path.join(root, "site"), folder, { recursive: true });
// 使用 ZIP 的常见 store 模式，部署无需安装任何打包依赖。
const table = Uint32Array.from({ length: 256 }, (_, i) => {
  for (let n = 0; n < 8; n++) i = i & 1 ? 0xedb88320 ^ (i >>> 1) : i >>> 1;
  return i >>> 0;
});
const crc32 = (data) => {
  let crc = 0xffffffff;
  for (const b of data) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const locals = [],
  central = [];
let offset = 0;
async function visit(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory())
      await visit(path.join(dir, entry.name), name + "/");
    else {
      const data = await readFile(path.join(dir, entry.name));
      const filename = Buffer.from(name, "utf8");
      const crc = crc32(data);
      const header = Buffer.alloc(30);
      header.writeUInt32LE(0x04034b50);
      header.writeUInt16LE(20, 4);
      header.writeUInt16LE(0x800, 6);
      header.writeUInt16LE(0x21, 12);
      header.writeUInt32LE(crc, 14);
      header.writeUInt32LE(data.length, 18);
      header.writeUInt32LE(data.length, 22);
      header.writeUInt16LE(filename.length, 26);
      locals.push(header, filename, data);
      const record = Buffer.alloc(46);
      record.writeUInt32LE(0x02014b50);
      record.writeUInt16LE(20, 4);
      record.writeUInt16LE(20, 6);
      record.writeUInt16LE(0x800, 8);
      record.writeUInt16LE(0x21, 14);
      record.writeUInt32LE(crc, 16);
      record.writeUInt32LE(data.length, 20);
      record.writeUInt32LE(data.length, 24);
      record.writeUInt16LE(filename.length, 28);
      record.writeUInt32LE(offset, 42);
      central.push(record, filename);
      offset += header.length + filename.length + data.length;
    }
  }
}
await visit(folder);
const centralBytes = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(central.length / 2, 8);
end.writeUInt16LE(central.length / 2, 10);
end.writeUInt32LE(centralBytes.length, 12);
end.writeUInt32LE(offset, 16);
const archive = folder + ".zip";
await writeFile(archive, Buffer.concat([...locals, centralBytes, end]));
console.log(
  `部署目录：${folder}\n部署压缩包：${archive}\n仅包含 site 中的网页与公开素材。`,
);

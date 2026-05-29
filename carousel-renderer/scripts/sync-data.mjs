import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..");
const sourceData = path.join(projectRoot, "carousel-output", "carousel-data.json");
const targetDataDir = path.join(projectRoot, "carousel-renderer", "src", "generated");
const targetData = path.join(targetDataDir, "carousel-data.json");
const sourceAssets = path.join(projectRoot, "carousel-output", "assets");
const runtimeAssets = path.join(projectRoot, "carousel-renderer", "public", "runtime-assets");

async function copyDir(source, target) {
  await fs.rm(target, { force: true, recursive: true });
  await fs.mkdir(target, { recursive: true });

  let entries = [];
  try {
    entries = await fs.readdir(source, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDir(from, to);
      continue;
    }

    await fs.copyFile(from, to);
  }
}

async function main() {
  const raw = await fs.readFile(sourceData, "utf8");
  const json = JSON.parse(raw);
  await fs.mkdir(targetDataDir, { recursive: true });
  await fs.writeFile(targetData, `${JSON.stringify(json, null, 2)}\n`);
  await copyDir(sourceAssets, runtimeAssets);
  console.log(`Synced carousel data to ${path.relative(projectRoot, targetData)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

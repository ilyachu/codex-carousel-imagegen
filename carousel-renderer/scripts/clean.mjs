import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..");

const targets = [
  path.join(projectRoot, "carousel-renderer", "dist"),
  path.join(projectRoot, "carousel-renderer", "public", "runtime-assets"),
  path.join(projectRoot, "carousel-output", "render"),
  path.join(projectRoot, "carousel-output", "png"),
  path.join(projectRoot, "carousel-output", "preview-montage.png"),
  path.join(projectRoot, "carousel-output", "carousel.pdf")
];

async function recreateDirectory(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, ".gitkeep"), "");
}

async function main() {
  for (const target of targets) {
    if (target.endsWith(".png") || target.endsWith(".pdf")) {
      await fs.rm(target, { force: true });
      continue;
    }

    if (target.endsWith("render") || target.endsWith("png")) {
      await recreateDirectory(target);
      continue;
    }

    await fs.rm(target, { recursive: true, force: true });
  }

  console.log("Cleaned build and export artifacts.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

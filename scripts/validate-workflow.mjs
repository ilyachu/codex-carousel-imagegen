import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = process.cwd();
const requiredFiles = [
  "carousel-output/intake.json",
  "carousel-output/intake.md",
  "carousel-output/SESSION_PROMPT.md",
  ".codex/skills/codex-carousel-imagegen/SKILL.md",
  ".agents/skills/codex-carousel-imagegen/SKILL.md"
];

async function fileExists(relPath) {
  try {
    await fs.access(path.join(projectRoot, relPath));
    return true;
  } catch {
    return false;
  }
}

async function readJson(relPath) {
  const raw = await fs.readFile(path.join(projectRoot, relPath), "utf8");
  return JSON.parse(raw);
}

async function main() {
  const missing = [];
  for (const relPath of requiredFiles) {
    if (!(await fileExists(relPath))) {
      missing.push(relPath);
    }
  }

  if (missing.length) {
    throw new Error(`Missing required files:\n- ${missing.join("\n- ")}`);
  }

  const intake = await readJson("carousel-output/intake.json");
  const allowedModes = new Set(["hybrid", "imagegen-only", "render-only"]);
  if (!allowedModes.has(intake.generationMode)) {
    throw new Error(`Invalid generationMode in intake.json: ${intake.generationMode}`);
  }

  const skillContents = await fs.readFile(
    path.join(projectRoot, ".codex/skills/codex-carousel-imagegen/SKILL.md"),
    "utf8"
  );

  if (!skillContents.startsWith("---")) {
    throw new Error("Project skill is missing YAML frontmatter.");
  }

  const canonicalSkillPath = path.join(process.env.HOME || "", ".codex/skills/codex-carousel-imagegen/SKILL.md");
  try {
    const installedSkill = await fs.readFile(canonicalSkillPath, "utf8");
    if (!installedSkill.startsWith("---")) {
      throw new Error("Installed canonical skill is missing YAML frontmatter.");
    }
  } catch (error) {
    throw new Error(`Unable to read installed canonical skill: ${error.message}`);
  }

  if (intake.generationMode !== "imagegen-only") {
    await execFileAsync("npm", ["run", "export"], {
      cwd: projectRoot,
      env: process.env,
      maxBuffer: 1024 * 1024 * 10
    });

    const pngDir = path.join(projectRoot, "carousel-output/png");
    const entries = await fs.readdir(pngDir);
    const pngs = entries.filter((entry) => entry.endsWith(".png"));
    if (pngs.length < 7) {
      throw new Error(`Expected at least 7 PNG files after export, found ${pngs.length}.`);
    }
  }

  console.log("Workflow validation passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

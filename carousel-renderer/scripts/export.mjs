import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..");
const distDir = path.join(projectRoot, "carousel-renderer", "dist");
const outputRoot = path.join(projectRoot, "carousel-output");
const renderDir = path.join(outputRoot, "render");
const pngDir = path.join(outputRoot, "png");
const dataPath = path.join(projectRoot, "carousel-output", "carousel-data.json");
const intakePath = path.join(projectRoot, "carousel-output", "intake.json");

async function ensureDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function copyDir(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

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

function pad(index) {
  return String(index).padStart(2, "0");
}

function startServer(rootDir) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === "/") {
        pathname = "/render/index.html";
      }

      const filePath = path.join(rootDir, pathname);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(rootDir)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      let stat;
      try {
        stat = await fs.stat(resolved);
      } catch {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const finalPath = stat.isDirectory() ? path.join(resolved, "index.html") : resolved;
      const content = await fs.readFile(finalPath);
      const ext = path.extname(finalPath);
      const contentType =
        {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".json": "application/json; charset=utf-8",
          ".svg": "image/svg+xml",
          ".png": "image/png"
        }[ext] || "application/octet-stream";

      response.writeHead(200, { "Content-Type": contentType });
      response.end(content);
    } catch (error) {
      response.writeHead(500);
      response.end(String(error));
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        port: typeof address === "object" && address ? address.port : 0
      });
    });
  });
}

async function writeMontageHtml(slideCount) {
  const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Carousel Montage</title>
    <style>
      body {
        background: #efe9dd;
        color: #101322;
        font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
        margin: 0;
        padding: 48px;
      }
      h1 {
        font-family: "Iowan Old Style", Georgia, serif;
        font-size: 38px;
        margin: 0 0 24px;
      }
      .grid {
        display: grid;
        gap: 22px;
        grid-template-columns: repeat(3, 1fr);
      }
      figure {
        margin: 0;
      }
      img {
        border-radius: 18px;
        box-shadow: 0 18px 48px rgba(16, 19, 34, 0.18);
        display: block;
        height: auto;
        width: 100%;
      }
      figcaption {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.08em;
        margin-top: 10px;
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <h1>Carousel Preview Montage</h1>
    <div class="grid">
      ${Array.from({ length: slideCount }, (_, index) => `<figure><img src="../png/slide-${pad(index + 1)}.png" alt="Slide ${index + 1}" /><figcaption>Slide ${pad(index + 1)}</figcaption></figure>`).join("")}
    </div>
  </body>
</html>`;

  await fs.writeFile(path.join(renderDir, "montage.html"), html);
}

async function writePrintHtml(slideCount) {
  const html = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <title>Carousel PDF</title>
    <style>
      @page {
        margin: 0;
        size: 1080px 1350px;
      }
      body {
        margin: 0;
      }
      .page {
        break-after: page;
        height: 1350px;
        width: 1080px;
      }
      .page:last-child {
        break-after: auto;
      }
      img {
        display: block;
        height: 100%;
        width: 100%;
      }
    </style>
  </head>
  <body>
    ${Array.from({ length: slideCount }, (_, index) => `<section class="page"><img src="../png/slide-${pad(index + 1)}.png" alt="Slide ${index + 1}" /></section>`).join("")}
  </body>
</html>`;

  await fs.writeFile(path.join(renderDir, "print.html"), html);
}

async function main() {
  try {
    const intakeRaw = await fs.readFile(intakePath, "utf8");
    const intake = JSON.parse(intakeRaw);
    if (intake.generationMode === "imagegen-only" && process.env.FORCE_RENDER_EXPORT !== "1") {
      throw new Error(
        "Current intake mode is imagegen-only. Do not run npm run export for this mode. Generate slide PNGs through built-in Codex image generation instead, or rerun kickoff with hybrid/render-only."
      );
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const raw = await fs.readFile(dataPath, "utf8");
  const data = JSON.parse(raw);
  const slideCount = data.slides.length;

  await ensureDir(renderDir);
  await ensureDir(pngDir);
  await copyDir(distDir, renderDir);
  const { server, port } = await startServer(outputRoot);
  let browser;

  try {
    browser = await chromium.launch();

    for (let index = 1; index <= slideCount; index += 1) {
      const page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: {
          width: 1440,
          height: 1700
        }
      });

      await page.goto(`http://127.0.0.1:${port}/render/index.html?slide=${index}&export=1`, {
        waitUntil: "networkidle"
      });
      await page.locator(".slide-shell").screenshot({
        path: path.join(pngDir, `slide-${pad(index)}.png`)
      });
      await page.close();
    }

    await writeMontageHtml(slideCount);
    const montagePage = await browser.newPage({
      viewport: {
        width: 1500,
        height: Math.max(1200, Math.ceil(slideCount / 3) * 520 + 220)
      }
    });
    await montagePage.goto(`http://127.0.0.1:${port}/render/montage.html`, {
      waitUntil: "networkidle"
    });
    await montagePage.screenshot({
      fullPage: true,
      path: path.join(outputRoot, "preview-montage.png")
    });
    await montagePage.close();

    await writePrintHtml(slideCount);
    const pdfPage = await browser.newPage({
      viewport: {
        width: 1080,
        height: 1350
      }
    });
    await pdfPage.goto(`http://127.0.0.1:${port}/render/print.html`, {
      waitUntil: "networkidle"
    });
    await pdfPage.pdf({
      path: path.join(outputRoot, "carousel.pdf"),
      printBackground: true,
      width: "1080px",
      height: "1350px",
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px"
      }
    });
    await pdfPage.close();

    await fs.writeFile(
      path.join(renderDir, "export-manifest.json"),
      `${JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          slideCount,
          pngPattern: "png/slide-XX.png",
          montage: "preview-montage.png",
          pdf: "carousel.pdf"
        },
        null,
        2
      )}\n`
    );

    console.log(`Exported ${slideCount} slides to ${path.relative(projectRoot, pngDir)}`);
  } catch (error) {
    if (String(error).includes("Executable doesn't exist")) {
      throw new Error(
        `Playwright Chromium is not installed. Run: cd ${projectRoot} && npx playwright install chromium`
      );
    }
    throw error;
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

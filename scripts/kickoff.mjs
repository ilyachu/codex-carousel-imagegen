import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "carousel-output");
const intakeJsonPath = path.join(outputDir, "intake.json");
const intakeMdPath = path.join(outputDir, "intake.md");
const sessionPromptPath = path.join(outputDir, "SESSION_PROMPT.md");

const rl = readline.createInterface({ input, output });
const args = process.argv.slice(2);

function getArg(flag) {
  const index = args.indexOf(flag);
  if (index === -1) {
    return "";
  }

  return args[index + 1] || "";
}

function hasFlag(flag) {
  return args.includes(flag);
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function ask(question, fallback) {
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || fallback || "";
}

async function main() {
  try {
    await fs.mkdir(outputDir, { recursive: true });

    const nonInteractive = hasFlag("--non-interactive");
    const generationMode = nonInteractive
      ? getArg("--mode") || "hybrid"
      : await ask("Как делаем карусель? hybrid / imagegen-only / render-only", "hybrid");
    const platform = nonInteractive
      ? getArg("--platform") || "telegram"
      : await ask("Площадка? telegram / instagram / linkedin", "telegram");
    const tone = nonInteractive
      ? getArg("--tone") || "бодро"
      : await ask("Тон? спокойно / бодро / почти промо", "бодро");
    const backgroundMood = nonInteractive
      ? getArg("--background") || "тёмный редакционный"
      : await ask("Фон и настроение", "тёмный редакционный");
    const background = nonInteractive
      ? getArg("--background-color") || "#101216"
      : await ask("Цвет фона", "#101216");
    const accent = nonInteractive
      ? getArg("--accent") || "#D8A35D"
      : await ask("Цвет акцента", "#D8A35D");
    const ink = nonInteractive
      ? getArg("--ink") || "#F3F1EC"
      : await ask("Цвет текста", "#F3F1EC");
    const displayFont = nonInteractive
      ? getArg("--font-display") || "Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif"
      : await ask("Шрифт заголовка", "Iowan Old Style, Palatino Linotype, Book Antiqua, Georgia, serif");
    const bodyFont = nonInteractive
      ? getArg("--font-body") || "Avenir Next, Segoe UI, Arial, sans-serif"
      : await ask("Шрифт текста", "Avenir Next, Segoe UI, Arial, sans-serif");
    const headlineSize = numberOr(nonInteractive
      ? getArg("--headline-size") || "88"
      : await ask("Кегль заголовка, px", "88"), 88);
    const coverSize = numberOr(nonInteractive
      ? getArg("--cover-size") || "108"
      : await ask("Кегль обложки, px", "108"), 108);
    const bodySize = numberOr(nonInteractive
      ? getArg("--body-size") || "34"
      : await ask("Кегль основного текста, px", "34"), 34);
    const textStyle = nonInteractive
      ? getArg("--text-style") || "крупный заголовок"
      : await ask("Характер набора", "крупный заголовок");

    const intake = {
      generationMode,
      platform,
      tone,
      backgroundMood,
      background,
      accent,
      ink,
      displayFont,
      bodyFont,
      headlineSize,
      coverSize,
      bodySize,
      textStyle,
      createdAt: new Date().toISOString()
    };

    const md = `# Intake

- generationMode: \`${generationMode}\`
- platform: \`${platform}\`
- tone: \`${tone}\`
- backgroundMood: \`${backgroundMood}\`
- background: \`${background}\`
- accent: \`${accent}\`
- ink: \`${ink}\`
- displayFont: \`${displayFont}\`
- bodyFont: \`${bodyFont}\`
- headlineSize: \`${headlineSize}\`
- coverSize: \`${coverSize}\`
- bodySize: \`${bodySize}\`
- textStyle: \`${textStyle}\`
`;

    await fs.writeFile(intakeJsonPath, `${JSON.stringify(intake, null, 2)}\n`);
    await fs.writeFile(intakeMdPath, md);

    const prompt = `# Session Prompt

Use $codex-carousel-imagegen.

Прочитай настройки из carousel-output/intake.json и не задавай повторно вопросы, если они уже заполнены.
Поля фона, шрифтов и кегля из intake перенеси в styleLock как есть. Это выбор пользователя, не заменяй его стилем по умолчанию.
Рендер применяет styleLock.background, ink, accent, displayFont, bodyFont, headlineSize, coverSize, bodySize.

Сделай карусель по моему тексту.
В Claude Code картинки фона делай через scripts/fal_imagegen.py, модель openai/gpt-image-2.5/flare/text-to-image.
В Codex для imagegen-only используй встроенную генерацию изображений, не OPENAI_API_KEY.
`;
    await fs.writeFile(sessionPromptPath, `${prompt}\n`);

    console.log("\nСохранено:");
    console.log(`- ${intakeJsonPath}`);
    console.log(`- ${intakeMdPath}`);
    console.log(`- ${sessionPromptPath}`);
    console.log("\nСтартовый prompt для Codex:\n");
    console.log(prompt);
  } finally {
    rl.close();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

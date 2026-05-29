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
      ? getArg("--background") || "минималистичный"
      : await ask(
          "Фон и настроение? например журнальный, плёночный, технологичный, минималистичный",
          "минималистичный"
        );
    const textStyle = nonInteractive
      ? getArg("--text-style") || "крупный заголовок"
      : await ask(
          "Текстовый стиль? например крупный заголовок, плотный набор, editorial, friendly",
          "крупный заголовок"
        );

    const intake = {
      generationMode,
      platform,
      tone,
      backgroundMood,
      textStyle,
      createdAt: new Date().toISOString()
    };

    const md = `# Intake

- generationMode: \`${generationMode}\`
- platform: \`${platform}\`
- tone: \`${tone}\`
- backgroundMood: \`${backgroundMood}\`
- textStyle: \`${textStyle}\`
`;

    await fs.writeFile(intakeJsonPath, `${JSON.stringify(intake, null, 2)}\n`);
    await fs.writeFile(intakeMdPath, md);

    const prompt = `# Session Prompt

Use $codex-carousel-imagegen.

Прочитай настройки из carousel-output/intake.json и не задавай повторно вопросы, если они уже заполнены.

Сделай карусель по моему тексту.
Если нужен imagegen-only, используй встроенную генерацию изображений Codex, а не skill/API workflow с OPENAI_API_KEY.
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

# codex-carousel-imagegen

Локальный skill и workflow для генерации каруселей в Codex под Telegram, Instagram, LinkedIn и другие площадки.

Главная идея проекта:
- текст слайдов рендерится локально через HTML/CSS/React для стабильной кириллицы
- изображения используются как вспомогательный слой (фон, метафоры, иллюстрации)
- экспорт идёт в PNG `1080x1350`

## Что умеет

- принимает тему, текст, статью или тезисы
- собирает структуру карусели (обычно 5-10 слайдов)
- сохраняет бриф, style lock, промты и данные рендера
- поддерживает режимы:
  - `hybrid`
  - `render-only`
  - `imagegen-only`
- экспортирует слайды в `carousel-output/png/`

## Что не требуется

- `OPENAI_API_KEY`
- Gemini API
- Google AI API
- Replicate
- Buffer API
- Figma API

В Claude Code фоны и иллюстрации идут через fal.ai Nano Banana, скрипт `.agents/skills/codex-carousel-imagegen/scripts/fal_nano_banana.py`. Если ключа нет, агент спрашивает его и сохраняет в `~/.config/fal/key` с правами `600`. В репозиторий ключ не кладётся.

## Структура

```text
carousel-skill-lab/
  .agents/skills/codex-carousel-imagegen/
  .codex/skills/codex-carousel-imagegen/  -> симлинк на .agents
  .claude/skills/codex-carousel-imagegen/ -> симлинк на .agents
  carousel-renderer/
  carousel-output/
  examples/
  scripts/
  install.sh
  package.json
```

## Быстрый старт

```bash
cd carousel-skill-lab
chmod +x install.sh
./install.sh
npm install
```

Запуск Codex:

```bash
codex
```

## Рекомендуемый запуск сценария

1. Зафиксируй входные параметры:

```bash
npm run kickoff
```

или без интерактива:

```bash
npm run kickoff -- --non-interactive --mode hybrid --platform telegram --tone бодро --background "журнальный с лёгкой плёнкой" --text-style "крупный заголовок"
```

2. Открой файл `carousel-output/SESSION_PROMPT.md` и используй этот prompt в Codex.

3. Для `hybrid` и `render-only` экспортируй:

```bash
npm run export
```

Важно:
- если в `intake.json` выбран `imagegen-only`, `npm run export` остановится с ошибкой по дизайну (чтобы не выдавать старые render PNG за новые imagegen результаты)

## Проверка стабильности

```bash
npm run validate
```

Валидация проверяет:
- наличие intake/session файлов
- корректный формат skill (`YAML frontmatter`)
- наличие установленной user-level копии skill
- успешный экспорт для режимов не `imagegen-only`

## Куда сохраняется результат

```text
carousel-output/
  brief.md
  slides.md
  style-lock.md
  image-prompts.md
  carousel-data.json
  intake.json
  intake.md
  SESSION_PROMPT.md
  assets/
  render/
  png/
```

## Примечание по `imagegen-only`

`imagegen-only` рассчитан на встроенную генерацию изображений в Codex-сессии.
В этом режиме проект не должен подменять генерацию API-key workflow.

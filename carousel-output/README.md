# Carousel Output

## Что внутри
- `brief.md` — рабочий бриф
- `slides.md` — структура 4 слайдов
- `style-lock.md` — зафиксированный визуальный стиль
- `image-prompts.md` — промпты для imagegen-only
- `carousel-data.json` — контракт данных карусели
- `png/slide-01.png ... slide-04.png` — финальные слайды

## Режим
`imagegen-only` для Telegram, тон `бодро`, стиль `яркий pop-up`, крупные заголовки.

## Ограничение режима
Длинный русский текст в imagegen-only предсказуем хуже, чем в HTML/React рендере.

## Повторный запуск
Если нужно пересобрать через локальный рендер fallback:

```bash
cd carousel-skill-lab
npm run export
```

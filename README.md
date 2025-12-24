# ctf-gpt

Automation helper that logs into ChatGPT in a persistent browser profile and
submits a prompt, then prints the latest assistant response.

## Русский
Скрипты для автоматизации ChatGPT через постоянный профиль браузера:
вводят промпт и печатают последний ответ ассистента.

## Requirements
- Node.js 18+
- Google Chrome installed (default path: `/usr/bin/google-chrome-stable`)

## Требования
- Node.js 18+
- Установлен Google Chrome (путь по умолчанию: `/usr/bin/google-chrome-stable`)

## Install dependencies and browsers
```bash
npm install
npx playwright install --with-deps
```

## Установка зависимостей и браузеров
```bash
npm install
npx playwright install --with-deps
```

## Setup
```bash
npm install
```

## Установка
```bash
npm install
```

## First-time login (creates a persistent profile)
```bash
node login-once.cjs
```
Complete the Cloudflare + ChatGPT login in the opened browser window. The
profile will be saved in `gpt-prof/` and reused by `ask-gpt.cjs`.

## Первый вход (создаёт постоянный профиль)
```bash
node login-once.cjs
```
Пройдите Cloudflare + ChatGPT логин в открывшемся окне браузера. Профиль
сохранится в `gpt-prof/` и будет использоваться `ask-gpt.cjs`.

## Usage
```bash
node ask-gpt.cjs "Your prompt"
node ask-gpt.cjs --profile /abs/path/to/gpt-prof "Your prompt"
node ask-gpt.cjs --show "Your prompt"
node ask-gpt.cjs --timeout 180000 "Your prompt"
```

## Использование
```bash
node ask-gpt.cjs "Ваш промпт"
node ask-gpt.cjs --profile /abs/path/to/gpt-prof "Ваш промпт"
node ask-gpt.cjs --show "Ваш промпт"
node ask-gpt.cjs --timeout 180000 "Ваш промпт"
```

## Notes
- Do not commit `auth.json`, `gpt-prof/`, or `gpt-profile/`. They contain
  local cookies/profile data and are ignored by `.gitignore`.

## Примечания
- Не коммитьте `auth.json`, `gpt-prof/` или `gpt-profile/`. Там локальные
  куки и данные профиля; они добавлены в `.gitignore`.

/**
 * Usage:
 *   node ask-gpt.cjs "Ваш вопрос"
 *   node ask-gpt.cjs --profile /abs/path/to/gpt-prof "Ваш вопрос"
 *   node ask-gpt.cjs --show "Ваш вопрос"         # показать окно
 *   node ask-gpt.cjs --timeout 180000 "..."      # таймаут ожидания ответа (мс)
 */

const { addExtra } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const minimist = require('minimist');
const path = require('path');

// --- CLI ---
const argv       = minimist(process.argv.slice(2), {
  boolean: ['show'],
  string : ['profile', 'model'],
  alias  : { p: 'profile' }
});
const PROMPT     = argv._.join(' ').trim();
const PROFILE    = path.resolve(argv.profile || './gpt-prof');
const HEADLESS   = !argv.show;
const TIMEOUT    = Number(argv.timeout ?? 180000);   // 3 минуты по умолчанию
const CHROME_BIN = '/usr/bin/google-chrome-stable';  // у вас 139.0.7258.127

if (!PROMPT) {
  console.error('❌ Укажите вопрос. Пример:\n  node ask-gpt.cjs --show "2+2?"');
  process.exit(1);
}

// --- Playwright + Stealth ---
const chromium = addExtra(require('playwright').chromium);
chromium.use(StealthPlugin());

// --- Хелперы селекторов под текущий DOM ChatGPT ---
// Реальный инпут — ProseMirror DIV с id="prompt-textarea" (см. ваши дампы).
// Fallback <textarea name="prompt-textarea"> скрыт display:none.
const SELECTORS = {
  composerEditable: '#prompt-textarea[contenteditable="true"]',
  composerAnyEditable: 'div[contenteditable="true"]#prompt-textarea, div[contenteditable="true"][data-virtualkeyboard]',
  submitBtn: '#composer-submit-button',
  stopButton: '[data-testid="stop-button"]',
  assistantMarkdown: 'div[data-message-author-role="assistant"] div.markdown',
};

// --- Основная логика ---
(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CHROME_BIN,
    headless: HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = ctx.pages()[0] || await ctx.newPage();

  // Переходим на chatgpt.com (куки с login-once остаются, потому что тот же профиль)
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });

  // Проверка, что редактор появился (ProseMirror DIV, не textarea)
  const editable = page.locator(SELECTORS.composerEditable);
  await editable.waitFor({ timeout: 60000 }); // ждём поле "Ask anything" (ProseMirror)

  // На всякий случай закрываем модалки типа "Log in to unlock..." или прочие баннеры
  // Ничего критичного, просто best-effort.
  try {
    await page.locator('button:has-text("Log in"), button[aria-label="Close"]').first().click({ timeout: 1500 });
  } catch {}

  // Вводим промпт в ProseMirror:
  await editable.click({ timeout: 15000 });
  // Для ProseMirror/контента с contenteditable надёжнее посимвольно:
  await page.locator(SELECTORS.composerAnyEditable).pressSequentially(PROMPT, { delay: 10 });

  // Отправка: сначала попробуем клик по кнопке отправки (id стабильный),
  // если кнопки нет — дублируем Enter.
  const submit = page.locator(SELECTORS.submitBtn);
  if (await submit.isVisible().catch(() => false)) {
    await submit.click();
  } else {
    await page.keyboard.press('Enter');
  }

  // Во время ответа появляется "Stop" с data-testid="stop-button".
  // Ждём появления… и затем исчезновения (окончание стриминга).
  // Появление может быть быстрым — не падаем, если не успели увидеть.
  try {
    await page.locator(SELECTORS.stopButton).waitFor({ state: 'visible', timeout: 10000 });
  } catch {}
  await page.locator(SELECTORS.stopButton).waitFor({ state: 'detached', timeout: TIMEOUT });

  // Забираем последний ответ ассистента
  const answer = await page.evaluate((sel) => {
    const nodes = Array.from(document.querySelectorAll(sel));
    const last  = nodes.at(-1);
    return last ? last.innerText.trim() : '';
  }, SELECTORS.assistantMarkdown);

  if (!answer) {
    console.error('⚠️ Ответ не распознан. Возможно, DOM изменился или поток прерван.');
  } else {
    console.log('\n=== Ответ ChatGPT ===\n' + answer + '\n');
  }

  await ctx.close();
})().catch(async (err) => {
  console.error('💥 Ошибка:', err);
  process.exit(2);
});

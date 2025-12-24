/**
 * node ask-gpt.cjs "Ваш вопрос"
 * node ask-gpt.cjs --profile /abs/path/gpt-prof "Ваш вопрос"
 *
 * Требования:
 *   - папка gpt-prof должна содержать профиль (после login-once.cjs)
 *   - установлен /usr/bin/google-chrome-stable 139.x
 *   - npm i playwright playwright-extra puppeteer-extra-plugin-stealth minimist
 */

const path           = require('path');
const minimist       = require('minimist');
const { addExtra }   = require('playwright-extra');
const StealthPlugin  = require('puppeteer-extra-plugin-stealth');

// -------- CLI ----------
const argv        = minimist(process.argv.slice(2), { string: ['profile'] });
const PROMPT      = argv._.join(' ').trim();
const PROFILE_DIR = path.resolve(argv.profile || './gpt-prof');
const CHROME_BIN  = '/usr/bin/google-chrome-stable';

if (!PROMPT) {
  console.log('❌ Укажите промпт.\nПример:\n  node ask-gpt.cjs "Привет, GPT!"');
  process.exit(1);
}

// -------- Playwright + Stealth ----------
const chromium = addExtra(require('playwright').chromium);
chromium.use(StealthPlugin()); // прячем navigator.webdriver и т.п.

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath : CHROME_BIN,
    headless       : false,                // headed — нужен для keyring
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--password-store=basic',            // сохраняем пароли в plain-text
      '--use-mock-keychain'
    ]
  });

  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://chat.openai.com/', { waitUntil: 'domcontentloaded' });

  // Если есть логин-форма — значит не залогинены
  if (await page.$('input[name="username"]')) {
    console.error('❌ Вы не залогинены: сначала выполните login-once.cjs или войдите вручную');
    await ctx.close(); return;
  }

  // Отправляем промпт
  await page.waitForSelector('textarea[data-id]:not([disabled])');
  await page.fill('textarea[data-id]:not([disabled])', PROMPT);
  await page.keyboard.press('Enter');

  // Ждём появления ответа ассистента
  await page.waitForSelector(
    '[data-message-author-role="assistant"][data-message-status="finished_success"] div.markdown',
    { timeout: 180_000 }
  );

  const answer = await page.$$eval(
    '[data-message-author-role="assistant"] div.markdown',
    els => els.at(-1).innerText.trim()
  );

  console.log('\n=== Ответ ChatGPT ===\n' + answer + '\n');
  await ctx.close();
})();

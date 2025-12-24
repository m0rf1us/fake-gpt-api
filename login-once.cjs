// login-once.cjs
const { addExtra } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

const PROFILE = path.resolve('./gpt-prof');
const CHROME = '/usr/bin/google-chrome-stable';

const chromium = addExtra(require('playwright').chromium);
chromium.use(StealthPlugin());

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath : CHROME,
    headless       : false,
    args           : ['--no-sandbox',
                      '--disable-blink-features=AutomationControlled']
  });

  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://chat.openai.com/auth/login');

  console.log(
    '\nLogin once in the opened browser window (Cloudflare + ChatGPT).\n' +
    'Close the window after a successful login.\n'
  );
})();

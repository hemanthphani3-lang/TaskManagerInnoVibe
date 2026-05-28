const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Capture page console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.type().toUpperCase(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    console.log("Navigating to login...");
    await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle0' });
    
    require('dotenv').config({ path: '.env.local' });
    const testEmail = process.env.TEST_EMAIL || 'hemanthphani3@gmail.com';
    const testPassword = process.env.TEST_PASSWORD;
    if (!testPassword) {
      console.error("Error: TEST_PASSWORD is not defined in .env.local");
      process.exit(1);
    }

    console.log("Logging in...");
    await page.type('input[id="email"]', testEmail);
    await page.type('input[id="password"]', testPassword);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    console.log("Logged in! Current URL:", page.url());
    
    console.log("Looking for Tasks link in sidebar...");
    const linkSelector = 'a[href="/department/tasks"]';
    await page.waitForSelector(linkSelector);
    
    console.log("Clicking Tasks link...");
    await page.click(linkSelector);
    
    // Wait a bit to see if navigation happens or if an error is thrown
    await new Promise(r => setTimeout(r, 5000));
    
    console.log("URL after click:", page.url());
    
    await browser.close();
  } catch (err) {
    console.error("SCRIPT ERROR:", err);
    process.exit(1);
  }
})();

const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log("Navigating to login...");
    await page.goto('http://localhost:8080/login');
    
    require('dotenv').config({ path: '.env.local' });
    const testEmail = process.env.TEST_EMAIL || 'hemanthphani3@gmail.com';
    const testPassword = process.env.TEST_PASSWORD;
    if (!testPassword) {
      console.error("Error: TEST_PASSWORD is not defined in .env.local");
      process.exit(1);
    }

    // Login
    await page.type('input[id="email"]', testEmail);
    await page.type('input[id="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    console.log("Waiting for navigation...");
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    console.log("Current URL:", page.url());
    
    // Screenshot
    await page.screenshot({ path: 'C:\\Users\\heman\\.gemini\\antigravity\\brain\\307cf3d1-b254-4dcb-87d2-6bd0b151da91\\scratch\\dashboard.png' });
    console.log("Screenshot saved.");
    
    // Get console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();

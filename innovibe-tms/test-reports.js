const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Capture page console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.type().toUpperCase(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    console.log("Navigating to login...");
    await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle0' });
    
    console.log("Logging in...");
    await page.type('input[type="email"]', 'hemanthphani3@gmail.com');
    await page.type('input[type="password"]', 'Innovibe@123');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    console.log("Logged in! Current URL:", page.url());
    
    console.log("Navigating to reports page...");
    await page.goto('http://localhost:8080/department/reports', { waitUntil: 'networkidle0' });
    
    console.log("Clicking Generate & Download...");
    const buttonSelector = 'button:has(svg.lucide-download)';
    await page.waitForSelector(buttonSelector);
    await page.click(buttonSelector);
    
    // Wait a bit to see if an error is thrown
    await new Promise(r => setTimeout(r, 5000));
    
    await browser.close();
  } catch (err) {
    console.error("SCRIPT ERROR:", err);
    process.exit(1);
  }
})();

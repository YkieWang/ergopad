
const puppeteer = require('puppeteer');

(async () => {
  // 启动浏览器
  // 注意：在某些环境（如容器或 CI）中，可能需要 '--no-sandbox'
  const browser = await puppeteer.launch({ 
    headless: true, // 无头模式，不需要界面
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();

  // 监听并打印页面内的 console 报错
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser Console Error:', msg.text());
    } else {
      console.log('Browser Console:', msg.text());
    }
  });

  // 监听未捕获的异常
  page.on('pageerror', err => {
    console.error('Browser Page Error:', err.toString());
  });

  // 访问本地 Vite 服务（假设是 5174，或之前的 5173，脚本最好能自适应或重试）
  // 这里暂时硬编码为刚才看到的 5174，如果不通，脚本会报错
  const url = 'http://localhost:3000/';
  console.log(`Navigating to ${url}...`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0' }); // 等待网络空闲

    // 检查是否有预期的 UI 元素（例如 "Ergopad" 标题或特定的类名）
    // 我们的 App 中有个 .app 容器，或者查找按钮文本
    const appElement = await page.$('.app');
    
    if (appElement) {
      console.log('SUCCESS: Found .app element. Page loaded!');
    } else {
      console.error('FAILURE: .app element not found. Page might be blank.');
      // 如果找不到，打印一下 body 内容看看有什么
      const bodyHTML = await page.evaluate(() => document.body.innerHTML);
      console.log('Body HTML:', bodyHTML.substring(0, 500)); // 只打印前500字
    }

  } catch (error) {
    console.error('Navigation failed:', error);
  } finally {
    await browser.close();
  }
})();

export default async function run(page) {
  await page.goto('http://127.0.0.1:8931/probe.html', { waitUntil: 'networkidle', timeout: 45000 }).catch(() => { });
  await page.waitForTimeout(1500);
  return await page.evaluate(() => ({
    readyState: document.readyState,
    react: typeof React,
    babel: typeof Babel,
    probeLog: window.__probeLog
  }));
}

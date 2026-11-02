export default async function run(page) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:5188/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => ({
    reactChildren: document.getElementById('react-root')?.childElementCount,
    authVisible: document.getElementById('authScreen') ? !document.getElementById('authScreen').classList.contains('hidden') : false,
    heading: document.querySelector('#authScreen h1')?.textContent || document.body.innerText.slice(0, 60)
  }));
  await page.screenshot({ path: 'qa-dev.png' });
  return { errors: errors.slice(0, 8), state };
}

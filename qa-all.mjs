export default async function run(page) {
  // Log EVERY console message and network response during boot
  const events = [];
  page.on('console', m => events.push(m.type().slice(0, 4) + ': ' + m.text().slice(0, 220)));
  page.on('response', r => { if (r.status() >= 400) events.push('HTTP ' + r.status() + ' ' + r.url().slice(0, 150)); });
  page.on('requestfailed', r => events.push('FAIL ' + r.url().slice(0, 150) + ' ' + (r.failure()?.errorText || '')));
  await page.goto('http://127.0.0.1:8931/index.html', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(25000);
  return events.slice(0, 40);
}

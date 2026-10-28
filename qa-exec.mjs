export default async function run(page) {
  await page.goto('http://127.0.0.1:8931/probe.html', { waitUntil: 'networkidle', timeout: 45000 }).catch(() => { });
  await page.waitForTimeout(1500);
  return await page.evaluate(() => {
    const results = {};
    for (const s of document.scripts) {
      if (!s.src) continue;
      const name = s.src.split('/').pop();
      results[name] = s.__loaded === true;
    }
    return { probeLog: window.__probeLog, tags: results };
  });
}

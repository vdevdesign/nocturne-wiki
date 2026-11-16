export default async function run(page, ui) {
  // React fetched fine but executing the inline script did NOT define window.React
  // => script execution is blocked. Check for sandbox/extension-level blockers.
  await page.goto('about:blank');
  const probe = await page.evaluate(() => {
    return new Promise(resolve => {
      window.__probe = undefined;
      const s = document.createElement('script');
      s.textContent = 'window.__probe = "INLINE SCRIPT RAN";';
      s.onload = () => resolve('onload fired');
      s.onerror = e => resolve('onerror fired');
      document.head.appendChild(s);
      setTimeout(() => resolve('inline result: ' + JSON.stringify(window.__probe)), 300);
    });
  });
  return probe;
}

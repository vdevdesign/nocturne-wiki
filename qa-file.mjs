export default async function run(page, ui) {
  // Test the file:// scenario the user may be hitting
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto('file:///C:/Users/pixel/Documents/VSCode/nocturne-wiki/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => ({
    protocol: location.protocol,
    logoStatus: typeof window.nocturneLogoStatus !== 'undefined' ? window.nocturneLogoStatus : 'UNDEF',
    flashbangStatus: typeof window.nocturneFlashbangStatus !== 'undefined' ? window.nocturneFlashbangStatus : 'UNDEF',
    react: typeof window.React,
    babel: typeof window.Babel,
    authShown: !!document.querySelector('#authScreen')
  }));
  return { state, errors: errors.slice(0, 8) };
}

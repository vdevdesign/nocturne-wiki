export default async function run(page, ui) {
  await page.goto('http://localhost:5199/index.html', { waitUntil: 'networkidle' });
  // Wait for app code (up to 45s for slow CDN)
  try {
    await page.waitForFunction(() => typeof window.setNocturneLayerMotif === 'function', null, { timeout: 45000 });
  } catch (_) {
    return { appBooted: false, react: await page.evaluate(() => typeof window.React) };
  }
  // Wait for both SVG motifs to resolve
  await page.waitForFunction(() =>
    ['ready', 'error'].includes(String(window.nocturneLogoStatus)) &&
    ['ready', 'error'].includes(String(window.nocturneFlashbangStatus)), null, { timeout: 20000 });
  const out = { appBooted: true, logoStatus: null, flashbangStatus: null };
  // 1) flashbang motif renders its SVG artwork
  await page.evaluate(() => window.setNocturneLayerMotif('main', 'flashbang'));
  await page.waitForTimeout(600);
  out.flashbangRendered = await page.evaluate(() => !!document.querySelector('#nocturnePatternLayer .flashbang-motif svg'));
  // 2) logo motif renders
  await page.evaluate(() => window.setNocturneLayerMotif('main', 'logo'));
  await page.waitForTimeout(600);
  out.logoRendered = await page.evaluate(() => !!document.querySelector('#nocturnePatternLayer .nocturne-logo-motif svg'));
  out.logoStatus = await page.evaluate(() => window.nocturneLogoStatus);
  out.flashbangStatus = await page.evaluate(() => window.nocturneFlashbangStatus);
  // 3) header logo = masked Nocturne_Logo.svg (computed mask-image)
  out.headerMask = await page.evaluate(() => {
    const el = document.querySelector('nav .brand-sigil, #appSidebar .brand-sigil');
    if (!el) return 'no element';
    const cs = getComputedStyle(el);
    return (cs.maskImage || cs.webkitMaskImage || 'none').includes('Nocturne_Logo') ? 'Nocturne_Logo.svg OK' : (cs.maskImage || cs.webkitMaskImage || 'none');
  });
  return out;
}

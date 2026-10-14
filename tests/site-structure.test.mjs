import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function publicFiles(directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'tests') continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await publicFiles(absolute));
    else files.push(relative(root, absolute));
  }

  return files.sort();
}

test('publishes only the approved HTML routes', async () => {
  const html = (await publicFiles()).filter((path) => path.endsWith('.html'));
  assert.deepEqual(html, ['404.html', 'index.html']);
});

test('repository root is the receiver node', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(html, /data-receiver/);
  assert.match(html, /<title>Receiver<\/title>/);
  assert.equal((html.match(/<a\b/gi) ?? []).length, 1);
});

test('404 contains the approved dead-signal sequence and no route out', async () => {
  const html = await readFile(join(root, '404.html'), 'utf8');
  assert.match(html, /Сигнал не существует\./);
  assert.match(html, /Или ещё не существует\./);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(html, /<a\b/i);
});

test('public HTML omits site chrome, tracking, forms, and identifying metadata', async () => {
  const files = (await publicFiles()).filter((path) => path.endsWith('.html'));
  const html = (await Promise.all(files.map((path) => readFile(join(root, path), 'utf8')))).join('\n');
  assert.doesNotMatch(html, /<nav\b|<footer\b|<form\b|<input\b/i);
  assert.doesNotMatch(html, /google-analytics|googletagmanager|segment\.com|plausible\.io/i);
  assert.doesNotMatch(html, /Чёрный эфир|ETHER\s*RP|github/i);
});

test('public paths contain no receiver route beyond the current node', async () => {
  const paths = await publicFiles();
  const receiverPaths = paths.filter((path) => /receiver-\d+/i.test(path));
  assert.ok(receiverPaths.every((path) => /receiver-01(?:\/|$)/i.test(path)));
});

test('receiver shell is neutral, unlinked, and references only current assets', async () => {
  const receiverPath = join(root, 'index.html');
  assert.ok((await publicFiles()).includes('index.html'), 'receiver shell must exist');
  const html = await readFile(receiverPath, 'utf8');
  assert.match(html, /<title>Receiver<\/title>/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /void-(?:empty|seated|near)\.webp/);
  assert.doesNotMatch(html, /void-static\.webp/);
  assert.match(html, /assets\/js\/receiver\.js/);
  assert.equal((html.match(/<a\b/gi) ?? []).length, 1);
  assert.doesNotMatch(html, /<form\b|<input\b/i);
});

test('receiver keeps text outside the television screen', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  assert.match(html, /<div class="screen-mask" aria-hidden="true"><\/div>/);
  assert.doesNotMatch(html, /screen-mask[^>]*>\s*<p/);
  assert.match(html, /class="signal-message opening-caption"[^>]*data-opening-text/);
  assert.match(html, /class="signal-message signal-caption"[^>]*data-signal-text/);
  assert.match(html, /class="signal-message voice-caption"[^>]*data-voice-text/);
});

test('the sofa link is invisible and active only while the lit scene is visible', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const css = await readFile(join(root, 'assets/css/receiver.css'), 'utf8');
  const stageEnd = html.indexOf('</main>');
  const sofaLink = html.indexOf('data-sofa-link');

  assert.ok(sofaLink > 0 && sofaLink < stageEnd);
  assert.match(html, /href="https:\/\/divan-kiev\.com\.ua\/\?srsltid=AU7gw4UocEOVrxQk2sNgniIoStBjZBmR5m-JZsHaBXyc6Z52ZEQv0d9b"/);
  assert.match(html, /class="sofa-hotspot"[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"[\s\S]*?><\/a>/);
  assert.match(css, /\.sofa-hotspot\s*\{[\s\S]*?visibility:\s*hidden;[\s\S]*?pointer-events:\s*none;/);
  assert.match(css, /\.receiver-page\.is-powered:not\(\.is-off\):not\(\[data-scene="black"\]\) \.sofa-hotspot\s*\{[\s\S]*?visibility:\s*visible;[\s\S]*?pointer-events:\s*auto;/);
});

test('receiver has separate television and post-shutdown cipher captions', async () => {
  const html = await readFile(join(root, 'index.html'), 'utf8');
  const stageEnd = html.indexOf('</main>');
  const televisionCaption = html.indexOf('data-tv-text');
  const epilogueCaption = html.indexOf('data-epilogue-text');

  assert.ok(televisionCaption > 0 && televisionCaption < stageEnd);
  assert.ok(epilogueCaption > stageEnd);
});

test('public source contains no embedded answer or completed future route', async () => {
  const files = (await publicFiles()).filter((path) => /\.(?:html|css|js)$/i.test(path));
  const source = (await Promise.all(files.map((path) => readFile(join(root, path), 'utf8')))).join('\n');

  assert.doesNotMatch(source, /data-answer/i);
  assert.doesNotMatch(source, /unclaimed-signal\.github\.io\/[a-z]+-[a-z]+-[a-z]+\//i);
});

test('signal and voice captions have distinct placement rules', async () => {
  const css = await readFile(join(root, 'assets/css/receiver.css'), 'utf8');
  assert.match(css, /\.opening-caption\s*\{/);
  assert.match(css, /\.signal-caption\s*\{/);
  assert.match(css, /\.voice-caption\s*\{/);
  assert.match(css, /\.tv-caption\s*\{/);
  assert.match(css, /\.epilogue-caption\s*\{/);
});

test('Dante clue is placed above the television rather than inside its screen', async () => {
  const css = await readFile(join(root, 'assets/css/receiver.css'), 'utf8');
  assert.match(css, /\.tv-caption\s*\{[\s\S]*?top:\s*16%;[\s\S]*?left:\s*55%;[\s\S]*?width:\s*36%;/);
  assert.match(css, /@media \(orientation: portrait\)[\s\S]*?\.tv-caption\s*\{[\s\S]*?top:\s*12%;[\s\S]*?left:\s*37%;[\s\S]*?width:\s*38%;/);
});

test('portrait captions stay inside the cropped cinematic stage', async () => {
  const css = await readFile(join(root, 'assets/css/receiver.css'), 'utf8');
  assert.match(css, /@media \(orientation: portrait\)[\s\S]*?\.voice-caption\s*\{[\s\S]*?left:\s*24%;[\s\S]*?width:\s*54%;/);
  assert.match(css, /@media \(orientation: portrait\)[\s\S]*?\.signal-caption\s*\{[\s\S]*?left:\s*37%;[\s\S]*?width:\s*38%;/);
});

test('reduced motion preserves the portrait crop during glitches', async () => {
  const css = await readFile(join(root, 'assets/css/receiver.css'), 'utf8');
  assert.match(css, /@media \(orientation: portrait\) and \(prefers-reduced-motion: reduce\)[\s\S]*?\.has-signal-break \.receiver-stage\s*\{[\s\S]*?transform:\s*translateX\(-39vw\);/);
});

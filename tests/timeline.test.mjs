import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const timelinePath = join(root, 'assets/js/timeline.js');

async function loadTimeline() {
  assert.ok(existsSync(timelinePath), 'timeline.js must exist');
  const module = await import(`${pathToFileURL(timelinePath).href}?test=${Date.now()}`);
  return module.TIMELINE;
}

test('timeline contains the exact transmission copy in order', async () => {
  const timeline = await loadTimeline();
  const spoken = timeline
    .filter(({ type, value }) => type === 'text' && value)
    .map(({ value }) => value);

  assert.deepEqual(spoken, [
    'ПРИЁМНИК 01',
    'Сигнал подтверждён.',
    'Вы находитесь дальше, чем должны.',
    'Это хорошо.',
    '— Ну вот.',
    '— Значит, вы всё-таки умеете выходить дальше.',
    '— Виженер был бы доволен.',
    'Второй эфир сам вас не найдёт.',
    'Для него понадобится ключ.',
    'Но пока его у вас нет.',
    'СЛЕДУЮЩИЙ ЭФИР // 04.10.2026',
    '«Lasciate ogne speranza, voi ch’intrate.»',
    'INFERNO // III',
    'YPXV-WVSHGJX-YOCD\n\nunclaimed-signal.github.io/____-_______-____/',
  ]);
});

test('timeline powers on after darkness and off within the approved duration', async () => {
  const timeline = await loadTimeline();
  const powerEvents = timeline.filter(({ type }) => type === 'power');
  assert.ok(powerEvents[0].at >= 2000 && powerEvents[0].at <= 4000);
  assert.equal(powerEvents[0].value, 'on');
  assert.ok(powerEvents.at(-1).at >= 52000 && powerEvents.at(-1).at <= 56000);
  assert.equal(powerEvents.at(-1).value, 'off');
});

test('timeline is ordered and teleports through the approved scene states', async () => {
  const timeline = await loadTimeline();
  assert.ok(timeline.every((event, index) => index === 0 || event.at >= timeline[index - 1].at));
  assert.deepEqual(
    timeline.filter(({ type }) => type === 'scene').map(({ value }) => value),
    ['black', 'empty', 'seated', 'near', 'seated', 'empty'],
  );
});

test('system text and the old man voice use separate presentation channels', async () => {
  const timeline = await loadTimeline();
  const channels = timeline
    .filter(({ type, value }) => type === 'text' && value)
    .map(({ channel }) => channel);
  assert.deepEqual(channels, [
    'opening', 'opening', 'opening', 'opening',
    'voice', 'voice', 'voice',
    'signal', 'signal', 'signal',
    'tv', 'tv', 'tv',
    'epilogue',
  ]);
});

test('next transmission reveals only its date and Dante clue', async () => {
  const timeline = await loadTimeline();
  const copy = timeline.filter(({ type }) => type === 'text').map(({ value }) => value).join('\n');
  assert.match(copy, /04\.10\.2026/);
  assert.match(copy, /Lasciate ogne speranza, voi ch.intrate/);
  assert.match(copy, /INFERNO \/\/ III/);
  assert.doesNotMatch(copy, /КЛЮЧ\s*[:=]|KEY\s*[:=]/i);
});

test('Dante clue stays on the television and quietly marks its third word', async () => {
  const timeline = await loadTimeline();
  const date = timeline.find(({ value }) => value === 'СЛЕДУЮЩИЙ ЭФИР // 04.10.2026');
  const quote = timeline.find(({ value }) => value === '«Lasciate ogne speranza, voi ch’intrate.»');
  const canto = timeline.find(({ value }) => value === 'INFERNO // III');

  assert.equal(date.channel, 'tv');
  assert.equal(quote.channel, 'tv');
  assert.equal(quote.focus, 3);
  assert.equal(canto.channel, 'tv');
});

test('cipher appears only after the television has finished switching off', async () => {
  const timeline = await loadTimeline();
  const powerOff = timeline.findLast(({ type, value }) => type === 'power' && value === 'off');
  const cipher = timeline.find(({ channel }) => channel === 'epilogue');

  assert.ok(cipher.at >= powerOff.at + 520);
  assert.match(cipher.value, /^YPXV-WVSHGJX-YOCD\n\nunclaimed-signal\.github\.io\/____-_______-____\/$/);
});

test('timeline events expose only the supported interface', async () => {
  const timeline = await loadTimeline();
  const allowedTypes = new Set(['power', 'scene', 'text', 'glitch']);
  assert.ok(Object.isFrozen(timeline));
  assert.ok(timeline.every(({ at, type, value }) => Number.isFinite(at) && allowedTypes.has(type) && typeof value === 'string'));
});

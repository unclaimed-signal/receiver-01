import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('opening the receiver module leaves one greeting in the developer console', async () => {
  const originalDocument = globalThis.document;
  const originalLog = console.log;
  const messages = [];

  globalThis.document = { querySelector: () => null };
  console.log = (...parts) => messages.push(parts.join(' '));

  try {
    const receiverPath = join(root, 'assets/js/receiver.js');
    await import(`${pathToFileURL(receiverPath).href}?test=${Date.now()}`);
  } finally {
    console.log = originalLog;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }

  assert.deepEqual(messages, ['— Тут тоже ничего. Но раз уж пришёл — здравствуй.']);
});

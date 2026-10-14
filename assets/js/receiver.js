import { TIMELINE } from './timeline.js';

console.log('— Тут тоже ничего. Но раз уж пришёл — здравствуй.');

const receiver = document.querySelector('[data-receiver]');
const frame = receiver?.querySelector('[data-scene-frame]');
const messages = Object.freeze({
  opening: receiver?.querySelector('[data-opening-text]'),
  signal: receiver?.querySelector('[data-signal-text]'),
  voice: receiver?.querySelector('[data-voice-text]'),
  tv: receiver?.querySelector('[data-tv-text]'),
  epilogue: receiver?.querySelector('[data-epilogue-text]'),
});

const scenes = Object.freeze({
  empty: 'assets/images/void-empty.webp',
  seated: 'assets/images/void-seated.webp',
  near: 'assets/images/void-near.webp',
});

// — А сюда зачем полез?
function preloadScenes() {
  return Promise.allSettled(Object.values(scenes).map((source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', reject, { once: true });
    image.src = source;
  })));
}

function setScene(name) {
  if (!receiver || !frame) return;
  if (name !== 'black' && !scenes[name]) return;
  if (scenes[name]) frame.src = scenes[name];
  receiver.dataset.scene = name;
}

function writeFocusedWords(message, value, focus) {
  const words = value.split(/(\s+)/);
  let wordNumber = 0;

  const nodes = words.map((part) => {
    if (/^\s+$/.test(part)) return document.createTextNode(part);
    wordNumber += 1;
    if (wordNumber !== focus) return document.createTextNode(part);

    const span = document.createElement('span');
    span.className = 'cipher-focus';
    span.textContent = part;
    return span;
  });

  message.replaceChildren(...nodes);
}

function setText(value, channel = 'signal', focus) {
  Object.values(messages).forEach((message) => {
    if (!message) return;
    message.textContent = '';
    message.classList.remove('is-visible', 'is-long');
  });

  const message = messages[channel];
  if (!message || !value) return;
  if (Number.isInteger(focus) && focus > 0) writeFocusedWords(message, value, focus);
  else message.textContent = value;
  message.classList.add('is-visible');
  message.classList.toggle('is-long', value.length > 34);
}

function setPower(value) {
  receiver.classList.toggle('is-powered', value === 'on');
  receiver.classList.toggle('is-off', value === 'off');
  if (value === 'off') setText('');
}

function glitch(strength) {
  const className = strength === 'break' ? 'has-signal-break' : 'has-signal-pulse';
  receiver.classList.add(className);
  window.setTimeout(() => receiver.classList.remove(className), strength === 'break' ? 230 : 120);
}

function applyEvent({ type, value, channel, focus }) {
  if (type === 'scene') setScene(value);
  if (type === 'text') setText(value, channel, focus);
  if (type === 'power') setPower(value);
  if (type === 'glitch') glitch(value);
}

if (receiver) {
  preloadScenes();
  TIMELINE.forEach((event) => window.setTimeout(() => applyEvent(event), event.at));
}

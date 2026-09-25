import {
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  SOURCE_HEIGHT,
  SOURCE_WIDTH,
  sourceUrl,
  styleFor,
} from './catalog';
import type { Tuning } from './catalog';
import { getTotalManifest, initialQueueState, queue, wrappedIndex } from './queue';
import type { Decision, QueueItem, QueueState } from './queue';
import './style.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Review root is missing');

const STORAGE_KEY = 'swn-portrait-review-queue-v1';
type SourceStatus = { ready: boolean; error?: string };
const sourceStatuses = new Map<string, SourceStatus>();
let state = readState();
let manifestVisible = false;
let message = '';

function readState(): QueueState {
  const initial = initialQueueState();

  // Carry forward dial drafts from the previous category-at-a-time jig.
  for (const category of new Set(queue.map((item) => item.category))) {
    try {
      const old = JSON.parse(localStorage.getItem('swn-portrait-hsv-' + category.key) || 'null');
      for (const item of queue.filter((candidate) => candidate.category.key === category.key)) {
        for (const variant of ['a', 'b'] as const) {
          for (const channel of ['h', 's', 'v'] as const) {
            const value = old?.[item.sourceId]?.[variant]?.[channel];
            if (validDial(channel, value)) initial.entries[item.path]![variant][channel] = value;
          }
        }
      }
    } catch {
      // A malformed old draft has no effect on the current queue.
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as QueueState | null;
    if (saved && Number.isInteger(saved.cursor))
      initial.cursor = wrappedIndex(saved.cursor, 0, queue.length);
    for (const item of queue) {
      const stored = saved?.entries?.[item.path];
      if (!stored) continue;
      if (stored.decision === 'accepted' || stored.decision === 'skipped')
        initial.entries[item.path]!.decision = stored.decision;
      for (const variant of ['a', 'b'] as const) {
        for (const channel of ['h', 's', 'v'] as const) {
          const value = stored[variant]?.[channel];
          if (validDial(channel, value)) initial.entries[item.path]![variant][channel] = value;
        }
      }
    }
  } catch {
    // Keep usable defaults if saved queue data is malformed.
  }
  return initial;
}

function validDial(channel: 'h' | 's' | 'v', value: unknown): value is number {
  if (!Number.isInteger(value)) return false;
  if (channel === 'h') return (value as number) >= -180 && (value as number) <= 180;
  if (channel === 's') return (value as number) >= 0 && (value as number) <= 200;
  return (value as number) >= 50 && (value as number) <= 150;
}

function persist(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function currentItem(): QueueItem {
  return queue[state.cursor]!;
}

function currentImageUrl(): string {
  const item = currentItem();
  return sourceUrl(item.category, item.sourceId);
}

function control(variant: 'a' | 'b', channel: 'h' | 's' | 'v', tuning: Tuning): string {
  const [minimum, maximum] = channel === 'h' ? [-180, 180] : channel === 's' ? [0, 200] : [50, 150];
  const label = channel === 'h' ? 'Hue' : channel === 's' ? 'Saturation' : 'Value';
  const unit = channel === 'h' ? '°' : '%';
  return (
    '<label class="dial">' +
    label +
    ' <output data-output="' +
    variant +
    '-' +
    channel +
    '">' +
    tuning[channel] +
    unit +
    '</output><input type="range" data-variant="' +
    variant +
    '" data-channel="' +
    channel +
    '" min="' +
    minimum +
    '" max="' +
    maximum +
    '" value="' +
    tuning[channel] +
    '"></label>'
  );
}

function preview(label: string, source: string, variant?: 'a' | 'b'): string {
  const entry = state.entries[currentItem().path]!;
  const filter = variant ? styleFor(entry[variant]) : '';
  return (
    '<div class="preview"><strong>' +
    label +
    '</strong><div class="inspector"><img src="' +
    source +
    '" alt="' +
    escapeHtml(currentItem().category.label + ' ' + label) +
    '"' +
    (variant ? ' data-preview="' + variant + '" style="filter:' + filter + '"' : '') +
    '></div></div>'
  );
}

function render(): void {
  const item = currentItem();
  const entry = state.entries[item.path]!;
  const source = currentImageUrl();
  const sourceStatus = sourceStatuses.get(item.path);
  const accepted = queue.filter(
    (candidate) => state.entries[candidate.path]?.decision === 'accepted',
  ).length;
  const skipped = queue.filter(
    (candidate) => state.entries[candidate.path]?.decision === 'skipped',
  ).length;
  const canAccept = sourceStatus?.ready === true;
  const manifest = JSON.stringify(getTotalManifest(state), null, 2);
  app!.innerHTML =
    '<header><div><p class="eyebrow">SWN / LOCAL ASSET PRODUCTION</p><h1>Planet portrait review</h1>' +
    '<p>Review one base image at a time. Tune two color treatments, then accept or skip. The queue wraps around.</p></div>' +
    '<div class="summary"><strong>' +
    accepted +
    ' / ' +
    queue.length +
    '</strong><span>accepted sources · ' +
    skipped +
    ' skipped</span></div></header>' +
    '<nav class="queue-progress" aria-label="Portrait review queue">' +
    queue
      .map((candidate, index) => {
        const decision = state.entries[candidate.path]!.decision;
        return (
          '<span class="queue-step ' +
          decision +
          (index === state.cursor ? ' current' : '') +
          '" title="' +
          escapeHtml(candidate.path) +
          '">' +
          escapeHtml(candidate.category.key + ' ' + candidate.sourceId) +
          '</span>'
        );
      })
      .join('') +
    '</nav><section class="current"><div class="source-heading"><div><p class="eyebrow">SOURCE ' +
    (state.cursor + 1) +
    ' OF ' +
    queue.length +
    ' · ' +
    entry.decision.toUpperCase() +
    '</p><h2>' +
    escapeHtml(item.category.label) +
    ' · ' +
    item.sourceId +
    '</h2></div><code>' +
    escapeHtml(item.path) +
    '</code></div>' +
    '<p class="source-status ' +
    (sourceStatus?.error ? 'bad' : sourceStatus?.ready ? 'good' : 'pending') +
    '">' +
    escapeHtml(
      sourceStatus?.error ||
        (sourceStatus?.ready
          ? 'Source verified: ' + SOURCE_WIDTH + ' × ' + SOURCE_HEIGHT + ' PNG'
          : 'Checking source image…'),
    ) +
    '</p>' +
    '<div class="previews">' +
    preview('Base image', source) +
    preview('Color A', source, 'a') +
    preview('Color B', source, 'b') +
    '</div><div class="tunings"><fieldset><legend>Color A · HSV</legend>' +
    control('a', 'h', entry.a) +
    control('a', 's', entry.a) +
    control('a', 'v', entry.a) +
    '</fieldset><fieldset><legend>Color B · HSV</legend>' +
    control('b', 'h', entry.b) +
    control('b', 's', entry.b) +
    control('b', 'v', entry.b) +
    '</fieldset></div>' +
    '<div class="actions"><button id="back" type="button">Back</button>' +
    '<button id="skip" type="button">Skip</button>' +
    '<button id="accept" type="button"' +
    (canAccept ? '' : ' disabled') +
    '>Accept</button>' +
    '<button id="total" type="button">Get Total Manifest</button></div>' +
    '<p class="message" role="status">' +
    escapeHtml(message) +
    '</p>' +
    '</section>' +
    (manifestVisible
      ? '<section class="manifest"><div class="manifest-heading"><h2>Total manifest</h2>' +
        '<div><button id="copy" type="button">Copy JSON</button>' +
        '<button id="download" type="button">Download JSON</button></div></div>' +
        '<p>Accepted source paths mapped to Color A and Color B HSV values. Skipped sources are omitted.</p>' +
        '<pre id="manifest-json">' +
        escapeHtml(manifest) +
        '</pre></section>'
      : '') +
    '<footer>Each accepted source produces its base, flip, A, A flip, B, and B flip downstream. The flip needs no separate tuning. Previews are ' +
    PREVIEW_WIDTH +
    ' × ' +
    PREVIEW_HEIGHT +
    ' pixels.</footer>';
  bind();
}

function advance(decision?: Decision): void {
  if (decision) state.entries[currentItem().path]!.decision = decision;
  state.cursor = wrappedIndex(state.cursor, 1, queue.length);
  message = '';
  persist();
  render();
}

function bind(): void {
  document.querySelectorAll<HTMLInputElement>('[data-channel]').forEach((input) => {
    input.addEventListener('input', () => {
      const variant = input.dataset.variant as 'a' | 'b';
      const channel = input.dataset.channel as 'h' | 's' | 'v';
      const value = Number(input.value);
      if (!validDial(channel, value)) return;
      state.entries[currentItem().path]![variant][channel] = value;
      document.querySelector<HTMLOutputElement>(
        '[data-output="' + variant + '-' + channel + '"]',
      )!.value = value + (channel === 'h' ? '°' : '%');
      document.querySelector<HTMLImageElement>('[data-preview="' + variant + '"]')!.style.filter =
        styleFor(state.entries[currentItem().path]![variant]);
      if (manifestVisible) {
        document.querySelector<HTMLElement>('#manifest-json')!.textContent = JSON.stringify(
          getTotalManifest(state),
          null,
          2,
        );
      }
      persist();
    });
  });
  document.querySelector<HTMLButtonElement>('#back')!.addEventListener('click', () => {
    state.cursor = wrappedIndex(state.cursor, -1, queue.length);
    message = '';
    persist();
    render();
  });
  document
    .querySelector<HTMLButtonElement>('#skip')!
    .addEventListener('click', () => advance('skipped'));
  document
    .querySelector<HTMLButtonElement>('#accept')!
    .addEventListener('click', () => advance('accepted'));
  document.querySelector<HTMLButtonElement>('#total')!.addEventListener('click', () => {
    manifestVisible = true;
    render();
    document.querySelector<HTMLElement>('.manifest')?.scrollIntoView({ block: 'nearest' });
  });
  document.querySelector<HTMLButtonElement>('#copy')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(getTotalManifest(state), null, 2));
      message = 'Total manifest copied.';
    } catch {
      message = 'Clipboard unavailable. Select the JSON below to copy it.';
    }
    document.querySelector<HTMLElement>('.message')!.textContent = message;
  });
  document.querySelector<HTMLButtonElement>('#download')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(getTotalManifest(state), null, 2) + '\n'], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'planet-hsv-manifest.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
}

async function loadSources(): Promise<void> {
  render();
  await Promise.all(
    queue.map(async (item) => {
      const image = new Image();
      image.src = sourceUrl(item.category, item.sourceId);
      try {
        await image.decode();
        if (image.naturalWidth !== SOURCE_WIDTH || image.naturalHeight !== SOURCE_HEIGHT)
          throw new Error(
            'Incorrect dimensions: ' + image.naturalWidth + ' × ' + image.naturalHeight,
          );
        sourceStatuses.set(item.path, { ready: true });
      } catch (error) {
        sourceStatuses.set(item.path, {
          ready: false,
          error: error instanceof Error ? error.message : 'Missing or unreadable image',
        });
      }
      if (currentItem().path === item.path) render();
    }),
  );
}

void loadSources();

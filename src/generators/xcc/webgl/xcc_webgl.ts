import { ensureSeedInUrl, randomSeed, setSeedInUrl } from '../../../framework';
import { buildXccSheet } from '../populate_xcc_template';
import { default_build } from '../xcc_impl';
import { buildSyntheticLongestXccCharacter } from '../xcc_visual_fixtures';
import { captureXccSheet } from './capture_xcc_sheet';
import { mountCedalionShaderPanel } from './cedalion_shader_panel';
import { createDefaultXccShaderSettings } from './shader_settings';
import { WebGlSheetRenderer, WebGlUnavailableError } from './webgl_sheet_renderer';

const sourceHost = requiredElement<HTMLElement>('source-host');
const outputHost = requiredElement<HTMLElement>('output-host');
const outputCanvas = requiredElement<HTMLCanvasElement>('shader-output');
const rerollButton = requiredElement<HTMLButtonElement>('reroll');
const recaptureButton = requiredElement<HTMLButtonElement>('recapture');
const seedLabel = requiredElement<HTMLElement>('seed-label');
const status = requiredElement<HTMLElement>('pipeline-status');
const fallbackMessage = requiredElement<HTMLElement>('fallback-message');
const cedalionPanel = requiredElement<HTMLElement>('cedalion-panel');
const didYouKnowOverlay = requiredElement<HTMLElement>('did-you-know-overlay');

let renderer: WebGlSheetRenderer | null = null;
let currentSheet: HTMLElement | null = null;
let renderVersion = 0;
let captureCount = 0;
const shaderSettings = createDefaultXccShaderSettings();

try {
  renderer = new WebGlSheetRenderer(outputCanvas, shaderSettings);
} catch (error) {
  if (!(error instanceof WebGlUnavailableError)) {
    throw error;
  }
}

mountCedalionShaderPanel(cedalionPanel, shaderSettings, (settings) => {
  renderer?.setSettings(settings);
});

rerollButton.addEventListener('click', () => {
  setSeedInUrl(randomSeed());
  void renderCharacter();
});

recaptureButton.addEventListener('click', () => {
  if (currentSheet) {
    void captureAndUpload(currentSheet, renderVersion);
  }
});

window.addEventListener('popstate', () => {
  void renderCharacter();
});

window.addEventListener('beforeunload', () => {
  renderer?.destroy();
});

void renderCharacter();

async function renderCharacter(): Promise<void> {
  const version = ++renderVersion;
  setOutputLoading(true);
  const seed = ensureSeedInUrl();
  const isSyntheticLongest =
    new URLSearchParams(window.location.search).get('fixture') === 'longest';
  const characters = isSyntheticLongest
    ? [buildSyntheticLongestXccCharacter()]
    : default_build(seed).objects;
  const sheet = buildXccSheet(characters);

  currentSheet = sheet;
  updateDidYouKnowOverlay(sheet);
  sourceHost.replaceChildren(sheet);
  seedLabel.textContent = isSyntheticLongest ? 'Fixture: synthetic longest' : `Seed: ${seed}`;

  await captureAndUpload(sheet, version);
}

function updateDidYouKnowOverlay(sheet: HTMLElement): void {
  const bubble = sheet.querySelector<HTMLElement>('[data-field="didYouKnow"]');
  if (!bubble) {
    throw new Error('XCC template is missing the Did You Know bubble.');
  }

  const overlayBubble = bubble.cloneNode(true) as HTMLElement;
  overlayBubble.removeAttribute('data-field');
  overlayBubble.removeAttribute('data-html2canvas-ignore');
  didYouKnowOverlay.replaceChildren(overlayBubble);
}

async function captureAndUpload(sheet: HTMLElement, version: number): Promise<void> {
  setOutputLoading(true);
  setBusy(true);
  setStatus('Capturing source DOM…', 'working');

  try {
    const capture = await captureXccSheet(sheet);
    if (version !== renderVersion || sheet !== currentSheet) {
      return;
    }

    captureCount++;
    if (renderer) {
      renderer.updateTexture(capture);
      renderer.start();
      setOutputLoading(false);
      setStatus(
        `Ready — ${capture.width}×${capture.height}, capture ${captureCount}, texture upload ${renderer.textureUploadCount}`,
        'ready',
      );
      return;
    }

    showFallback(capture);
    setOutputLoading(false);
    setStatus(
      `DOM capture passed (${capture.width}×${capture.height}); WebGL2 unavailable`,
      'ready',
    );
  } catch (error) {
    console.error('XCC WebGL spike failed', error);
    setStatus(describeError(error), 'error');
  } finally {
    if (version === renderVersion) {
      setBusy(false);
    }
  }
}

function setOutputLoading(loading: boolean): void {
  didYouKnowOverlay.hidden = loading;
  renderer?.setLoading(loading);
}

function showFallback(capture: HTMLCanvasElement): void {
  capture.className = 'fallback-capture';
  capture.setAttribute('aria-label', 'Unfiltered fallback capture of the XCC character sheet');
  outputHost.replaceChildren(capture);
  fallbackMessage.hidden = false;
  fallbackMessage.textContent =
    'The HTML-to-canvas capture succeeded, but this browser did not provide WebGL2. The unfiltered capture is shown instead.';
}

function setBusy(busy: boolean): void {
  rerollButton.disabled = busy;
  recaptureButton.disabled = busy;
}

function setStatus(message: string, state: 'working' | 'ready' | 'error'): void {
  status.textContent = message;
  status.dataset.state = state;
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}.`);
  }
  return element as T;
}

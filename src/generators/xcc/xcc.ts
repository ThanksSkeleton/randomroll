import { ensureSeedInUrl, randomSeed, setSeedInUrl } from '../../framework';
import { buildXccSheet } from './populate_xcc_template';
import { captureXccSheet } from './webgl/capture_xcc_sheet';
import { createDefaultXccShaderSettings } from './webgl/shader_settings';
import { WebGlSheetRenderer, WebGlUnavailableError } from './webgl/webgl_sheet_renderer';
import { default_build } from './xcc_impl';

const sourceHost = requiredElement<HTMLElement>('source-host');
const outputHost = requiredElement<HTMLElement>('output-host');
const outputCanvas = requiredElement<HTMLCanvasElement>('shader-output');
const didYouKnowOverlay = requiredElement<HTMLElement>('did-you-know-overlay');
const nextButton = requiredElement<HTMLButtonElement>('next-character');
const status = requiredElement<HTMLElement>('render-status');

let renderer: WebGlSheetRenderer | null = null;
let currentSheet: HTMLElement | null = null;
let renderVersion = 0;

try {
  renderer = new WebGlSheetRenderer(outputCanvas, createDefaultXccShaderSettings());
} catch (error) {
  if (!(error instanceof WebGlUnavailableError)) {
    throw error;
  }
}

nextButton.addEventListener('click', () => {
  setSeedInUrl(randomSeed());
  void renderCharacter();
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
  const seed = ensureSeedInUrl();
  const sheet = buildXccSheet(default_build(seed).objects);

  currentSheet = sheet;
  updateDidYouKnowOverlay(sheet);
  sourceHost.replaceChildren(sheet);
  setLoading(true);
  setStatus('Rendering character…');

  try {
    const capture = await captureXccSheet(sheet);
    if (version !== renderVersion || sheet !== currentSheet) {
      return;
    }

    if (renderer) {
      renderer.updateTexture(capture);
      renderer.start();
    } else {
      showFallback(capture);
    }

    setLoading(false);
    setStatus('Character ready.');
  } catch (error) {
    console.error('XCC character rendering failed', error);
    setStatus(`Character rendering failed: ${describeError(error)}`);
  } finally {
    if (version === renderVersion) {
      nextButton.disabled = false;
    }
  }
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

function showFallback(capture: HTMLCanvasElement): void {
  capture.className = 'fallback-capture';
  capture.setAttribute('aria-label', 'Rendering of a randomly generated XCC character sheet');
  outputHost.replaceChildren(capture);
}

function setLoading(loading: boolean): void {
  nextButton.disabled = loading;
  didYouKnowOverlay.hidden = loading;
  renderer?.setLoading(loading);
}

function setStatus(message: string): void {
  status.textContent = message;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}.`);
  }
  return element as T;
}

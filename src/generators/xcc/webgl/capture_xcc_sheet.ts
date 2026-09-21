import html2canvas from 'html2canvas';

export async function captureXccSheet(sheet: HTMLElement): Promise<HTMLCanvasElement> {
  await waitForSheetAssets(sheet);

  const capture = await html2canvas(sheet, {
    allowTaint: false,
    backgroundColor: null,
    logging: false,
    scale: 1,
    useCORS: true,
  });

  // A readback is an explicit origin-clean assertion. If a future asset
  // reintroduces a cross-origin problem, fail here rather than later at WebGL.
  const probe = document.createElement('canvas');
  probe.width = capture.width;
  probe.height = capture.height;
  const context = probe.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('The browser did not provide a 2D canvas context.');
  }

  context.drawImage(capture, 0, 0);
  context.getImageData(0, 0, 1, 1);

  return capture;
}

async function waitForSheetAssets(sheet: HTMLElement): Promise<void> {
  if (document.fonts) {
    await document.fonts.ready;
  }

  const portraitUrls = Array.from(sheet.querySelectorAll<HTMLElement>('[data-portrait]'))
    .map((element) => element.dataset.portrait)
    .filter((url): url is string => Boolean(url));

  await Promise.all(portraitUrls.map(loadImage));
  await nextAnimationFrame();
  await nextAnimationFrame();
}

async function loadImage(url: string): Promise<void> {
  const image = new Image();
  image.src = url;

  try {
    await image.decode();
  } catch (error) {
    throw new Error(`Could not decode sheet image ${url}`, { cause: error });
  }
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

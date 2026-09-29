import type { CSSProperties } from 'react';

type Mark = 'beaker' | 'flag' | 'flag-outline';
export type VisibilityGlyphKey = 'noVis' | 'sci1' | 'sci2' | 'pol0' | 'pol1' | 'pol2';
export type VisibilityGlyphSettings = Record<
  VisibilityGlyphKey,
  { size: number; buttonWidth: number; offsetX: number; offsetY: number }
>;
const assetUrl = (asset: string) => `url(${import.meta.env.BASE_URL}swn_sector/icons/${asset}.svg)`;

function Layer({ asset, className }: { asset: string; className: string }) {
  const style = { '--visibility-layer-mask': assetUrl(asset) } as CSSProperties;
  return <span className={`visibility-symbol-layer ${className}`} style={style} />;
}

/** Composes the visibility artwork from independent CSS mask layers. */
export function LayeredVisibilitySymbol({
  marks = [],
  crossedOut = false,
  showEye = true,
  size = 50,
  offsetX = 0,
  offsetY = 0,
}: {
  marks?: Mark[];
  crossedOut?: boolean;
  showEye?: boolean;
  size?: number;
  offsetX?: number;
  offsetY?: number;
}) {
  const style = {
    '--visibility-glyph-scale': size / 50,
    '--visibility-glyph-offset-x': `${offsetX}px`,
    '--visibility-glyph-offset-y': `${offsetY}px`,
  } as CSSProperties;
  return (
    <span className="layered-visibility-symbol" style={style} aria-hidden="true">
      <span className="visibility-symbol-art">
        {showEye && <Layer asset="eye" className="visibility-eye-layer" />}
        {marks.slice(0, 2).map((mark, index) => (
          <Layer
            key={`${mark}-${index}`}
            asset={mark}
            className={`visibility-mark-layer visibility-mark-${index + 1}`}
          />
        ))}
        {crossedOut && <Layer asset="x-mark" className="visibility-crossout-layer" />}
      </span>
    </span>
  );
}

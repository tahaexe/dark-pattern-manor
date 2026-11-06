/**
 * The manor's ghost: a thin white ink-line drawing, the same SVG used on
 * room 1's possessed element and reused on the title screen's front hall. It
 * is always `aria-hidden` — the ghost is atmosphere, never content a screen
 * reader must announce.
 *
 * The defaults reproduce room 1's current inline SVG exactly (same `viewBox`,
 * the same class name `ghost`, the same 120 x 140 size, the same body/eyes/
 * mouth paths), so room 1 can render `<InkGhost />` with no change to its
 * output. Callers that size the ghost with CSS (the title screen) pass their
 * own `class` and let the box drive the rendered size.
 */
export interface InkGhostProps {
  /** SVG class; defaults to room 1's `ghost`. */
  class?: string;
  /** Intrinsic width; defaults to room 1's 120. */
  width?: number;
  /** Intrinsic height; defaults to room 1's 140. */
  height?: number;
}

export default function InkGhost({
  class: className = 'ghost',
  width = 120,
  height = 140,
}: InkGhostProps) {
  return (
    <svg
      viewBox="0 0 120 140"
      width={width}
      height={height}
      class={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        class="ghost-body"
        d="M20 70 Q20 24 60 24 Q100 24 100 70 L100 118
           Q94 112 88 118 Q82 124 76 118 Q70 112 64 118
           Q58 124 52 118 Q46 112 40 118 Q34 124 28 118
           Q22 112 20 118 Z"
      />
      <circle class="ghost-eye" cx="48" cy="60" r="4" />
      <circle class="ghost-eye" cx="72" cy="60" r="4" />
      <path class="ghost-mouth" d="M52 74 Q60 82 68 74" />
    </svg>
  );
}

export interface BeforeAfterSliderProps {
  /** 0 = fully haunted, 100 = fully honest. */
  value: number;
  onChange: (value: number) => void;
  /** Step size for arrow keys (default 1). Page Up / Page Down move by 5×. */
  step?: number;
}

/**
 * The Before/After control: a native range input exposed as an ARIA slider,
 * labelled "Before and After slider", fully keyboard operable with native
 * range semantics — Left/Down decrease and Right/Up increase by one step,
 * Page Down / Page Up move by a larger page (step × 5), Home jumps to the
 * minimum (fully haunted) and End to the maximum (fully honest). Every value is
 * clamped to 0–100. The key handling is explicit so the semantics hold
 * uniformly across browsers and test environments.
 *
 * The control carries no visible side labels: in the engine the "Haunted" and
 * "Honest" labels live on the corners of the comparison box, so the slider is
 * the lone control under the wipe. Its accessible name is "Before and After
 * slider".
 */
export default function BeforeAfterSlider({ value, onChange, step = 1 }: BeforeAfterSliderProps) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const page = step * 5;

  const onKeyDown = (e: KeyboardEvent) => {
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clamp(value - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = clamp(value + step);
        break;
      case 'PageDown':
        next = clamp(value - page);
        break;
      case 'PageUp':
        next = clamp(value + page);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 100;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next !== value) onChange(next);
  };

  return (
    <div class="split-control">
      <input
        id="before-after-slider"
        type="range"
        class="split-range"
        min={0}
        max={100}
        step={step}
        value={value}
        aria-label="Before and After slider"
        onKeyDown={onKeyDown}
        onInput={(e) => onChange(clamp(Number((e.target as HTMLInputElement).value)))}
      />
    </div>
  );
}

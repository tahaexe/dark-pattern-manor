/**
 * The Ghost Lantern's styles, as a bundled string constant loaded into the
 * closed shadow root (constructed stylesheet, with a <style> fallback). The
 * manor palette is inlined here because the bundle cannot load tokens.css.
 * Candle #f0be77, parchment #e9dfca, ink #1d1417, wood #1e1519 — the chip is
 * ink on parchment (AA), the panel is parchment with ink text (AA).
 *
 * Only transform and opacity animate; the flicker changes opacity between 1
 * and 0.85 at most twice a second and is off under reduced motion.
 */
export const LANTERN_CSS = `
:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  pointer-events: none;
  font-family: system-ui, -apple-system, Segoe UI, sans-serif;
}
.gl-mark {
  position: fixed;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 3px dashed #f0be77;
  border-radius: 4px;
  pointer-events: none;
  will-change: transform;
}
.gl-mark:focus {
  outline: 3px solid #f0be77;
  outline-offset: 2px;
}
.gl-mark.gl-flicker {
  animation: gl-flicker 0.5s steps(1, end) infinite;
}
@keyframes gl-flicker {
  0%, 60% { opacity: 1; }
  61%, 100% { opacity: 0.85; }
}
.gl-chip {
  position: absolute;
  left: -3px;
  top: -1.6em;
  white-space: nowrap;
  background: #e9dfca;
  color: #1d1417;
  border: 1px solid #986645;
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  pointer-events: none;
}
.gl-panel {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: 320px;
  max-height: 70vh;
  overflow: auto;
  background: #e9dfca;
  color: #1d1417;
  border: 2px solid #986645;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
  padding: 14px 16px;
  pointer-events: auto;
  font-size: 14px;
  line-height: 1.5;
}
.gl-panel h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: #1d1417;
}
.gl-warning {
  margin: 0 0 12px;
  color: #1d1417;
}
.gl-list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
}
.gl-item {
  border-top: 1px solid #b8ab9b;
  padding: 10px 0;
}
.gl-item-pattern {
  font-weight: 700;
  color: #1d1417;
  margin: 0 0 2px;
}
.gl-item-sign {
  margin: 0 0 6px;
  color: #1d1417;
}
.gl-item-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.gl-btn {
  font: inherit;
  background: #f0be77;
  color: #1d1417;
  border: 1px solid #986645;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  min-height: 32px;
}
.gl-btn:hover,
.gl-btn:focus {
  background: #cfa664;
  outline: 2px solid #1d1417;
  outline-offset: 1px;
}
.gl-link {
  color: #1d1417;
  text-decoration: underline;
  align-self: center;
}
.gl-link:hover,
.gl-link:focus {
  color: #986645;
}
.gl-putout {
  display: block;
  width: 100%;
  margin-top: 4px;
}
@media (max-width: 480px) {
  .gl-panel {
    right: 0;
    left: 0;
    bottom: 0;
    width: auto;
    max-height: 60vh;
    border-radius: 8px 8px 0 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .gl-mark.gl-flicker {
    animation: none;
    opacity: 1;
  }
}
`;

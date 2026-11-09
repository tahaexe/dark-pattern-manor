import { isLit, light, putOut } from './lantern';

/**
 * The bookmarklet entry. Clicking the bookmarklet runs this once: if the
 * lantern is already lit, a second click puts it out (so a bookmark click
 * toggles); otherwise it lights. Nothing runs before this call.
 */
if (isLit()) {
  putOut();
} else {
  light();
}

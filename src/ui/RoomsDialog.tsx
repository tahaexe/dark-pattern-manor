import { useEffect, useRef } from 'preact/hooks';
import { ROOM_NAMES } from '../engine/registry';
import { CHECKLIST } from '../app/checklist';

export interface RoomsDialogProps {
  /** 1-based current room number, marked aria-current. */
  current: number;
  /** The set of freed room numbers (1-based). */
  freed: ReadonlySet<number>;
  /** Close the dialog; the caller returns focus to the opener. */
  onClose: () => void;
}

/** The pattern name a room teaches, from the one checklist source. */
function patternOf(roomNum: number): string {
  return CHECKLIST.find((c) => c.room === roomNum)?.pattern ?? '';
}

/**
 * The Rooms-of-the-manor dialog: a native modal <dialog> listing all twelve
 * rooms in order as links to #/room/N. Freed rooms also show the pattern they
 * taught; the current room is marked aria-current="page". Any room is reachable
 * in any order. Esc closes (native), a Close button closes, and the caller
 * returns focus to the "Rooms" button.
 */
export default function RoomsDialog({ current, freed, onClose }: RoomsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
    // Native Esc fires a `cancel` (and then `close`); route both to onClose.
    const onCancelOrClose = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', onCancelOrClose);
    return () => {
      dialog.removeEventListener('cancel', onCancelOrClose);
      if (dialog.open) dialog.close();
    };
    // onClose is stable for the dialog's life; run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <dialog class="rooms-dialog" ref={dialogRef} aria-label="Rooms of the manor">
      <div class="rooms-dialog-inner">
        <h2 class="rooms-dialog-title">Rooms of the manor</h2>
        <ol class="rooms-dialog-list">
          {ROOM_NAMES.map((name, i) => {
            const n = i + 1;
            const isFreed = freed.has(n);
            return (
              <li key={n}>
                <a
                  class="rooms-dialog-link"
                  href={`#/room/${n}`}
                  aria-current={n === current ? 'page' : undefined}
                  onClick={() => onClose()}
                >
                  <span class="rooms-dialog-roomname">
                    {n}. {name}
                  </span>
                  {isFreed ? (
                    <span class="rooms-dialog-freed">freed: {patternOf(n)}</span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ol>
        <button type="button" class="rooms-dialog-close" onClick={() => onClose()}>
          Close
        </button>
      </div>
    </dialog>
  );
}

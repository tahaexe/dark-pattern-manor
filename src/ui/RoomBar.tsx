import { useRef, useState } from 'preact/hooks';
import SoundToggle from '../audio/SoundToggle';
import RoomsDialog from './RoomsDialog';
import HowToPlay from './HowToPlay';

export interface RoomBarProps {
  /** 1-based room number. */
  roomNum: number;
  /** Total rooms (always 12). */
  total: number;
  /** The set of freed room numbers (1-based), for the dots and the counter. */
  freed: ReadonlySet<number>;
}

/** The twelve dots: filled for freed, a ring for current, hollow for the rest. */
function Dots({
  roomNum,
  total,
  freed,
}: {
  roomNum: number;
  total: number;
  freed: ReadonlySet<number>;
}) {
  const dots = [];
  for (let n = 1; n <= total; n++) {
    const cls = freed.has(n)
      ? 'room-bar-dot is-freed'
      : n === roomNum
        ? 'room-bar-dot is-current'
        : 'room-bar-dot';
    dots.push(<span key={n} class={cls}></span>);
  }
  return (
    <span class="room-bar-dots" aria-hidden="true">
      {dots}
    </span>
  );
}

/** A small grid icon for the "Rooms" button (shown instead of the word on a phone). */
function RoomsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <rect x="4" y="4" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="4" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="13" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="13" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * The one compact bar along the top of the room route. Left: a quiet "‹ Manor"
 * text button back to the title. Middle: "Room N of 12" with twelve dots
 * (aria-hidden; a visually hidden span reads "Room N of 12, M freed"). Right: a
 * "Rooms" button (the room list dialog), a "?" button (how to play), and the
 * Sound toggle. Every control is at least 44 x 44.
 *
 * Below 600 px (phone) the whole bar stays one row at most 56 px tall: "Rooms",
 * "?" and the Sound toggle become 44 x 44 icon buttons — each keeps its
 * accessible name (via aria-label), only the visible word is dropped (an icon
 * shows in its place). The counter and dots sit between "‹ Manor" and the
 * icons; the dots wrap under the counter when they do not fit beside it.
 */
export default function RoomBar({ roomNum, total, freed }: RoomBarProps) {
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const roomsBtn = useRef<HTMLButtonElement>(null);
  const howBtn = useRef<HTMLButtonElement>(null);
  const freedCount = freed.size;

  const onManor = () => {
    window.location.hash = '#/';
  };

  return (
    <div class="room-bar">
      <button type="button" class="room-bar-manor" onClick={onManor}>
        <span aria-hidden="true">&lsaquo;</span> <span class="room-bar-manor-word">Manor</span>
      </button>

      <span class="room-bar-counter">
        <span class="room-bar-counter-text" aria-hidden="true">
          Room {roomNum} of {total}
        </span>
        <span class="visually-hidden">
          Room {roomNum} of {total}, {freedCount} freed
        </span>
        <Dots roomNum={roomNum} total={total} freed={freed} />
      </span>

      <span class="room-bar-actions">
        <button
          type="button"
          class="room-bar-button"
          aria-label="Rooms"
          ref={roomsBtn}
          onClick={() => setRoomsOpen(true)}
        >
          <span class="room-bar-button-label">Rooms</span>
          <span class="room-bar-button-icon" aria-hidden="true">
            <RoomsIcon />
          </span>
        </button>
        <button
          type="button"
          class="room-bar-button room-bar-help"
          aria-label="How to play"
          ref={howBtn}
          onClick={() => setHowOpen(true)}
        >
          ?
        </button>
        <SoundToggle inBar />
      </span>

      {roomsOpen ? (
        <RoomsDialog
          current={roomNum}
          freed={freed}
          onClose={() => {
            setRoomsOpen(false);
            roomsBtn.current?.focus();
          }}
        />
      ) : null}

      {howOpen ? (
        <HowToPlay
          onClose={() => {
            setHowOpen(false);
            howBtn.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

import { useEffect, useState } from 'preact/hooks';
import LookPage from '../look/LookPage';
import Room from '../engine/Room';
import { loadRoom, roomSlugs } from '../engine/registry';
import type { RoomData } from '../engine/types';

type Route = 'title' | 'room' | 'look';

/** Room number → slug, in product order. Only built rooms resolve. */
const ROOM_ORDER = roomSlugs();

/** The route a hash names; null for an unknown hash (the current route stays). */
export function parseHash(raw: string): { route: Route; room: number } | null {
  const hash = raw.slice(1) || '';
  if (hash === '' || hash === '/') return { route: 'title', room: 1 };
  if (hash === '/look') return { route: 'look', room: 1 };
  if (hash.startsWith('/room/')) {
    const n = parseInt(hash.split('/')[2], 10);
    if (!isNaN(n) && n >= 1 && n <= 12) return { route: 'room', room: n };
  }
  return null;
}

export default function App() {
  // The first render already shows the hash's route: rendering the title first and switching in an effect shifted the whole
  // app on a direct visit to #/room/N (Lighthouse mobile CLS 0.39-0.50).
  const initial = parseHash(window.location.hash) ?? { route: 'title' as Route, room: 1 };
  const [route, setRoute] = useState<Route>(initial.route);
  const [roomNum, setRoomNum] = useState<number>(initial.room);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const next = parseHash(window.location.hash);
      if (next) {
        setRoomNum(next.room);
        setRoute(next.route);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load the room's chunk on demand when entering a room.
  useEffect(() => {
    if (route !== 'room') return;
    let active = true;
    setRoom(null);
    setLoadError(false);
    const slug = ROOM_ORDER[roomNum - 1];
    if (!slug) {
      setLoadError(true);
      return;
    }
    loadRoom(slug)
      .then((data) => {
        if (active) setRoom(data);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [route, roomNum]);

  // Focus the title heading when returning to the title screen.
  useEffect(() => {
    if (route === 'title') {
      setTimeout(() => document.querySelector('h1')?.focus(), 0);
    }
  }, [route]);

  const handleStart = () => {
    window.location.hash = '#/room/1';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const handleBack = () => {
    window.location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const nextSlug = ROOM_ORDER[roomNum] ?? undefined;

  return (
    <div class="app">
      {route === 'title' ? (
        <div class="title-screen">
          <h1 tabindex={-1}>Dark Pattern Manor</h1>
          <p class="subtitle">Every trick is a ghost. Name it to set the page free.</p>
          <button onClick={handleStart} class="start-button">
            Start
          </button>
        </div>
      ) : route === 'look' ? (
        <LookPage />
      ) : (
        <div class="room-route">
          <button onClick={handleBack} class="back-button">
            Back
          </button>
          {room ? (
            <Room room={room} nextSlug={nextSlug} />
          ) : (
            // Reserve the room's full-height scene before the chunk arrives so
            // swapping in the loaded room adds no layout shift (CLS). The
            // loading and error states live inside the same `room-scene` box,
            // with the same backdrop, as the loaded room — the layout box is
            // identical before and after the chunk resolves.
            <div class="room-scene room-scene-pending">
              <div class="room" aria-hidden="true">
                <div class="room-wall"></div>
              </div>
              {loadError ? (
                <div class="room-load-error" role="alert">
                  <h1 tabindex={-1}>The room resists</h1>
                  <p>This room could not be summoned. Try again in a moment.</p>
                </div>
              ) : (
                <div class="room-loading" role="status">
                  <h1 tabindex={-1}>Lighting the candles…</h1>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

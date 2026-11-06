import { useEffect, useState } from 'preact/hooks';
import LookPage from '../look/LookPage';
import Room from '../engine/Room';
import { loadRoom, roomSlugs } from '../engine/registry';
import type { RoomData } from '../engine/types';

type Route = 'title' | 'room' | 'look';

/** Room number → slug, in product order. Only built rooms resolve. */
const ROOM_ORDER = roomSlugs();

export default function App() {
  const [route, setRoute] = useState<Route>('title');
  const [roomNum, setRoomNum] = useState<number>(1);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '';
      if (hash === '' || hash === '/') {
        setRoute('title');
      } else if (hash === '/look') {
        setRoute('look');
      } else if (hash.startsWith('/room/')) {
        const n = parseInt(hash.split('/')[2], 10);
        if (!isNaN(n) && n >= 1 && n <= 12) {
          setRoomNum(n);
          setRoute('room');
        }
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
          ) : loadError ? (
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
  );
}

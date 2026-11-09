import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import LookPage from '../look/LookPage';
import Room from '../engine/Room';
import TitleScreen from './TitleScreen';
import { loadRoom, roomSlugs, ROOM_NAMES, ROOM_COUNT } from '../engine/registry';
import type { RoomData } from '../engine/types';
import SoundToggle from '../audio/SoundToggle';
import { loadProgress } from '../engine/progress';

type Route = 'title' | 'room' | 'look' | 'end' | 'teach' | 'practice';

/** Room number → slug, in product order. Only built rooms resolve. */
const ROOM_ORDER = roomSlugs();

/** The route a hash names; null for an unknown hash (the current route stays). */
export function parseHash(raw: string): { route: Route; room: number } | null {
  const hash = raw.slice(1) || '';
  if (hash === '' || hash === '/') return { route: 'title', room: 1 };
  if (hash === '/look') return { route: 'look', room: 1 };
  if (hash === '/end') return { route: 'end', room: 1 };
  if (hash === '/teach') return { route: 'teach', room: 1 };
  if (hash === '/lantern-practice') return { route: 'practice', room: 1 };
  if (hash.startsWith('/room/')) {
    const n = parseInt(hash.split('/')[2], 10);
    // The upper bound is the number of rooms the registry lists, so adding a
    // room to the registry is the only change the route needs.
    if (!isNaN(n) && n >= 1 && n <= ROOM_COUNT) return { route: 'room', room: n };
  }
  return null;
}

/** The set of freed room numbers (1-based), from the completed slugs. */
function freedRoomNumbers(): Set<number> {
  const completed = new Set(loadProgress().completed);
  const freed = new Set<number>();
  ROOM_ORDER.forEach((slug, i) => {
    if (completed.has(slug)) freed.add(i + 1);
  });
  return freed;
}

export default function App() {
  const initial = parseHash(window.location.hash) ?? { route: 'title' as Route, room: 1 };
  const [route, setRoute] = useState<Route>(initial.route);
  const [roomNum, setRoomNum] = useState<number>(initial.room);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [Ending, setEnding] = useState<ComponentType | null>(null);
  const [Classroom, setClassroom] = useState<ComponentType | null>(null);
  const [Practice, setPractice] = useState<ComponentType | null>(null);
  // The freed set, read from progress and refreshed on each room entry so the
  // bar's dots reflect the latest completions.
  const [freed, setFreed] = useState<Set<number>>(() => freedRoomNumbers());

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

  // Load the room's chunk on demand when entering a room; refresh the freed set.
  useEffect(() => {
    if (route !== 'room') return;
    let active = true;
    setRoom(null);
    setLoadError(false);
    setFreed(freedRoomNumbers());
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

  useEffect(() => {
    if (route !== 'end') return;
    let active = true;
    setLoadError(false);
    import('./EndingPage')
      .then((mod) => {
        if (active) setEnding(() => mod.default);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [route]);

  useEffect(() => {
    if (route !== 'teach') return;
    let active = true;
    setLoadError(false);
    import('./ClassroomPage')
      .then((mod) => {
        if (active) setClassroom(() => mod.default);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [route]);

  useEffect(() => {
    if (route !== 'practice') return;
    let active = true;
    setLoadError(false);
    import('./LanternPractice')
      .then((mod) => {
        if (active) setPractice(() => mod.default);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [route]);

  // Focus the title heading when returning to the title screen (not on first load).
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    if (route === 'title') {
      setTimeout(() => document.querySelector('h1')?.focus(), 0);
    }
  }, [route]);

  const nextSlug = ROOM_ORDER[roomNum] ?? undefined;
  const nextName = ROOM_NAMES[roomNum] ?? undefined;
  // Every room but the last reaches the next room; the last room reaches the
  // ending. The threshold is the registry's room count, so adding a room needs
  // no change here.
  const nextHash = roomNum >= ROOM_COUNT ? '#/end' : `#/room/${roomNum + 1}`;

  // The floating Sound toggle shows on every page EXCEPT the room route, where
  // it moves into the compact bar.
  const showFloatingSound = route !== 'room';

  const pendingPage = (
    <div class="room-scene room-scene-pending">
      <div class="room" aria-hidden="true">
        <div class="room-wall"></div>
      </div>
      {loadError ? (
        <div class="room-load-error" role="alert">
          <h1 tabindex={-1}>The manor resists</h1>
          <p>This page could not be summoned. Try again in a moment.</p>
        </div>
      ) : (
        <div class="room-loading" role="status">
          <h1 tabindex={-1}>Lighting the candles…</h1>
        </div>
      )}
    </div>
  );

  return (
    <div class="app">
      {showFloatingSound ? <SoundToggle /> : null}

      {route === 'title' ? (
        <TitleScreen />
      ) : route === 'look' ? (
        <LookPage />
      ) : route === 'teach' ? (
        Classroom ? (
          <Classroom />
        ) : (
          pendingPage
        )
      ) : route === 'practice' ? (
        Practice ? (
          <Practice />
        ) : (
          pendingPage
        )
      ) : route === 'end' ? (
        Ending ? (
          <Ending />
        ) : (
          pendingPage
        )
      ) : (
        <div class="room-route">
          {room ? (
            <Room
              room={room}
              roomNum={roomNum}
              freed={freed}
              nextSlug={nextSlug}
              nextName={nextName}
              nextHash={nextHash}
            />
          ) : (
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

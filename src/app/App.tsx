import { useEffect, useState } from 'preact/hooks';

type Route = 'title' | 'room';
type RoomNumber = number;

export default function App() {
  const [route, setRoute] = useState<Route>('title');
  const [room, setRoom] = useState<RoomNumber>(1);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '';
      if (hash === '' || hash === '/') {
        setRoute('title');
      } else if (hash.startsWith('/room/')) {
        const roomNum = parseInt(hash.split('/')[2], 10);
        if (!isNaN(roomNum) && roomNum >= 1 && roomNum <= 12) {
          setRoom(roomNum);
          setRoute('room');
        }
      }
    };

    // Parse initial hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Focus heading whenever route changes
  useEffect(() => {
    setTimeout(() => {
      document.querySelector('h1')?.focus();
    }, 0);
  }, [route]);

  const handleStart = () => {
    window.location.hash = '#/room/1';
    // Trigger hashchange event manually for test environments
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: window.location.href, newURL: window.location.href }));
  };

  const handleBack = () => {
    window.location.hash = '#/';
    // Trigger hashchange event manually for test environments
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: window.location.href, newURL: window.location.href }));
  };

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
      ) : (
        <div class="room">
          <h1 tabindex={-1}>The Foyer</h1>
          <button onClick={handleBack} class="back-button">
            Back
          </button>
        </div>
      )}
    </div>
  );
}

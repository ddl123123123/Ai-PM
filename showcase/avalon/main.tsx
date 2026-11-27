import { MotionConfig } from 'framer-motion';
import { createRoot } from 'react-dom/client';
import { GAME_CLIENTS } from '../src/games/registry';
import { useEffect } from 'react';
import { AvalonBoard } from '../src/games/avalon/Board';
import { Home } from '../src/pages/Home';
import { Lobby } from '../src/pages/Lobby';
import { dismissNotice, useNet } from './session';
import '../src/styles/base.css';
import '../src/styles/home.css';
import '../src/styles/room.css';
import '../src/styles/avalon.css';
import '../src/styles/citadels.css';
import '../src/styles/glassworks.css';
import '../src/styles/party.css';
import '../src/styles/street-stall.css';
import '../src/styles/ninja-night.css';
import '../src/styles/grey-tide.css';
import '../src/styles/citadels-pig.css';
import '../src/styles/seven-sins.css';
import '../src/styles/account.css';
import '../src/styles/mobile.css';

function Showcase() {
  const { room, notice } = useNet();
  const screen = room === null ? 'home' : room.status === 'lobby' ? 'lobby' : 'board';

  useEffect(() => {
    if (window.parent === window) return;
    const page = document.querySelector('main');
    if (!page) return;
    let lastHeight: number | null | undefined;
    const sendHeight = () => {
      const height = screen === 'board' ? null : Math.ceil(page.getBoundingClientRect().bottom + window.scrollY);
      if (height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({ type: 'avalon-showcase-height', height }, location.origin);
    };
    const observer = new ResizeObserver(sendHeight);
    observer.observe(page);
    sendHeight();
    return () => observer.disconnect();
  }, [screen]);
  return (
    <MotionConfig reducedMotion="user">
      {room === null ? <Home /> : room.status === 'lobby' ? (
        <Lobby key={room.gameId} room={room} game={GAME_CLIENTS[room.gameId]!} />
      ) : <AvalonBoard room={room} />}
      {notice && <button className="toast" type="button" role="status" onClick={dismissNotice}>{notice.text}</button>}
    </MotionConfig>
  );
}

if (window.parent !== window) document.documentElement.classList.add('portfolio-embedded');

createRoot(document.getElementById('root')!).render(<Showcase />);

import { MotionConfig } from 'framer-motion';
import { createRoot } from 'react-dom/client';
import { GAME_CLIENTS } from '../src/games/registry';
import { useState } from 'react';
import { QuestRoundel } from '../src/games/avalon/art';
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
  return (
    <MotionConfig reducedMotion="user">
      {room === null ? <Home /> : room.status === 'lobby' ? (
        <Lobby key={room.gameId} room={room} game={GAME_CLIENTS[room.gameId]!} />
      ) : <AvalonBoard room={room} />}
      {notice && <button className="toast" type="button" role="status" onClick={dismissNotice}>{notice.text}</button>}
    </MotionConfig>
  );
}

const taskMarkers = [
  { state: 'success', size: 2, twoFails: false, label: '任务成功', detail: '任务结算后，完整的剑徽表示成功。' },
  { state: 'fail', size: 3, twoFails: false, label: '任务失败', detail: '任务结算后，断剑与红色徽章表示失败。' },
  { state: 'current', size: 3, twoFails: false, label: '当前任务', detail: '这里的 3 表示这一轮要选 3 名队员。' },
  { state: 'pending', size: 4, twoFails: true, label: '两张失败牌', detail: '双牌标识表示这轮至少要有两张失败牌，任务才会失败。' },
  { state: 'pending', size: 4, twoFails: false, label: '待开始', detail: '待开始的任务预先显示需要的人数。' },
] as const;

function TaskMarkers() {
  const [selected, setSelected] = useState(2);
  return (
    <section className="portfolio-markers" aria-label="任务进度状态示例">
      <div className="portfolio-marker-row" role="group" aria-label="查看徽章含义">
        {taskMarkers.map(({ label, state, size, twoFails }, index) => (
          <button key={label} type="button" aria-pressed={index === selected} onClick={() => setSelected(index)}>
            <QuestRoundel state={state} size={size} twoFails={twoFails} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p role="status">{taskMarkers[selected].detail}</p>
    </section>
  );
}

const preview = new URLSearchParams(location.search).get('scene') === 'progress';
createRoot(document.getElementById('root')!).render(preview ? <TaskMarkers /> : <Showcase />);

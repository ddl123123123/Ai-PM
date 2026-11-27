import { useSyncExternalStore } from 'react';
import { Avalon, getGame, type RoomPlayer, type RoomSnapshot } from '@tabletop/shared';
import type { NetState } from '../src/net/client';

const game = Avalon.avalon;
const visitor = 'portfolio-visitor';
const createCode = '8042';
const names = ['岚', '阿澄', '小满', '林舟', '七月', '白露', '星野', '夏禾', '拾柒'];
const listeners = new Set<() => void>();
let name = '访客';
let noticeTimer = 0;
let sequence = 0;
let botSequence = 0;
let match: Avalon.AvalonState | null = null;
let state: NetState = {
  link: 'offline', playerId: visitor, account: null, seats: [], lastRoomCode: null,
  recentRooms: [], joining: null, room: null, notice: null, assistantResult: null, assistantError: null,
};

function update(patch: Partial<NetState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function useNet() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => state);
}
export const debugAlias = null;
export const getName = () => name;
export const setName = (value: string) => { name = value; };
export const forgetRecentRoom = () => {};
export const dismissNotice = () => update({ notice: null });
export function notify(text: string) {
  window.clearTimeout(noticeTimer);
  update({ notice: { id: Date.now(), text } });
  noticeTimer = window.setTimeout(dismissNotice, 4500);
}

function player(seatIndex: number, isBot = true): RoomPlayer {
  return {
    id: isBot ? `demo-${++botSequence}` : visitor,
    name: isBot ? names[seatIndex - 1] ?? `陪练 ${seatIndex + 1}` : name,
    seatIndex, connected: true, isBot,
  };
}

function updateRoom(room: RoomSnapshot) {
  const definition = getGame(room.gameId)!;
  room.players.sort((a, b) => a.seatIndex - b.seatIndex);
  const count = room.targetPlayers ?? definition.minPlayers;
  room.startBlocker = room.players.length < count
    ? `还差 ${count - room.players.length} 人，可以添加机器人补位`
    : definition.validateOptions(room.options, room.players.length);
  update({ room: { ...room } });
}

function newRoom(gameId: string, targetPlayers?: number): RoomSnapshot {
  const definition = getGame(gameId)!;
  const count = targetPlayers ?? definition.playerCountOptions?.defaultCount ?? definition.minPlayers;
  return {
    code: createCode, gameId, hostId: visitor, you: visitor, players: [player(0, false)],
    status: 'lobby', targetPlayers: count,
    options: { ...definition.defaultOptions(), ...definition.playerCountOptions?.recommendedOptions(count) },
    startBlocker: null, gameSeq: ++sequence, view: null,
  };
}

function publishMatch(room: RoomSnapshot) {
  if (!match) return;
  update({
    room: {
      ...room, status: match.phase === 'ended' ? 'ended' : 'playing',
      options: match.options, view: game.view(match, visitor),
    },
  });
}

function startScene(scene: 'identity' | 'notebook' | 'assassin') {
  const room = newRoom(game.id, 5);
  room.players = [player(0, false), ...[1, 2, 3, 4].map((index) => player(index))];
  const ids = room.players.map(({ id }) => id);
  match = game.setup(ids, game.normalizeOptions(room.options), () => 0);
  const [you, first, second, third, fourth] = ids as [string, string, string, string, string];
  match.roles = {
    [you]: scene === 'assassin' ? 'assassin' : 'merlin',
    [first]: scene === 'assassin' ? 'merlin' : 'assassin',
    [second]: 'servant', [third]: 'percival', [fourth]: 'morgana',
  };
  match.confirmedRoles = scene === 'identity' ? ids.slice(1) : ids;
  if (scene === 'notebook') {
    match.phase = 'team';
    match.leaderIndex = 0;
  }
  if (scene === 'assassin') {
    match.phase = 'assassin';
    match.leaderIndex = 2;
    match.questIndex = 2;
    match.quests = [
      { questIndex: 0, leader: first, team: [first, second], fails: 0, success: true },
      { questIndex: 1, leader: second, team: [first, second, third], fails: 0, success: true },
      { questIndex: 2, leader: third, team: [second, third], fails: 0, success: true },
    ];
  }
  publishMatch(room);
}

function inLobby(change: (room: RoomSnapshot) => void) {
  if (state.room?.status !== 'lobby') return;
  const room = { ...state.room, players: [...state.room.players] };
  change(room);
  updateRoom(room);
}

function leaveRoom() {
  match = null;
  update({ room: null });
}

export const net = {
  createRoom(value: string, gameId: string) {
    setName(value);
    updateRoom(newRoom(gameId));
    window.scrollTo(0, 0);
  },
  leaveRoom,
  backToLobby() {
    if (state.room) updateRoom(newRoom(state.room.gameId, state.room.targetPlayers ?? undefined));
  },
  addBot() {
    inLobby((room) => {
      const seat = Array.from({ length: room.targetPlayers ?? 5 }, (_, i) => i)
        .find((i) => !room.players.some((person) => person.seatIndex === i));
      if (seat !== undefined) room.players.push(player(seat));
    });
  },
  kick(id: string) {
    inLobby((room) => { room.players = room.players.filter((person) => person.id !== id); });
  },
  chooseSeat(seatIndex: number) {
    inLobby((room) => {
      if (room.players.some((person) => person.seatIndex === seatIndex)) return;
      room.players = room.players.map((person) => person.id === visitor ? { ...person, seatIndex } : person);
    });
  },
  setPlayerCount(count: number) {
    inLobby((room) => {
      if (room.players.length > count) { notify('请先移除多出的机器人。'); return; }
      room.targetPlayers = count;
      room.players = room.players.map((person, seatIndex) => ({ ...person, seatIndex }));
      const definition = getGame(room.gameId)!;
      room.options = { ...definition.defaultOptions(), ...definition.playerCountOptions?.recommendedOptions(count) };
    });
  },
  setOptions(options: unknown) {
    inLobby((room) => { room.options = getGame(room.gameId)!.normalizeOptions(options); });
  },
  startGame() {
    const room = state.room;
    if (!room || room.startBlocker !== null) return;
    if (room.gameId !== game.id) { notify('本案例的开局演示使用阿瓦隆。'); return; }
    match = game.setup(room.players.map(({ id }) => id), game.normalizeOptions(room.options), Math.random);
    match.confirmedRoles = room.players.filter(({ isBot }) => isBot).map(({ id }) => id);
    publishMatch(room);
    window.scrollTo(0, 0);
  },
  act(action: Avalon.AvalonAction) {
    if (!match || !state.room) return;
    try {
      match = game.reduce(match, visitor, action, Math.random, {
        hostId: visitor, offlinePlayers: [], botPlayers: state.room.players.filter(({ isBot }) => isBot).map(({ id }) => id),
      });
      publishMatch(state.room);
    } catch (error) {
      notify(error instanceof Error ? error.message : '暂时无法执行这个操作。');
    }
  },
  serverNow: () => Date.now(),
  askAvalonAssistant: () => false,
  polishAvalonSpeech: () => false,
  setAvalonBotModel: () => {},
  setAvalonBotModels: () => {},
};

export function navigate(path: string) {
  if (path === '/') leaveRoom();
  else notify('作品集使用本地体验房间，请从首页开桌。');
}
export const roomPath = (code: string) => `/room/${code}`;
export const roomUrl = () => location.href;

const scene = new URLSearchParams(location.search).get('scene');
if (scene === 'identity' || scene === 'notebook' || scene === 'assassin') startScene(scene);

import { notify } from './session';

export class AccountError extends Error {}
export const account = {};
export const openAccountSheet = () => notify('作品集中的体验房间使用访客昵称。');
export const closeAccountSheet = () => {};
export const useAccountSheet = () => null;
export const useAccount = () => ({ user: null, status: 'anonymous' });

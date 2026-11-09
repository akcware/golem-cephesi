// Sunucu bağlantısı. Geliştirmede oyun sunucusu 2567 portunda, üretimde aynı adreste.
import { Client, type Room } from '@colyseus/sdk';
import type { BotLevel } from '../shared/protocol';

const env = import.meta.env;
const endpoint: string =
  env.VITE_SERVER_URL || (env.DEV ? `${location.protocol}//${location.hostname}:2567` : location.origin);

export const client = new Client(endpoint);

export const net = {
  bot: (name: string, level: BotLevel): Promise<Room> => client.create('battle', { mode: 'bot', name, level }),
  tutorial: (name: string): Promise<Room> => client.create('battle', { mode: 'tutorial', name }),
  quick: (name: string): Promise<Room> => client.joinOrCreate('battle', { mode: 'quick', name }),
  create: (name: string): Promise<Room> => client.create('battle', { mode: 'private', name }),
  joinCode: (code: string, name: string): Promise<Room> =>
    client.joinById(code.trim().toUpperCase(), { name }),
};

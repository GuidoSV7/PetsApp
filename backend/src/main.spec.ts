import { Logger } from '@nestjs/common';
import { createServer, get, type Server } from 'node:http';
import { networkInterfaces } from 'node:os';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ app: {} as Record<string, unknown> }));
vi.mock('@nestjs/core', () => ({
  NestFactory: { create: vi.fn(async () => state.app) },
}));
// Exercise the public bootstrap without starting the application/DB or T7.
vi.mock('./app.module.js', () => ({ AppModule: class {} }));

let server: Server;
let listen: ReturnType<typeof vi.fn>;
let logged: ReturnType<typeof vi.spyOn>;
const addresses = [...new Set([
  '127.0.0.2',
  ...Object.values(networkInterfaces()).flatMap((entries) =>
    (entries ?? []).filter((entry) => entry.family === 'IPv4' && !entry.internal)
      .map((entry) => entry.address)),
])];

function request(host: string): Promise<{ status: number; body: string }> {
  const { port } = server.address() as AddressInfo;
  return new Promise((resolve, reject) => {
    const req = get({ host, port, path: '/probe', agent: false }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.setTimeout(5_000, () => req.destroy(new Error('Host probe timed out')));
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('HOST', undefined);
  vi.stubEnv('CORS_ORIGIN', 'http://localhost:3080');
  logged = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  server = createServer((_req, res) => res.end('host-probe'));
  listen = vi.fn(async (_port: number, host?: string) => {
    // The bootstrap's arguments are asserted separately; use port 0 so the
    // transport proof never occupies a reserved/fixed application port.
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      if (host === undefined) server.listen(0, resolve);
      else server.listen(0, host, resolve);
    });
  });
  state.app = {
    use: vi.fn(), disable: vi.fn(), set: vi.fn(),
    enableShutdownHooks: vi.fn(), enableCors: vi.fn(), useGlobalPipes: vi.fn(),
    get: vi.fn(() => ({ get: (key: string) => key === 'PORT' ? 3081 : process.env.HOST })),
    listen,
  };
});

afterEach(async () => {
  if (server.listening) await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('public bootstrap listener', () => {
  it('preserves the existing one-argument listen and wildcard reachability without HOST', async () => {
    await import('./main.js');
    expect(listen).toHaveBeenCalledExactlyOnceWith(3081);
    expect(logged).toHaveBeenCalledExactlyOnceWith('PetsApp API listening on http://localhost:3081');
    expect(await request('127.0.0.1')).toEqual({ status: 200, body: 'host-probe' });
    for (const address of addresses) {
      expect(await request(address)).toEqual({ status: 200, body: 'host-probe' });
    }
  });

  it('binds HOST=127.0.0.1 and refuses other local/network addresses', async () => {
    vi.stubEnv('HOST', '127.0.0.1');
    await import('./main.js');
    expect(listen).toHaveBeenCalledExactlyOnceWith(3081, '127.0.0.1');
    expect(await request('127.0.0.1')).toEqual({ status: 200, body: 'host-probe' });
    for (const address of addresses) {
      await expect(request(address)).rejects.toMatchObject({ code: 'ECONNREFUSED' });
    }
  });
});

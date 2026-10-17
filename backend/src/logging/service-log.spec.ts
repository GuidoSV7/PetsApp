import { BadRequestException, Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { logInfo, logWarn, traceWrite } from './service-log.js';

const fakeLogger = () => {
  const logger = new Logger('test');
  const log = vi.spyOn(logger, 'log').mockImplementation(() => {});
  const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  return { logger, log, warn };
};

describe('service log', () => {
  it('writes the message followed by the event payload', () => {
    const { logger, log, warn } = fakeLogger();

    logInfo(logger, 'user_created', 'user created', { id: '1' });
    logWarn(logger, 'user_rejected', 'user rejected', { reason: 'x' });

    expect(log).toHaveBeenCalledWith(
      'user created {"event":"user_created","id":"1"}',
    );
    expect(warn).toHaveBeenCalledWith(
      'user rejected {"event":"user_rejected","reason":"x"}',
    );
  });

  it('traceWrite logs info on success with the id fields', async () => {
    const { logger, log } = fakeLogger();

    const result = await traceWrite(
      logger,
      'role_created',
      {},
      () => Promise.resolve({ code: 'vet' }),
      (saved) => ({ code: saved.code }),
    );

    expect(result).toEqual({ code: 'vet' });
    expect(log).toHaveBeenCalledWith(
      'role_created {"event":"role_created","code":"vet"}',
    );
  });

  it('traceWrite warns on a 4xx and rethrows, but stays silent on a 5xx', async () => {
    const { logger, warn } = fakeLogger();

    await expect(
      traceWrite(logger, 'role_created', { code: 'x' }, () =>
        Promise.reject(new BadRequestException('bad name')),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      traceWrite(logger, 'role_created', {}, () =>
        Promise.reject(new Error('boom')),
      ),
    ).rejects.toThrow('boom');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'role_created rejected {"event":"role_created_rejected","code":"x","reason":"bad name"}',
    );
  });
});

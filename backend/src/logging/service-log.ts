import { HttpException, Logger } from '@nestjs/common';

export type LogFields = Record<
  string,
  string | number | boolean | null | undefined
>;

/** One structured line: the human message followed by the event payload. */
const line = (event: string, message: string, fields: LogFields): string =>
  `${message} ${JSON.stringify({ event, ...fields })}`;

export function logInfo(
  logger: Logger,
  event: string,
  message: string,
  fields: LogFields = {},
): void {
  logger.log(line(event, message, fields));
}

export function logDebug(
  logger: Logger,
  event: string,
  message: string,
  fields: LogFields = {},
): void {
  logger.debug(line(event, message, fields));
}

export function logWarn(
  logger: Logger,
  event: string,
  message: string,
  fields: LogFields = {},
): void {
  logger.warn(line(event, message, fields));
}

/** Runs a write, logs info on success and warn on an expected 4xx. Rethrows. */
export async function traceWrite<T>(
  logger: Logger,
  event: string,
  fields: LogFields,
  run: () => Promise<T>,
  idOf?: (result: T) => LogFields,
): Promise<T> {
  try {
    const result = await run();
    logInfo(logger, event, event, { ...fields, ...(idOf ? idOf(result) : {}) });
    return result;
  } catch (error) {
    if (error instanceof HttpException && error.getStatus() < 500) {
      logWarn(logger, `${event}_rejected`, `${event} rejected`, {
        ...fields,
        reason: error.message,
      });
    }
    throw error;
  }
}

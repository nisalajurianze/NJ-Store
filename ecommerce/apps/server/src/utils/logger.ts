import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createLogger, format, transports } from 'winston';

import { env } from '../config/env.js';

const parseLogMaxSize = (value: string): number => {
  const match = value.trim().match(/^(\d+)([kmg])?$/i);
  if (!match) {
    return 10 * 1024 * 1024;
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  if (unit === 'g') {
    return amount * 1024 * 1024 * 1024;
  }
  if (unit === 'm') {
    return amount * 1024 * 1024;
  }
  if (unit === 'k') {
    return amount * 1024;
  }

  return amount;
};

const buildFileTransports = () => {
  if (!env.LOG_FILE_ENABLED) {
    return [];
  }

  mkdirSync(env.LOG_FILE_DIR, { recursive: true });
  const maxsize = parseLogMaxSize(env.LOG_FILE_MAX_SIZE);

  return [
    new transports.File({
      filename: path.join(env.LOG_FILE_DIR, 'error.log'),
      level: 'error',
      maxsize,
      maxFiles: env.LOG_FILE_MAX_FILES
    }),
    new transports.File({
      filename: path.join(env.LOG_FILE_DIR, 'combined.log'),
      maxsize,
      maxFiles: env.LOG_FILE_MAX_FILES
    })
  ];
};

export const logger = createLogger({
  level: env.LOG_LEVEL,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? format.json()
      : format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level.toUpperCase()}: ${stack ?? message}${metaStr}`;
        })
  ),
  transports: [new transports.Console(), ...buildFileTransports()]
});

export const winstonStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  }
};

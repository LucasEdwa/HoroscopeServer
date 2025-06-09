import fs from 'fs';
import path from 'path';
import { createLogger, format, transports } from 'winston';

// Ensure logs directory exists
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Write all logs and errors to /logs/error.log
const errorLogFile = path.join(logDir, 'error.log');

export const Logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    new transports.File({ filename: errorLogFile }),
    new transports.Console()
  ],
  exceptionHandlers: [
    new transports.File({ filename: errorLogFile })
  ]
});
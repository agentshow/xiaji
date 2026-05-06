import * as fs from 'node:fs';
import * as path from 'node:path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

export class Logger {
  private logDir: string;
  private level: LogLevel;

  constructor(logDir: string, level: LogLevel = LogLevel.INFO) {
    this.logDir = logDir;
    this.level = level;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const label = LOG_LEVEL_LABELS[level];
    return `[${timestamp}] [${label}] ${message}`;
  }

  private write(level: LogLevel, message: string): void {
    if (level < this.level) return;
    const formatted = this.formatMessage(level, message);
    const logFile = path.join(this.logDir, 'xiaji.log');
    fs.appendFileSync(logFile, formatted + '\n');
  }

  debug(message: string): void {
    this.write(LogLevel.DEBUG, message);
  }

  info(message: string): void {
    this.write(LogLevel.INFO, message);
  }

  warn(message: string): void {
    this.write(LogLevel.WARN, message);
  }

  error(message: string): void {
    const errorFile = path.join(this.logDir, 'xiaji-error.log');
    const formatted = this.formatMessage(LogLevel.ERROR, message);
    fs.appendFileSync(errorFile, formatted + '\n');
    this.write(LogLevel.ERROR, message);
  }
}

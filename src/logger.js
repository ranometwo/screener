export const LOG_LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};

export class Logger {
  static level = LOG_LEVELS.INFO;

  static setLevel(levelName) {
    const lvl = LOG_LEVELS[levelName];
    if (lvl !== undefined) {
      this.level = lvl;
      this.info(`Logger level set to ${levelName}`);
    } else {
      console.warn(`[EvenTrade] Invalid log level: ${levelName}`);
    }
  }

  static error(...args) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error('[EvenTrade]', ...args);
    }
  }

  static warn(...args) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn('[EvenTrade]', ...args);
    }
  }

  static info(...args) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log('[EvenTrade]', ...args);
    }
  }

  static debug(...args) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.debug('[EvenTrade]', ...args);
    }
  }
}

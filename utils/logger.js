const fs = require('fs-extra');
const path = require('path');

class Logger {
  constructor(options = {}) {
    this.options = {
      logToFile: options.logToFile || false,
      logDir: options.logDir || path.join(process.cwd(), 'logs'),
      logLevel: options.logLevel || 'info', // debug, info, warn, error
      maxLogFileSize: options.maxLogFileSize || 10 * 1024 * 1024, // 10MB
      maxLogFiles: options.maxLogFiles || 5,
      ...options
    };

    // Create log directory if needed
    if (this.options.logToFile) {
      fs.ensureDirSync(this.options.logDir);
    }
    
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    this.currentLogLevel = this.levels[this.options.logLevel];
  }
  
  _shouldLog(level) {
    return this.levels[level] >= this.currentLogLevel;
  }
  
  _formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    });
  }
  
  async _writeToFile(formattedMessage) {
    if (!this.options.logToFile) return;
    
    const logFile = path.join(this.options.logDir, 'app.log');
    
    // Check if rotation is needed
    try {
      const stats = await fs.stat(logFile).catch(() => ({ size: 0 }));
      
      if (stats.size > this.options.maxLogFileSize) {
        // Rotate logs
        for (let i = this.options.maxLogFiles - 1; i > 0; i--) {
          const oldFile = path.join(this.options.logDir, `app.log.${i}`);
          const newFile = path.join(this.options.logDir, `app.log.${i + 1}`);
          
          if (await fs.pathExists(oldFile)) {
            await fs.rename(oldFile, newFile).catch(() => {});
          }
        }
        
        // Rename current log to .1
        await fs.rename(logFile, path.join(this.options.logDir, 'app.log.1')).catch(() => {});
      }
      
      // Append to log file
      await fs.appendFile(logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }
  
  log(level, message, meta = {}) {
    if (!this._shouldLog(level)) return;
    
    const formattedMessage = this._formatMessage(level, message, meta);
    
    // Always log to console
    if (level === 'error' || level === 'warn') {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
    
    // Write to file if configured
    this._writeToFile(formattedMessage);
  }
  
  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
  
  info(message, meta = {}) {
    this.log('info', message, meta);
  }
  
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }
  
  error(message, meta = {}) {
    this.log('error', message, meta);
  }
}

module.exports = new Logger({
  logToFile: process.env.LOG_TO_FILE === 'true',
  logLevel: process.env.LOG_LEVEL || 'info'
});
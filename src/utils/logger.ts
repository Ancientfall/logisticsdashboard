/**
 * Centralized logging utility for BP Logistics Dashboard
 * Provides consistent logging with environment-based controls
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogContext {
  component?: string;
  function?: string;
  data?: any;
  timestamp?: number;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private enabledModules: Set<string>;

  private constructor() {
    // Set log level based on environment
    this.logLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.ERROR;
    this.enabledModules = new Set();
    
    // Enable specific modules in development
    if (process.env.NODE_ENV === 'development') {
      this.enabledModules.add('data-processing');
      this.enabledModules.add('performance');
      this.enabledModules.add('user-actions');
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel, module?: string): boolean {
    if (level > this.logLevel) return false;
    if (module && !this.enabledModules.has(module)) return false;
    return true;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const component = context?.component ? `[${context.component}]` : '';
    const func = context?.function ? `::${context.function}` : '';
    
    return `${timestamp} ${level} ${component}${func} ${message}`;
  }

  error(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR, context?.component)) return;
    
    const formatted = this.formatMessage('❌ ERROR', message, context);
    console.error(formatted, context?.data || '');
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN, context?.component)) return;
    
    const formatted = this.formatMessage('⚠️ WARN', message, context);
    console.warn(formatted, context?.data || '');
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO, context?.component)) return;
    
    const formatted = this.formatMessage('ℹ️ INFO', message, context);
    console.log(formatted, context?.data || '');
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG, context?.component)) return;
    
    const formatted = this.formatMessage('🔍 DEBUG', message, context);
    console.log(formatted, context?.data || '');
  }

  trace(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.TRACE, context?.component)) return;
    
    const formatted = this.formatMessage('🔬 TRACE', message, context);
    console.log(formatted, context?.data || '');
  }

  // Performance logging
  startTimer(name: string): void {
    if (this.shouldLog(LogLevel.DEBUG, 'performance')) {
      console.time(`⏱️ ${name}`);
    }
  }

  endTimer(name: string): void {
    if (this.shouldLog(LogLevel.DEBUG, 'performance')) {
      console.timeEnd(`⏱️ ${name}`);
    }
  }

  // Group logging for complex operations
  group(name: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(`📁 ${name}`);
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  // Enable/disable specific modules
  enableModule(module: string): void {
    this.enabledModules.add(module);
  }

  disableModule(module: string): void {
    this.enabledModules.delete(module);
  }

  // Set log level
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports for common use cases
export const logError = (message: string, context?: LogContext) => logger.error(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logTrace = (message: string, context?: LogContext) => logger.trace(message, context);
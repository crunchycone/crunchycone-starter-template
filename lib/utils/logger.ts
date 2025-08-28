/**
 * Structured JSON Logger for Production
 *
 * Provides consistent logging format with timestamps and log levels.
 * In production: outputs structured JSON
 * In development: outputs readable console logs
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isProduction = process.env.NODE_ENV === "production";
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

  // PII fields that should be removed from logs
  private readonly piiFields = [
    "email",
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "cookie",
    "session",
    "ssn",
    "phone",
    "address",
    "creditCard",
    "bankAccount",
    "personalInfo",
  ];

  private sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== "object") return data;

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const [key, value] of Object.entries(sanitized)) {
      const lowerKey = key.toLowerCase();

      // Remove PII fields
      if (this.piiFields.some((pii) => lowerKey.includes(pii))) {
        sanitized[key] = "[REDACTED]";
      }
      // Recursively sanitize nested objects
      else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      }
    }

    return sanitized;
  }

  private getLevelPriority(level: LogLevel): number {
    const priorities = { error: 0, warn: 1, info: 2, debug: 3 };
    return priorities[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) <= this.getLevelPriority(this.logLevel);
  }

  private formatLog(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (meta && Object.keys(meta).length > 0) {
      logEntry.meta = this.sanitizeData(meta);
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (this.isProduction) {
      // Production: JSON format
      console.log(JSON.stringify(logEntry));
    } else {
      // Development: readable format
      const timestamp = new Date().toLocaleTimeString();
      const levelTag = `[${level.toUpperCase()}]`;
      const sanitizedMeta = meta ? this.sanitizeData(meta) : null;
      const metaStr = sanitizedMeta ? ` ${JSON.stringify(sanitizedMeta)}` : "";
      const errorStr = error ? `\n${error.stack}` : "";

      console.log(`${timestamp} ${levelTag} ${message}${metaStr}${errorStr}`);
    }
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.formatLog("error", message, meta, error);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.formatLog("warn", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.formatLog("info", message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.formatLog("debug", message, meta);
  }

  // Convenience methods for common use cases
  request(method: string, url: string, statusCode?: number, duration?: number): void {
    this.info("HTTP Request", {
      method,
      url,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  database(query: string, duration?: number, error?: Error): void {
    if (error) {
      this.error("Database Query Failed", error, {
        query,
        duration: duration ? `${duration}ms` : undefined,
      });
    } else {
      this.debug("Database Query", { query, duration: duration ? `${duration}ms` : undefined });
    }
  }

  auth(event: string, userId?: string, error?: Error): void {
    if (error) {
      this.error(`Auth ${event} Failed`, error, { userId });
    } else {
      this.info(`Auth ${event}`, { userId });
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Override console methods in production to use structured logging
if (process.env.NODE_ENV === "production" && process.env.STRUCTURED_LOGGING !== "false") {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  console.log = (...args: unknown[]) => {
    const message = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
      .join(" ");
    logger.info(message);
  };

  console.error = (...args: unknown[]) => {
    const message = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
      .join(" ");
    logger.error(message);
  };

  console.warn = (...args: unknown[]) => {
    const message = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
      .join(" ");
    logger.warn(message);
  };

  console.info = (...args: unknown[]) => {
    const message = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
      .join(" ");
    logger.info(message);
  };

  // Preserve original methods for internal use
  (console as Console & { _originalLog: typeof originalLog })._originalLog = originalLog;
  (console as Console & { _originalError: typeof originalError })._originalError = originalError;
  (console as Console & { _originalWarn: typeof originalWarn })._originalWarn = originalWarn;
  (console as Console & { _originalInfo: typeof originalInfo })._originalInfo = originalInfo;
}

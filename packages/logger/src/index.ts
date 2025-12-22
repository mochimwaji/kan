/**
 * @kan/logger - Structured logging for the Kan application
 *
 * Features:
 * - Log levels controlled via LOG_LEVEL environment variable
 * - Database query logging via DB_LOG_QUERIES environment variable
 * - Structured JSON output in production, pretty output in development
 * - Context preservation (request IDs, user IDs, etc.)
 * - Child loggers for scoped contexts
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface LogContext {
  requestId?: string;
  userId?: string;
  workspaceId?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
  child(defaultContext: LogContext): Logger;
}

// Log level priority (higher number = more severe)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

/**
 * Get the configured log level from environment variables
 * Defaults to "info" in production, "debug" in development
 */
function getLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/**
 * Check if database query logging is enabled
 */
export function isDbLoggingEnabled(): boolean {
  const dbLogQueries = process.env.DB_LOG_QUERIES?.toLowerCase();
  return dbLogQueries === "true" || dbLogQueries === "1";
}

/**
 * Check if a log level should be output based on configured level
 */
function shouldLog(level: LogLevel): boolean {
  const configuredLevel = getLogLevel();
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
}

/**
 * Format log output based on environment
 */
function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown,
): string {
  const timestamp = new Date().toISOString();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    // JSON format for production (easier to parse in log aggregators)
    const logObject: Record<string, unknown> = {
      timestamp,
      level,
      message,
      ...context,
    };

    if (error) {
      if (error instanceof Error) {
        logObject.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        logObject.error = error;
      }
    }

    return JSON.stringify(logObject);
  }

  // Pretty format for development
  const levelColors: Record<LogLevel, string> = {
    debug: "\x1b[36m", // Cyan
    info: "\x1b[32m", // Green
    warn: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
    silent: "",
  };
  const reset = "\x1b[0m";
  const dim = "\x1b[2m";

  let output = `${dim}${timestamp}${reset} ${levelColors[level]}[${level.toUpperCase()}]${reset} ${message}`;

  if (context && Object.keys(context).length > 0) {
    output += ` ${dim}${JSON.stringify(context)}${reset}`;
  }

  if (error) {
    if (error instanceof Error) {
      output += `\n${levelColors.error}  Error: ${error.message}${reset}`;
      if (error.stack) {
        output += `\n${dim}${error.stack}${reset}`;
      }
    } else {
      output += `\n${dim}  ${JSON.stringify(error)}${reset}`;
    }
  }

  return output;
}

/**
 * Create a logger instance
 */
function createLogger(defaultContext: LogContext = {}): Logger {
  return {
    debug(message: string, context?: LogContext) {
      if (shouldLog("debug")) {
        console.debug(
          formatLog("debug", message, { ...defaultContext, ...context }),
        );
      }
    },

    info(message: string, context?: LogContext) {
      if (shouldLog("info")) {
        console.info(
          formatLog("info", message, { ...defaultContext, ...context }),
        );
      }
    },

    warn(message: string, context?: LogContext) {
      if (shouldLog("warn")) {
        console.warn(
          formatLog("warn", message, { ...defaultContext, ...context }),
        );
      }
    },

    error(message: string, error?: unknown, context?: LogContext) {
      if (shouldLog("error")) {
        console.error(
          formatLog("error", message, { ...defaultContext, ...context }, error),
        );
      }
    },

    child(childContext: LogContext): Logger {
      return createLogger({ ...defaultContext, ...childContext });
    },
  };
}

// Export the default logger instance
export const logger = createLogger();

// Export factory function for creating custom loggers
export { createLogger };

// Pre-configured child loggers for common use cases
export const apiLogger = logger.child({ component: "api" });
export const dbLogger = logger.child({ component: "db" });
export const authLogger = logger.child({ component: "auth" });

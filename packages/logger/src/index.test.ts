import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createLogger, isDbLoggingEnabled, logger } from "./index";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
    delete process.env.DB_LOG_QUERIES;
  });

  describe("log levels", () => {
    it("logs debug messages when LOG_LEVEL is debug", () => {
      process.env.LOG_LEVEL = "debug";
      const testLogger = createLogger();
      testLogger.debug("test message");
      expect(console.debug).toHaveBeenCalled();
    });

    it("does not log debug messages when LOG_LEVEL is info", () => {
      process.env.LOG_LEVEL = "info";
      const testLogger = createLogger();
      testLogger.debug("test message");
      expect(console.debug).not.toHaveBeenCalled();
    });

    it("logs info messages when LOG_LEVEL is info", () => {
      process.env.LOG_LEVEL = "info";
      const testLogger = createLogger();
      testLogger.info("test message");
      expect(console.info).toHaveBeenCalled();
    });

    it("logs warn messages when LOG_LEVEL is warn", () => {
      process.env.LOG_LEVEL = "warn";
      const testLogger = createLogger();
      testLogger.warn("test message");
      expect(console.warn).toHaveBeenCalled();
    });

    it("logs error messages regardless of level", () => {
      process.env.LOG_LEVEL = "error";
      const testLogger = createLogger();
      testLogger.error("test error");
      expect(console.error).toHaveBeenCalled();
    });

    it("does not log anything when LOG_LEVEL is silent", () => {
      process.env.LOG_LEVEL = "silent";
      const testLogger = createLogger();
      testLogger.debug("debug");
      testLogger.info("info");
      testLogger.warn("warn");
      testLogger.error("error");
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("context", () => {
    it("includes context in log output", () => {
      process.env.LOG_LEVEL = "info";
      const testLogger = createLogger();
      testLogger.info("test message", { userId: "123" });
      expect(console.info).toHaveBeenCalled();
      const logOutput = (console.info as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(logOutput).toContain("userId");
      expect(logOutput).toContain("123");
    });

    it("child logger preserves parent context", () => {
      process.env.LOG_LEVEL = "info";
      const parentLogger = createLogger({ component: "api" });
      const childLogger = parentLogger.child({ requestId: "req_123" });
      childLogger.info("test message");
      const logOutput = (console.info as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(logOutput).toContain("api");
      expect(logOutput).toContain("req_123");
    });

    it("child context overrides parent context", () => {
      process.env.LOG_LEVEL = "info";
      const parentLogger = createLogger({ userId: "parent" });
      const childLogger = parentLogger.child({ userId: "child" });
      childLogger.info("test message");
      const logOutput = (console.info as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(logOutput).toContain("child");
    });
  });

  describe("error handling", () => {
    it("includes Error object details in output", () => {
      process.env.LOG_LEVEL = "error";
      const testLogger = createLogger();
      const testError = new Error("Test error message");
      testLogger.error("Something went wrong", testError);
      const logOutput = (console.error as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as string;
      expect(logOutput).toContain("Test error message");
    });
  });

  describe("default logger", () => {
    it("exports a default logger instance", () => {
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.child).toBe("function");
    });
  });
});

describe("isDbLoggingEnabled", () => {
  afterEach(() => {
    delete process.env.DB_LOG_QUERIES;
  });

  it("returns false when DB_LOG_QUERIES is not set", () => {
    expect(isDbLoggingEnabled()).toBe(false);
  });

  it("returns true when DB_LOG_QUERIES is 'true'", () => {
    process.env.DB_LOG_QUERIES = "true";
    expect(isDbLoggingEnabled()).toBe(true);
  });

  it("returns true when DB_LOG_QUERIES is '1'", () => {
    process.env.DB_LOG_QUERIES = "1";
    expect(isDbLoggingEnabled()).toBe(true);
  });

  it("returns false when DB_LOG_QUERIES is 'false'", () => {
    process.env.DB_LOG_QUERIES = "false";
    expect(isDbLoggingEnabled()).toBe(false);
  });

  it("returns false when DB_LOG_QUERIES is any other value", () => {
    process.env.DB_LOG_QUERIES = "yes";
    expect(isDbLoggingEnabled()).toBe(false);
  });
});

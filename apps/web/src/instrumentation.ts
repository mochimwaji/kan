/* eslint-disable @typescript-eslint/no-require-imports -- Dynamic imports for instrumentation */
/* eslint-disable no-restricted-properties -- NEXT_RUNTIME is only available via process.env */
/* eslint-disable turbo/no-undeclared-env-vars -- NEXT_RUNTIME is a Next.js internal env var */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await require("pino");
    await require("next-logger");

    // Start notification scheduler (runs in-process)
    const { createDrizzleClient } = await import("@kan/db/client");
    const { startNotificationScheduler } = await import(
      "@kan/api/services/scheduler"
    );

    const db = createDrizzleClient();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // Start scheduler with slight delay to ensure server is ready
    setTimeout(() => {
      startNotificationScheduler(db, baseUrl);
    }, 5000);
  }
}

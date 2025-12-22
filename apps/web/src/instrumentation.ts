/* eslint-disable @typescript-eslint/no-require-imports -- Dynamic imports for instrumentation */
/* eslint-disable no-restricted-properties -- NEXT_RUNTIME is only available via process.env */
/* eslint-disable turbo/no-undeclared-env-vars -- NEXT_RUNTIME is a Next.js internal env var */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await require("pino");
    await require("next-logger");
  }
}

import * as fs from "fs";
import * as path from "path";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
import { apiKey, genericOAuth } from "better-auth/plugins";
import { magicLink } from "better-auth/plugins/magic-link";
import { socialProviderList } from "better-auth/social-providers";
import { env } from "next-runtime-env";

import type { dbClient } from "@kan/db/client";
import * as memberRepo from "@kan/db/repository/member.repo";
import * as userRepo from "@kan/db/repository/user.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as schema from "@kan/db/schema";
import { sendEmail } from "@kan/email";
import { authLogger } from "@kan/logger";

export const configuredProviders = socialProviderList.reduce<
  Record<
    string,
    {
      clientId: string;
      clientSecret: string;
      appBundleIdentifier?: string;
      tenantId?: string;
      requireSelectAccount?: boolean;
      clientKey?: string;
      issuer?: string;
      // Google-specific optional hints
      hostedDomain?: string;
      hd?: string;
    }
  >
>((acc, provider) => {
  const id = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
  const secret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
  if (id && id.length > 0 && secret && secret.length > 0) {
    acc[provider] = { clientId: id, clientSecret: secret };
  }
  if (
    provider === "apple" &&
    Object.keys(acc).includes("apple") &&
    acc[provider]
  ) {
    const bundleId =
      process.env[`${provider.toUpperCase()}_APP_BUNDLE_IDENTIFIER`];
    if (bundleId && bundleId.length > 0) {
      acc[provider].appBundleIdentifier = bundleId;
    }
  }
  if (
    provider === "gitlab" &&
    Object.keys(acc).includes("gitlab") &&
    acc[provider]
  ) {
    const issuer = process.env[`${provider.toUpperCase()}_ISSUER`];
    if (issuer && issuer.length > 0) {
      acc[provider].issuer = issuer;
    }
  }
  if (
    provider === "microsoft" &&
    Object.keys(acc).includes("microsoft") &&
    acc[provider]
  ) {
    acc[provider].tenantId = "common";
    acc[provider].requireSelectAccount = true;
  }
  // Add Google domain hint if allowed domains is configured
  if (
    provider === "google" &&
    Object.keys(acc).includes("google") &&
    acc[provider]
  ) {
    const allowed = process.env.BETTER_AUTH_ALLOWED_DOMAINS?.split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    if (allowed && allowed.length > 0) {
      // Use the first domain as an authorization hint
      acc[provider].hostedDomain = allowed[0];
      acc[provider].hd = allowed[0];
    }
  }
  if (
    provider === "tiktok" &&
    Object.keys(acc).includes("tiktok") &&
    acc[provider]
  ) {
    const key = process.env[`${provider.toUpperCase()}_CLIENT_KEY`];
    if (key && key.length > 0) {
      acc[provider].clientKey = key;
    }
  }
  return acc;
}, {});

export const socialProvidersPlugin = () => ({
  id: "social-providers-plugin",
  endpoints: {
    getSocialProviders: createAuthEndpoint(
      "/social-providers",
      {
        method: "GET",
      },
      async (ctx) => {
        const providers = ctx.context.socialProviders.map((p) =>
          p.id.toLowerCase(),
        );
        // Add OIDC provider if configured
        if (
          process.env.OIDC_CLIENT_ID &&
          process.env.OIDC_CLIENT_SECRET &&
          process.env.OIDC_DISCOVERY_URL
        ) {
          providers.push("oidc");
        }
        return ctx.json(providers);
      },
    ),
  },
});

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export const initAuth = (db: dbClient) => {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: env("NEXT_PUBLIC_BASE_URL"),
    trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
      ? [
          env("NEXT_PUBLIC_BASE_URL") ?? "",
          ...process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(","),
        ]
      : [env("NEXT_PUBLIC_BASE_URL") ?? ""],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.users,
      },
    }),
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24 * 2, // Update session expiry every 48 hours if user is active
      freshAge: 0,
    },
    emailAndPassword: {
      enabled: env("NEXT_PUBLIC_ALLOW_CREDENTIALS")?.toLowerCase() === "true",
      disableSignUp:
        env("NEXT_PUBLIC_DISABLE_SIGN_UP")?.toLowerCase() === "true",
      sendResetPassword: async (data) => {
        await sendEmail(data.user.email, "Reset Password", "RESET_PASSWORD", {
          resetPasswordUrl: data.url,
          resetPasswordToken: data.token,
        });
      },
    },
    socialProviders: configuredProviders,
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    plugins: [
      socialProvidersPlugin(),
      // @todo: hasing is disabled due to a bug in the api key plugin
      apiKey({
        disableKeyHashing: true,
        rateLimit: {
          enabled: true,
          timeWindow: 1000 * 60, // 1 minute
          maxRequests: 100, // 100 requests per minute
        },
      }),
      magicLink({
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        sendMagicLink: async ({ email, url }) => {
          if (url.includes("type=invite")) {
            await sendEmail(
              email,
              "Invitation to join workspace",
              "JOIN_WORKSPACE",
              {
                magicLoginUrl: url,
              },
            );
          } else {
            await sendEmail(email, "Sign in to kan.bn", "MAGIC_LINK", {
              magicLoginUrl: url,
            });
          }
        },
      }),
      // Generic OIDC provider
      ...(process.env.OIDC_CLIENT_ID &&
      process.env.OIDC_CLIENT_SECRET &&
      process.env.OIDC_DISCOVERY_URL
        ? [
            genericOAuth({
              config: [
                {
                  providerId: "oidc",
                  clientId: process.env.OIDC_CLIENT_ID,
                  clientSecret: process.env.OIDC_CLIENT_SECRET,
                  discoveryUrl: process.env.OIDC_DISCOVERY_URL,
                  scopes: ["openid", "email", "profile"],
                  pkce: true,
                },
              ],
            }),
          ]
        : []),
    ],
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            if (env("NEXT_PUBLIC_DISABLE_SIGN_UP")?.toLowerCase() === "true") {
              const pendingInvitation = await memberRepo.getByEmailAndStatus(
                db,
                user.email,
                "invited",
              );

              if (!pendingInvitation) {
                return Promise.resolve(false);
              }

              // Fall through to any additional checks below
            }
            // Enforce allowed domains (OIDC/social) if configured
            const allowed = process.env.BETTER_AUTH_ALLOWED_DOMAINS?.split(",")
              .map((d) => d.trim().toLowerCase())
              .filter(Boolean);
            if (allowed && allowed.length > 0) {
              const domain = user.email.split("@")[1]?.toLowerCase();
              if (!domain || !allowed.includes(domain)) {
                return Promise.resolve(false);
              }
            }
            return Promise.resolve(true);
          },
          async after(user) {
            await ensureLocalAvatar(user);
          },
        },
      },
      session: {
        create: {
          async after(session) {
            const user = await userRepo.getById(db, session.userId);
            if (user) {
              await ensureLocalAvatar(user);
            }
          },
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (
          ctx.path === "/magic-link/verify" &&
          (ctx.query?.callbackURL as string | undefined)?.includes(
            "type=invite",
          )
        ) {
          const userId = ctx.context.newSession?.session.userId;
          const callbackURL = ctx.query?.callbackURL as string | undefined;
          const memberPublicId = callbackURL?.split("memberPublicId=")[1];

          if (userId && memberPublicId) {
            const member = await memberRepo.getByPublicId(db, memberPublicId);

            if (member?.id) {
              await memberRepo.acceptInvite(db, {
                memberId: member.id,
                userId,
              });
            }
          }
        }
      }),
    },
    advanced: {
      cookiePrefix: "kan",
      database: {
        generateId: false,
      },
    },
  });
  async function ensureLocalAvatar(user: {
    id: string;
    image?: string | null;
  }) {
    // Migrate if it's an external URL or a legacy S3-style path
    const isExternal = user.image?.startsWith("http");
    const isLegacyS3 =
      user.image?.startsWith("avatars/") && user.image.includes("/");

    if (user.image && (isExternal || isLegacyS3)) {
      try {
        const { DEFAULT_STORAGE_PATH } = await import("@kan/db/constants");
        const STORAGE_PATH = process.env.STORAGE_PATH ?? DEFAULT_STORAGE_PATH;
        const avatarsPath = path.join(STORAGE_PATH, "avatars");

        // Ensure avatars directory exists
        if (!fs.existsSync(avatarsPath)) {
          fs.mkdirSync(avatarsPath, { recursive: true });
        }

        const allowedFileExtensions = ["jpg", "jpeg", "png", "webp"];
        const fileExtension =
          user.image.split(".").pop()?.split("?")[0] || "jpg";
        const ext = !allowedFileExtensions.includes(fileExtension)
          ? "jpg"
          : fileExtension;
        const filename = `${user.id}-avatar.${ext}`;

        // If it's an external URL, download it
        if (isExternal) {
          const imageBuffer = await downloadImage(user.image);
          await fs.promises.writeFile(
            path.join(avatarsPath, filename),
            imageBuffer,
          );
        } else if (isLegacyS3) {
          // If it's a legacy S3 path, we might not have the source file
          // but if we do have it locally (maybe transferred), we could rename it.
          // For now, since it's breaking, if it's an S3 path and we can't find it,
          // we should probably just clear it or let it fail gracefully.
          // Actually, the best is to just leave it if we can't migrate it,
          // but if it's external we MUST download it.
        }

        await userRepo.update(db, user.id, {
          image: filename,
        });
      } catch (error) {
        authLogger.error("Failed to migrate user avatar to local storage", {
          userId: user.id,
          image: user.image,
          error,
        });
      }
    }
  }
};

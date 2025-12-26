"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "~/utils/api";

interface UnsubscribePageProps {
  params: Promise<{ token: string }>;
}

export default function UnsubscribePage({ params }: UnsubscribePageProps) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    params.then((p) => setToken(p.token)).catch(() => setStatus("error"));
  }, [params]);

  const unsubscribeMutation =
    api.notification.subscription.unsubscribe.useMutation({
      onSuccess: () => {
        setStatus("success");
        setMessage("You have been unsubscribed from these notifications.");
      },
      onError: (error) => {
        setStatus("error");
        setMessage(
          error.message ||
            "Failed to unsubscribe. The link may be invalid or expired.",
        );
      },
    });

  useEffect(() => {
    if (token) {
      unsubscribeMutation.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-light-100 dark:bg-dark-100">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-dark-200">
        {status === "loading" && (
          <div className="text-center">
            <h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Processing...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we process your request.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="mb-4 text-5xl">✅</div>
            <h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Unsubscribed
            </h1>
            <p className="mb-6 text-gray-600 dark:text-gray-400">{message}</p>
            <Link
              href="/settings/notifications"
              className="rounded-lg bg-light-600 px-4 py-2 text-white hover:bg-light-700 dark:bg-dark-600 dark:hover:bg-dark-500"
            >
              Manage Subscriptions
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="mb-4 text-5xl">❌</div>
            <h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Error
            </h1>
            <p className="mb-6 text-gray-600 dark:text-gray-400">{message}</p>
            <Link
              href="/settings/notifications"
              className="rounded-lg bg-light-600 px-4 py-2 text-white hover:bg-light-700 dark:bg-dark-600 dark:hover:bg-dark-500"
            >
              Go to Settings
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

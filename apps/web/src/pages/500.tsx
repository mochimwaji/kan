import Link from "next/link";

export default function Custom500() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
          500
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
          An internal server error occurred.
        </p>
        <p className="mt-2 text-gray-500 dark:text-gray-500">
          Please try again later or contact support if the problem persists.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}

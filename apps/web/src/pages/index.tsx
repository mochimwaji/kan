import type { GetServerSideProps } from "next";

import { initAuth } from "@kan/auth/server";
import { createDrizzleClient } from "@kan/db/client";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const db = createDrizzleClient();
  const auth = initAuth(db);
  const session = await auth.api.getSession({
    headers: req.headers as unknown as Headers,
  });

  return {
    redirect: {
      destination: session ? "/boards" : "/login",
      permanent: false,
    },
  };
};

export default function Home() {
  // This component is never rendered due to the redirect
  return null;
}

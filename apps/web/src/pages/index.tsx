import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/login",
      permanent: false,
    },
  };
};

export default function Home() {
  // This component is never rendered due to the redirect
  return null;
}

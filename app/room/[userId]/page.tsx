"use client";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// Dynamically import Game component with SSR disabled
const Game = dynamic(() => import("@/components/Game"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="text-3xl font-bold">Loading Game...</div>
    </div>
  ),
});

function Page() {
  const params = useParams<{ userId: string; tag: string; item: string }>();
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-3xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{ fontFamily: "monaco, monospace" }}
      className="w-full flex-col h-full justify-center items-center flex overflow-hidden"
    >
      <Game userId={params.userId} />
    </div>
  );
}

export default Page;

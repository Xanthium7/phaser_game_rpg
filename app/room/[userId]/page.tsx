"use client";
import Game from "@/components/Game";
import { useParams } from "next/navigation";

import { useUser } from "@clerk/nextjs";

function Page() {
  const params = useParams<{ userId: string; tag: string; item: string }>();
  const { isLoaded, isSignedIn, user } = useUser();

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
      <Game userId={params.userId}></Game>
    </div>
  );
}

export default Page;

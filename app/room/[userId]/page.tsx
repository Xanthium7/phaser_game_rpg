"use client";
import Game from "@/components/Game";
import { useParams } from "next/navigation";
// import Room from "@/components/Room";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, ChangeEvent, useRef, FormEvent } from "react";
import Chat from "@/components/Chat";
import io from "socket.io-client";

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

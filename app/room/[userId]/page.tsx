"use client";
import Game from "@/components/Game";
import { useParams } from "next/navigation";
import Room from "@/components/Room";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

function Page() {
  const params = useParams<{ tag: string; item: string }>();
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-3xl font-bold">Loading...</div>
      </div>
    );
  }
  console.log("Username:", user.username);
  console.log("Type of user.username:", typeof user?.username);

  return (
    <div
      style={{ fontFamily: "monaco, monospace" }}
      className="w-full flex-col h-full justify-center items-center flex overflow-hidden"
    >
      <div className="text-xl absolute backdrop-blur-sm font- text-white top-10 right-10 z-10">
        <h1 className="">Room id: {params.userId}</h1>
      </div>

      <Game userId={params.userId} name={user.username}></Game>
    </div>
  );
}

export default Page;

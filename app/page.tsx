"use client";
import { v4 as uuidv4 } from "uuid";
import { useAuth, useUser } from "@clerk/nextjs";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useState } from "react";

export default function Home() {
  const [roomId] = useState(() => uuidv4());
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <SignedOut>
          <div className="bg-gray-900 text-white py-2 px-4 rounded">
            <SignInButton />
          </div>
        </SignedOut>
      </div>
    );
  }
  return (
    <div className="flex h-screen w-screen gap-11 flex-col justify-center items-center  ">
      <h1 className="font-semibold">THE GAME YEAH</h1>

      <div>Hello, {user.firstName} welcome to Clerk</div>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <a
        href={`/room/${roomId}`}
        className="bg-gray-800 text-white py-2 px-4 rounded"
      >
        Create A ROOM
      </a>
    </div>
  );
}

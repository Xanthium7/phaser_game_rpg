"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
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
      <a href="/room" className="bg-gray-800 text-white py-2 px-4 rounded">
        Create A ROOM
      </a>
    </div>
  );
}

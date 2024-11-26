"use client";
import Game from "@/components/Game";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";

function Page({ userId }: { userId: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [name, setName] = useState("");

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  setName(user?.firstName ?? "COOL NAME");

  return (
    <div className="  ">
      <div className="h-10 w-10 bg-red-500 z-"></div>
      <h1 className="font-semibold">Loading YEAH</h1>
      <h1 className="text-3xl  z-10">id: {userId}</h1>
      <div>Hello, {user.firstName} welcome to Clerk</div>
      <Game userId={userId} name={name} />
    </div>
  );
}

export default Page;

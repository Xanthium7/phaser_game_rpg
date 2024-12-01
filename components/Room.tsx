"use client";

import Game from "@/components/Game";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

function Room({ userId }: { userId: string }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [name, setName] = useState("Player");
  console.log("USER: ", user);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      setName(user.username || "Player");
    }
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div>
      <h1 className="font-semibold">Loading...</h1>
      <h1 className="text-3xl z-10">id: {userId}</h1>
      <div>Hello, {name}!</div>
      <Game userId={userId} name={name} />
    </div>
  );
}

export default Room;

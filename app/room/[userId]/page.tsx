"use client";
import Game from "@/components/Game";
import { useParams } from "next/navigation";
import Room from "@/components/Room";
import { useUser } from "@clerk/nextjs";

function Page() {
  const params = useParams<{ tag: string; item: string }>();
  // const { isLoaded, isSignedIn, user } = useUser();

  // if (!isLoaded || !isSignedIn) {
  //   return null;
  // }

  return (
    <div className="w-full flex-col h-full justify-center items-center flex overflow-hidden">
      {/* <Room userId={userId}></Room>; */}
      <h1 className="font-semibold">Loading...</h1>
      <h1 className="text-3xl z-10">id: {params.userId}</h1>
      {/* <div>Hello, {user.username}!</div> */}
      <Game userId={params.userId}></Game>
    </div>
  );
}

export default Page;

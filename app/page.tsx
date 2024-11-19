import Game from "@/components/Game";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex h-screen w-screen gap-11 flex-col justify-center items-center  ">
      <h1 className="font-semibold">THE GAME YEAH</h1>
      <h1 className="text-3xl">Do Authenticate My guy</h1>
      <button className="bg-gray-900 text-white py-2 px-4 rounded">
        AUTHENTICATE
      </button>

      <a href="/room">temporary redirect</a>
    </div>
  );
}

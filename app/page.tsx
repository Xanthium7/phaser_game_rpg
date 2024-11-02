import Game from "@/components/Game";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col justify-center items-center  ">
      <h1 className="font-semibold">THE GAME YEAH</h1>

      <Game />
    </div>
  );
}

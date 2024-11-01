import Game from "@/components/Game";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col justify-center items-center  ">
      <h1>Cool HEADING</h1>

      <Game />
    </div>
  );
}

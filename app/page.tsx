import Game from "@/components/Game";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-between p-24">
      <h1>Cool HEADING</h1>

      <Game />
    </div>
  );
}

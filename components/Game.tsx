"use client";
import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import Chat from "@/components/Chat";
import { useUser } from "@clerk/nextjs";

const Game = ({ userId }: { userId: string }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { message: string; user: string; time: string }[]
  >([]);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!isLoaded) return;

    console.log("NAME RECIEVED IN GAME: ", user.username);
    const socket = io("http://localhost:3001", {
      query: { roomId: userId, playername: user.username || "nice name" },
    });
    socketRef.current = socket; // To access this socket in the Form functions

    socket.on("chatMessage", (data: any) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          message: data.message,
          user: data.playername,
          time: data.time,
        },
      ]);
    });
    window.isChatFocused = false;

    // Handle socket disconnection
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    async function initPhaser() {
      const Phaser = await import("phaser");
      const { default: GridEngine } = await import("grid-engine");
      const Preloader = await import("../scenes/Preloader");
      //   const TestScene = await import("./scenes/TestScene");

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 950,
        height: 600,
        title: "cool-title",
        parent: "game-content",
        pixelArt: true,
        backgroundColor: "#473029",
        scale: {
          zoom: 2,
        },
        scene: [Preloader.default],
        physics: {
          default: "arcade",

          arcade: {
            debug: false,
          },
        },
        plugins: {
          scene: [
            {
              key: "gridEngine",
              plugin: GridEngine,
              mapping: "gridEngine",
            },
          ],
        },
      });

      game.scene.start("Preloader", { socket });

      return () => {
        game.destroy(true);
      };
    }

    initPhaser();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isLoaded]);
  const updateMessage = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (socketRef.current) {
      socketRef.current.emit("chatMessage", { message });

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          message: message,
          user: user.username,
          time: new Date().toLocaleTimeString(),
        },
      ]);

      setMessage("");
      handleBlur();
    }
  };

  //* FIXING SPACE-KEY OF ROOM CHAT INTERFIREING WITH SPACE-KEY OF GAME CONTROL
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleFocus = () => {
    setIsInputFocused(true);
    window.isChatFocused = true;
  };

  const handleBlur = () => {
    setIsInputFocused(false);
    window.isChatFocused = false;
  };

  return (
    <>
      <div
        id="game-content"
        className="overflow-hidden flex justify-center  h-screen w-screen bg-black"
      ></div>

      <div className="text-xl absolute backdrop-blur-sm flex flex-col max-w-[20vw]   text-white top-10 right-10 z-10">
        <h1 className="text-sm">
          <span className="font-extrabold text-lg">Room id</span>: {userId}
        </h1>
        <div className="border-[1px] rounded-md ">
          <h1 className="text-center border-b-[1px]">ROOM CHAT</h1>

          <div className=" flex flex-col justify-end h-96 overflow-y-scroll ">
            {messages.map((msg, index) => (
              <Chat
                key={index}
                message={msg.message}
                user={msg.user}
                time={msg.time}
              />
            ))}
          </div>
        </div>
        <div className="">
          <form
            className="flex justify-around"
            action=""
            method="post"
            onSubmit={handleSubmit}
          >
            <input
              placeholder="type something..."
              className="w-full rounded-md px-2 py-1 text-[#111] text-sm"
              type="text"
              name="message"
              value={message}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={updateMessage}
            />
            <button className="bg-[#38393f] px-3 py-1 " type="submit">
              SEND
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Game;

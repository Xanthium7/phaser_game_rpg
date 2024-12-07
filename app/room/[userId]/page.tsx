"use client";
import Game from "@/components/Game";
import { useParams } from "next/navigation";
// import Room from "@/components/Room";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, ChangeEvent, useRef, FormEvent } from "react";
import Chat from "@/components/Chat";
import io from "socket.io-client";

function Page() {
  const params = useParams<{ userId: string; tag: string; item: string }>();
  const { isLoaded, isSignedIn, user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { message: string; user: string; time: string }[]
  >([]);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    // Establish the socket connection only once
    if (socketRef.current === null) {
      const socket = io("http://localhost:3001", {
        query: {
          roomId: params.userId,
          playername: user.username,
        },
      });

      socketRef.current = socket;

      // Listen for chat messages
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

      // Handle socket disconnection
      socket.on("disconnect", () => {
        console.log("Socket disconnected");
      });
    }

    // Clean up the socket connection on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

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
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-3xl font-bold">Loading...</div>
      </div>
    );
  }

  // const updateMessage = (e: ChangeEvent<HTMLInputElement>) => {
  //   setMessage(e.target.value);
  // };
  // const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   if (message.trim() === "") return;
  //   const newMessage = {
  //     message: message,
  //     user: user.username || "Guest",
  //     time: new Date().toLocaleTimeString(),
  //   };
  //   socket.emit("chatMessage", newMessage);
  //   setMessage("");
  //   setMessages([...messages, newMessage]);
  // };

  return (
    <div
      style={{ fontFamily: "monaco, monospace" }}
      className="w-full flex-col h-full justify-center items-center flex overflow-hidden"
    >
      <div className="text-xl absolute backdrop-blur-sm flex flex-col max-w-[20vw]   text-white top-10 right-10 z-10">
        <h1 className="text-sm">
          <span className="font-extrabold text-lg">Room id</span>:{" "}
          {params.userId}
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
              onChange={updateMessage}
            />
            <button className="bg-[#38393f] px-3 py-1 " type="submit">
              SEND
            </button>
          </form>
        </div>
      </div>

      <Game userId={params.userId} name={user.username || "Guest"}></Game>
    </div>
  );
}

export default Page;

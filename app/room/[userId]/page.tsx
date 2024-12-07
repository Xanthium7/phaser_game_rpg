"use client";
import Game from "@/components/Game";
import { useParams } from "next/navigation";
// import Room from "@/components/Room";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, ChangeEvent } from "react";
import Chat from "@/components/Chat";

function Page() {
  const params = useParams<{ userId: string; tag: string; item: string }>();
  const { isLoaded, isSignedIn, user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-3xl font-bold">Loading...</div>
      </div>
    );
  }

  const updateMessage = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessages([
      ...messages,
      {
        message,
        user: user.username,
        date: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    console.log("Message submitted:", message);
    setMessage("");
  };

  return (
    <div
      style={{ fontFamily: "monaco, monospace" }}
      className="w-full flex-col h-full justify-center items-center flex overflow-hidden"
    >
      <div className="text-xl absolute backdrop-blur-sm flex flex-col max-w-[20vw]   text-white top-10 right-10 z-10">
        <h1 className="">Room id: {params.userId}</h1>
        <div className="border-[1px] rounded-md ">
          <h1 className="text-center border-b-[1px]">ROOM CHAT</h1>

          <div className=" flex flex-col justify-end h-96 overflow-y-scroll ">
            {messages.map((message, index) => (
              <Chat
                key={index}
                message={message.message}
                user={message.user}
                time={message.date}
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

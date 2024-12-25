"use client";
import { v4 as uuidv4 } from "uuid";
import { useUser } from "@clerk/nextjs";
import { motion } from "motion/react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VT323 } from "next/font/google";
import TypingAnimation from "@/components/ui/typing-animation";
import Image from "next/image";
import Features from "@/components/Features";
const vt232 = VT323({
  subsets: ["latin"],
  weight: "400",
});
export default function Home() {
  const [roomId] = useState(() => uuidv4());
  const [inputId, setInputId] = useState("");
  const { isLoaded, isSignedIn, user } = useUser();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setInputId(e.target.value);
  };
  const handleJoin = () => {
    window.location.href = `/room/${inputId}`;
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <SignedOut>
          <div className="bg-gray-900 text-white py-2 px-4 rounded">
            <SignInButton />
          </div>
        </SignedOut>
      </div>
    );
  }
  return (
    <div className={` ${vt232.className} overflow-x-hidden `}>
      <div
        className={`  h-[116vh] w-screen bg-fixed bg-cover bg-center bg-[url('/bg2.gif')]`}
      >
        <div className="overflow-hidden  h-24 bg-[#0000007c] backdrop-blur-sm border-b-[1px] border-[#f3f3f31c] w-full flex flex-row justify-center items-center">
          <motion.div
            className="box flex w-full justify-between mx-20  "
            initial={{ y: 80, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeInOut", delay: 0.2 }}
            animate={{ y: 0, scale: 1 }}
          >
            <h1 className="font-semibold text-5xl text-white ">CHILL-VERSE</h1>
            <div className="scale-[2]  h-12 w-12 rounded-full flex justify-center items-center">
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </motion.div>
        </div>
        <div className=" w-full h-full flex justify-end items-center flex-col text-white bg-[#0000007c] ">
          <div className="flex gap-10 h-full flex-col justify-center items-center  ">
            <div className="text-6xl w-[120%] flex justify-center ">
              <TypingAnimation>
                {`Hello ${user.username!.toUpperCase()}, Need a Place to Chill?`}
              </TypingAnimation>
            </div>

            <div className="flex  gap-10">
              <motion.div
                className="backdrop-blur-sm  flex justify-center items-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <a
                  href={`/room/${roomId}`}
                  className="bg-[#00000011] text-3xl border-[1px]  text-white py-2 px-4 rounded"
                >
                  CREATE ROOM
                </a>
              </motion.div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <motion.button
                    className="backdrop-blur-sm  flex justify-center items-center"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <a
                      // href={`/room/${roomId}`}
                      className="bg-[#00000011] text-3xl border-[1px] text-white py-2 px-4 rounded"
                    >
                      JOIN A ROOM
                    </a>
                  </motion.button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex justify-between gap-6">
                      <input
                        type="text"
                        placeholder="Give Room ID"
                        className="border-2 border-gray-300 rounded-md p-2 w-full"
                        value={inputId}
                        onChange={handleInput}
                      />
                      <AlertDialogAction
                        className=" mr-4 my-auto"
                        onClick={handleJoin}
                      >
                        JOIN
                      </AlertDialogAction>

                      <AlertDialogCancel className="font-bold absolute right-0 top-0 bg-transparent border-none">
                        X
                      </AlertDialogCancel>
                    </AlertDialogTitle>
                  </AlertDialogHeader>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
        <div
          className="flex  justify-center items-center 
        "
        >
          <h1 className="text-white text-7xl ">Features</h1>
        </div>
      </div>

      <Features
        ltr={true}
        text="Create a room and invite your friends to play together!"
        textSize="text-5xl"
        img="/bg.gif"
      />
    </div>
  );
}

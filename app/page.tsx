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
    <div className="h-screen w-screen">
      <div className="bg-slate-300 h-[40vh] flex justify-center items-center flex-col">
        <div className="overflow-hidden  h-16 w-full flex flex-row justify-center items-center">
          <motion.div
            className="box flex w-full justify-between mx-20  "
            initial={{ y: 80, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            animate={{ y: 0, scale: 1 }}
          >
            <h1 className="font-semibold text-5xl ">2D VERSE</h1>
            <div className="scale-[2]  h-12 w-12 rounded-full flex justify-center items-center">
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </motion.div>
        </div>
        <div className="flex gap-10 h-[25vh] flex-col justify-center items-center pt-20  ">
          <div className="text-2xl ">
            Hello, <span className="font-bold">{user.username} </span>
            Ready to Create Your 2D space?
          </div>

          <div className="flex  gap-4">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <a
                href={`/room/${roomId}`}
                className="bg-gray-700 text-white py-2 px-4 rounded"
              >
                CREATE ROOM
              </a>
            </motion.div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <a
                    // href={`/room/${roomId}`}
                    className="bg-gray-700 text-white py-2 px-4 rounded"
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
    </div>
  );
}

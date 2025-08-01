"use client";
import { v4 as uuidv4 } from "uuid";
import { useUser } from "@clerk/nextjs";
import { motion } from "motion/react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
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

import Features from "@/components/Features";
const vt232 = VT323({
  subsets: ["latin"],
  weight: "400",
});
export default function Home() {
  const [roomId] = useState(() => uuidv4());
  const [inputId, setInputId] = useState("");
  const { isLoaded, isSignedIn, user } = useUser();

  const [isClient, setIsClient] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setInputId(e.target.value);
  };
  const handleJoin = () => {
    window.location.href = `/room/${inputId}`;
  };
  useEffect(() => {
    setIsClient(true);
  }, []);
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

  // Show loading state until client-side code runs
  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-3xl font-bold">Loading...</div>
      </div>
    );
  }

  // if (isMobile) {
  //   return (
  //     <div className="flex flex-col justify-center items-center h-screen p-4">
  //       <Image
  //         src={"/mobile.jpg"}
  //         width={800}
  //         height={800}
  //         className="rounded-xl  border-[4px] border-[#ffffff1a] object-center object-cover "
  //         alt=""
  //       ></Image>
  //       <p className="text-center font-bold text-xl text-gray-700">
  //         OPEN THIS ON DESKTOP!!!
  //       </p>
  //       <p className="text-center   text-gray-700">
  //         (PS. I&apos;m working on a mobile version of the game controls and
  //         it&apos;ll be ready very soon!)
  //       </p>
  //     </div>
  //   );
  // }
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
            <div className="text-6xl w-[120%] flex flex-col items-center justify-center ">
              <TypingAnimation>
                {`Hello ${user.username!.toUpperCase()}, Need a Place to Chill?`}
              </TypingAnimation>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 2 }}
                className="text-lg"
              >
                (PS. use chrome browser as im cutting costs for TURN server)
              </motion.p>
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
      </div>
      <div className="flex flex-col b">
        <h1 className="text-white  bg-black pt-16 flex flex-col items-center justify-center   text-7xl ">
          Things To do...
        </h1>
      </div>

      <Features
        ltr={true}
        text="Create a room and invite your friends to play together!"
        textSize="text-5xl"
        img="/img1.png"
      />

      <Features
        ltr={false}
        text={`Use Arrow keys to move around, Space to Interact and Shift to Sprint.`}
        textSize="text-5xl"
        img="/img2.gif"
      />
      <Features
        ltr={true}
        text={`Use F4 to place video and audio calls with your friends.`}
        textSize="text-5xl"
        img="/img3.png"
      />
      <Features
        ltr={false}
        text={`Find the juke Box in Library to Stream your faviorite songs with your friends.`}
        textSize="text-5xl"
        img="/img4.gif"
      />
      <Features
        ltr={true}
        text={`Explore the map and find hidden easter eggs.`}
        textSize="text-5xl"
        img="/img5.png"
      />

      <footer className="bg-black  text-white py-4 flex justify-center items-center text-center w-full h-[16vh]">
        <h1 className="text-2xl"> Ready to Relax and Chill..?</h1>
      </footer>
    </div>
  );
}

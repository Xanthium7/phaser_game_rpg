"use client";
import { useEffect, useState, useRef, ChangeEvent, FormEvent } from "react";
import io from "socket.io-client";
import Chat from "@/components/Chat";
import { useUser } from "@clerk/nextjs";
import { MdContentCopy } from "react-icons/md";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { table } from "console";

const Game = ({ userId }: { userId: string }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { message: string; user: string; time: string }[]
  >([]);
  const socketRef = useRef<any>(null);

  // Video call
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreams = useRef<{ [id: string]: MediaStream }>({});
  const peerConnections = useRef<{ [id: string]: RTCPeerConnection }>({});
  const [isVideoCallModalOpen, setIsVideoCallModalOpen] = useState(false);
  const [callFrom, setCallFrom] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    console.log("NAME RECIEVED IN GAME: ", user?.username);
    const socket = io("http://localhost:3001", {
      query: { roomId: userId, playername: user?.username || "nice name" },
    });
    socketRef.current = socket; // To access this socket in the Form functions

    socket.on("chatMessage", (data: any) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          message: data.message,
          user: data.playername || "Anonymous",
          time: data.time,
        },
      ]);
    });
    window.isChatFocused = false;

    //*  Video call Part

    // Getthing those media devices
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
        alert(
          "Please allow access to camera and microphone to use the video call feature. 🥺🥺"
        );
      });

    // hading the Video Call Emits from server,  when p pressed
    socket.on("initiate-video-call", ({ targets }: { targets: string[] }) => {
      targets.forEach(async (targetId) => {
        await createPeerConnection(targetId, true);
      });
    });

    // Video offer
    socket.on("video-offer", async (data: any) => {
      const { sdp, sender } = data;
      await createPeerConnection(sender, false, sdp);
    });

    // Video answer
    socket.on("video-answer", async (data: any) => {
      const { sdp, sender } = data;
      const peerConnection = peerConnections.current[sender];
      if (peerConnection) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
      }
    });

    // ICE CANDIDATE

    socket.on("new-ice-candidate", async (data: any) => {
      const { candidate, sender } = data;
      const peerConnection = peerConnections.current[sender];
      if (peerConnection && candidate) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    });
    socket.on(
      "initiate-video-call",
      async ({ targets, sender }: { targets: string[]; sender: string }) => {
        if (targets.includes(socket.id)) {
          // Start the peer connection with the initiator
          await createPeerConnection(sender, false);
        }
      }
    );

    // Handle socket disconnection
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    async function initPhaser() {
      const Phaser = await import("phaser");
      const { default: GridEngine } = await import("grid-engine");
      const Preloader = await import("../scenes/Preloader");

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 950,
        height: 600,
        title: "2D VERSE",
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
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
    };
  }, [isLoaded]);

  //*  Video call Part
  const createPeerConnection = async (
    targetId: string,
    isOffer: boolean,
    remoteSdp?: RTCSessionDescriptionInit
  ) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }], // using google stun server
    });

    peerConnections.current[targetId] = pc;

    //Adding local stream to peer connection
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("new-ice-candidate", {
          target: targetId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      remoteStreams.current[targetId] = event.streams[0];
      setRemoteStreamsMap({ ...remoteStreams.current });
    };

    if (isOffer) {
      // Make Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      //sending offer part
      socketRef.current.emit("video-offer", {
        target: targetId,
        sdp: pc.localDescription,
      });
    } else {
      // Set remote description with received offer
      await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp!));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer back to caller
      socketRef.current.emit("video-answer", {
        target: targetId,
        sdp: pc.localDescription,
      });
    }
  };
  // State to trigger re-render when remote streams change
  const [remoteStreamsMap, setRemoteStreamsMap] = useState<{
    [id: string]: MediaStream;
  }>({});

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
          user: user?.username || "Anonymous",
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

  const handleCopy = () => {
    navigator.clipboard.writeText(userId);
    notify();
  };
  const notify = () =>
    toast("COPIED TO CLIPBOARD", {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
      theme: "light",
    });

  return (
    <>
      <ToastContainer />
      <div
        id="game-content"
        className="overflow-hidden flex justify-center  h-screen w-screen bg-black"
      ></div>

      <div className="video-chat-container absolute bottom-0 right-0 z-10">
        {/* Local Video */}
        {localStreamRef.current && (
          <video
            className="local-video"
            ref={(video) => {
              if (video) {
                video.srcObject = localStreamRef.current;
              }
            }}
            autoPlay
            muted // Mute self video
          ></video>
        )}

        {/* Remote Videos */}
        {Object.keys(remoteStreamsMap).map((peerId) => (
          <video
            key={peerId}
            className="remote-video"
            ref={(video) => {
              if (video) {
                video.srcObject = remoteStreamsMap[peerId];
              }
            }}
            autoPlay
          ></video>
        ))}
      </div>

      <div className="text-xl absolute backdrop-blur-sm flex flex-col max-w-[21vw]   text-white top-10 right-10 z-10">
        <h1 className="text-sm">
          <span className="font-extrabold text-lg">Room id</span>:{" "}
          <span>
            {userId}
            <MdContentCopy
              onClick={handleCopy}
              className="cursor-pointer inline mx-2 scale-110 hover:scale-[1.25]  transition-all ease-in-out duration-100"
            />
          </span>
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
              placeholder="Type something..."
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

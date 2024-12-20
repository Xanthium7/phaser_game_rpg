"use client";
import { useEffect, useState, useRef, ChangeEvent, FormEvent } from "react";
import io from "socket.io-client";
import Chat from "@/components/Chat";
import { useUser } from "@clerk/nextjs";
import { MdContentCopy } from "react-icons/md";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Game = ({ userId }: { userId: string }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { message: string; user: string; time: string }[]
  >([]);
  const socketRef = useRef<any>(null);

  //*  WEB RTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // For modal display when receiving a call
  const [showCallModal, setShowCallModal] = useState(false);
  const [callerId, setCallerId] = useState<string | null>(null);

  // For controlling audio/video
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

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

    // Handle socket disconnection
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    //* Handle WEB RTC
    socket.on("video-call-offer", ({ from }) => {
      // Show modal, let user accept
      setCallerId(from);
      setShowCallModal(true);
    });
    socket.on("video-call-offer", ({ from }) => {
      // Show modal, let user accept
      setCallerId(from);
      setShowCallModal(true);
    });

    // 4) (Optional) Listen for call-accepted
    socket.on("call-accepted", async ({ from }) => {
      // This is where the caller sets up the WebRTC offer, if you want a two-step flow
      await setupCall(true, from);
    });

    // 5) Acquire camera/mic
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
      })
      .catch((error) => {
        alert("Please allow camera and mic to use the video call feature.");
        console.error(error);
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
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
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
          user: user?.username || "Anonymous",
          time: new Date().toLocaleTimeString(),
        },
      ]);

      setMessage("");
      handleBlur();
    }
  };

  //* WEB RTC FUNCTIONS

  const setupCall = async (isCaller: boolean, targetId: string) => {
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = pc;

    // Add local stream to connection
    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }

    // ICE handling
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      socketRef.current.emit("new-ice-candidate", {
        target: targetId,
        candidate: event.candidate,
      });
    };

    // Remote stream
    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      // Force re-render or trigger state to show the remote video
      setShowCallModal(false); // hide call modal if it was open
      // ...
    };

    // Listen for ICE from other side
    socketRef.current.on("new-ice-candidate", async (data: any) => {
      if (!pc) return;
      try {
        if (data.candidate) {
          await pc.addIceCandidate(data.candidate);
        }
      } catch (err) {
        console.error("Error adding received ice candidate", err);
      }
    });

    // Offer/Answer
    if (isCaller) {
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("video-offer", { target: targetId, sdp: offer });
    } else {
      // Wait for offer, then create answer
      socketRef.current.on("video-offer", async (data: any) => {
        if (!pc.currentRemoteDescription && data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit("video-answer", {
            target: data.sender,
            sdp: answer,
          });
        }
      });
    }

    // Listen for “video-answer”
    socketRef.current.on("video-answer", async (data: any) => {
      if (pc && data.sdp && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });
  };

  const acceptCall = () => {
    if (!callerId) return;
    // Optional: let server know you accept
    socketRef.current.emit("accept-video-call", { callerId });
    // Set up call, acting as callee:
    setupCall(false, callerId);
    setShowCallModal(false);
  };

  // Decline call
  const declineCall = () => {
    setShowCallModal(false);
    setCallerId(null);
    // Optionally notify caller
  };

  // Toggle audio
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted(!isMuted);
  };

  // Toggle video
  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff(!isVideoOff);
  };

  // End call
  const endCall = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    remoteStreamRef.current = null;
    setCallerId(null);
    setShowCallModal(false);
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

      {showCallModal && callerId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p>Incoming call from {callerId}</p>
            <button onClick={acceptCall}>Accept</button>
            <button onClick={declineCall}>Decline</button>
          </div>
        </div>
      )}
      {remoteStreamRef.current && (
        <div className="modal-overlay">
          <div className="modal-content">
            {/* Remote video */}
            <video
              autoPlay
              ref={(videoElem) => {
                if (videoElem && remoteStreamRef.current) {
                  videoElem.srcObject = remoteStreamRef.current;
                }
              }}
            />
            {/* Local video */}
            <video
              autoPlay
              muted
              ref={(localVid) => {
                if (localVid && localStreamRef.current) {
                  localVid.srcObject = localStreamRef.current;
                }
              }}
            />

            <div>
              <button onClick={toggleMute}>
                {isMuted ? "Unmute" : "Mute"}
              </button>
              <button onClick={toggleVideo}>
                {isVideoOff ? "Video On" : "Video Off"}
              </button>
              <button onClick={endCall}>End Call</button>
            </div>
          </div>
        </div>
      )}

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

"use client";
import { useEffect, useState, useRef, ChangeEvent, FormEvent } from "react";
import io from "socket.io-client";
import Chat from "@/components/Chat";
import { useUser } from "@clerk/nextjs";
import { MdContentCopy } from "react-icons/md";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import YouTube, { YouTubePlayer } from "react-youtube";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AiOutlineAudioMuted } from "react-icons/ai";
import { IoVideocamOffOutline } from "react-icons/io5";
import { MdCallEnd } from "react-icons/md";
import { FaPause, FaPlay, FaStop, FaVideo } from "react-icons/fa";
import {
  TbPlayerSkipBackFilled,
  TbPlayerSkipForwardFilled,
} from "react-icons/tb";
import { FaMicrophone } from "react-icons/fa6";
import { Button } from "./ui/button";

declare global {
  interface Window {
    YT: any;
  }
}

const Game = ({ userId }: { userId: string }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { message: string; user: string; time: string }[]
  >([]);
  const socketRef = useRef<any>(null);

  //*  WEB RTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  // For modal display when receiving a call
  const [showCallModal, setShowCallModal] = useState(false);
  const [callerId, setCallerId] = useState<string | null>(null);
  const [callerName, setCallerName] = useState<string | null>(null);
  // For controlling audio/video
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  //* JUKEBOX
  const [isJukeboxModalOpen, setIsJukeboxModalOpen] = useState(false);
  const [playlistLink, setPlaylistLink] = useState("");
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSong, setCurrentSong] = useState<string>("");

  async function initLocalStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      console.log("Local stream acquired successfully");
      return stream;
    } catch (err) {
      console.error("Error accessing camera/mic:", err);
      return null;
    }
  }

  const setupCall = async (
    isCaller: boolean,
    targetId: string,
    stream: MediaStream
  ) => {
    console.log("Setting up call as", isCaller ? "caller" : "receiver");
    if (!stream) {
      console.error("No media stream provided to setupCall");
      return;
    }

    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:golbal.stun.twilio.com:3478",
          ],
        },

        {
          urls: "turn:global.relay.metered.ca:80",
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: process.env.NEXT_PUBLIC_TURN_USERNAME,
          credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
        },
      ],
      iceTransportPolicy: "all",
    });
    peerConnectionRef.current = pc;

    // Add local stream to connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // ICE handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate:", event.candidate);
        socketRef.current?.emit("new-ice-candidate", {
          target: targetId,
          candidate: event.candidate,
        });
      } else {
        console.log("ICE gathering NULL THINGY");
      }
    };

    // pc.onicegatheringstatechange = () => {
    //   console.log("ICE gathering state:", pc.iceGatheringState);
    // };

    // Part of a Bug fix
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        console.log("Connection state indicates call end. Ending call.");
        endCall();
      }
    };

    socketRef.current.on("new-ice-candidate", async (data: any) => {
      if (!pc) return;

      // This part fixes an erro where During a second call a new ICE wanst getting created
      if (pc.signalingState === "closed") {
        console.warn(
          "Attempted to add ICE candidate after connection was closed."
        );
        return;
      }
      try {
        if (data.candidate) {
          console.log("Received ICE candidate:", data.candidate);
          const candidate = new RTCIceCandidate(data.candidate);
          await pc.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error("Error adding received ice candidate", err);
      }
    });

    // Handling the incoming Stream
    const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      console.log("Received remote track", event.track);
      remoteStream.addTrack(event.track);
      console.log("Remote stream tracks:", remoteStream.getTracks());

      setRemoteStream(remoteStream);
      console.log("Remote stream INIF ", remoteStream);
    };

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

    return pc;
  };
  // for seetiing the remote video ref to video ele
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      const checkStreamActive = () => {
        if (remoteStream.active) {
          console.log(
            "Setting remote stream to video element",
            remoteStream.id
          );
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            console.log("Remote stream SRC OBJECT SET ID:", remoteStream.id);
          }
          if (remoteVideoRef.current) {
            remoteVideoRef.current
              .play()
              .catch((err) => console.log("Error playing remote stream:", err));
          }
        } else {
          console.warn("Remote stream is not active yet, retrying...");
          setTimeout(checkStreamActive, 100);
        }
      };
      checkStreamActive();
    }

    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [remoteStream]);

  useEffect(() => {
    if (!isLoaded) return;
    console.log(isSignedIn, "USER SIGNED IN");

    console.log("NAME RECIEVED IN GAME: ", user?.username);
    const socket = io(process.env.NEXT_PUBLIC_SERVER_URL!, {
      query: { roomId: userId, playername: user?.username || "nice name" },
      // path: "/clients/socketio/hubs/Hub",
    });
    socketRef.current = socket;

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

    socket.on("video-call-offer", ({ from, name }: any) => {
      setCallerId(from);
      setCallerName(name);
      setShowCallModal(true);
    });

    socketRef.current.on("newPlayer", (playerData: any) => {
      const playerName = playerData.name || "A new player";
      toast.info(`${playerName} has joined the game!`, {
        position: "top-right",
        autoClose: 3000,
      });
    });

    // Listen for playerDisconnected event
    socketRef.current.on("playerDisconnected", () => {
      toast.warn(`A player has left the game.`, {
        position: "top-right",
        autoClose: 3000,
      });
    });

    socket.on("call-accepted", async ({ from }: any) => {
      try {
        let stream = localStream;
        if (!stream) {
          console.log("Getting new stream for call setup");
          stream = await initLocalStream();
          if (!stream) {
            throw new Error("Could not acquire local stream");
          }
        }
        await setupCall(true, from, stream);
      } catch (err) {
        console.error("Error in call-accepted:", err);
        endCall();
      }
    });

    //* some weird bug casuing video usage in client 2 side
    // socketRef.current.on("end-call", () => {
    //   endCall();
    //   toast("Call ended by the other user.", {
    //     position: "bottom-right",
    //     autoClose: 3000,
    //     hideProgressBar: true,
    //     closeOnClick: true,
    //     pauseOnHover: false,
    //     draggable: true,
    //     theme: "light",
    //   });
    // });

    //* HANDLE JUKEBOX
    socket.on("showJukeboxModal", () => {
      setIsJukeboxModalOpen(true);
    });

    socket.on("playPlaylist", ({ playlistLink }: any) => {
      console.log("Received playPlaylist event with link:", playlistLink);
      // console.log("Type of playlistLink:", typeof playlistLink);
      // if (typeof playlistLink !== "string") {
      //   console.error("Invalid playlistLink type:", typeof playlistLink);
      //   return;
      // }
      setPlaylistLink(playlistLink);
      if (playerRef.current) {
        const playlistId = extractYouTubePlaylistID(playlistLink);
        if (playlistId) {
          console.log("Loading playlist with ID:", playlistId);
          playerRef.current.loadPlaylist({
            list: playlistId,
            listType: "playlist",
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              modestbranding: 1,
              origin: window.location.origin,
              rel: 0,
            },
          });
          // Explicitly play after loading
          playerRef.current.playVideo();
          console.log("Triggered playVideo on the player.");
        } else {
          console.error("Invalid playlist ID extracted.");
        }
      } else {
        console.error("YouTube player is not ready.");
      }
    });
    socket.on("pausePlaylist", () => {
      console.log("Pause music");
      playerRef.current?.pauseVideo();
      setIsPaused(true);
    });

    socket.on("resumePlaylist", () => {
      console.log("Received resumePlaylist event");
      playerRef.current?.playVideo();
      setIsPaused(false);
    });

    socket.on("skipSong", () => {
      playerRef.current?.nextVideo();
      console.log("Skipped to the next video.");
    });

    socket.on("prevSong", () => {
      playerRef.current?.previousVideo();
    });
    socket.on("stopPlaylist", () => {
      playerRef.current?.stopVideo();
      setPlaylistLink("");
      console.log("Stopped the YouTube player.");
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
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
      }
      setLocalStream(null);
      setRemoteStream(null);
    };
  }, [isLoaded]);
  const updateMessage = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (socketRef.current && trimmedMessage !== "") {
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

  //* JUKEBOX

  const extractYouTubePlaylistID = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get("list");
    } catch (error) {
      console.error("Invalid YouTube URL:", error);
      return null;
    }
  };

  const handlePlaylistSubmit = () => {
    const playlistId = extractYouTubePlaylistID(playlistLink);
    if (!playlistId) {
      toast.error("Please enter a valid YouTube playlist link");
      return;
    }
    console.log("Playlist ID:", playlistId);
    socketRef.current.emit("playPlaylist", { playlistLink });
    setIsJukeboxModalOpen(false);
    setPlaylistLink("");
  };

  const onYouTubeReady = (event: any) => {
    playerRef.current = event.target;
    playerRef.current.addEventListener("onStateChange", onPlayerStateChange);
  };

  // Add a handler for YouTube player state changes
  const onPlayerStateChange = (event: any) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      const videoData = playerRef.current.getVideoData();
      setCurrentSong(videoData.title);
    }
  };

  //* WEB RTC FUNCTIONS

  const acceptCall = async () => {
    if (!callerId) return;

    try {
      let stream = localStream;
      if (!stream) {
        console.log("Getting new stream for accepting call");
        stream = await initLocalStream();
        if (!stream) {
          return;
        }
      }
      await setupCall(false, callerId, stream); // as reciever
      socketRef.current?.emit("accept-video-call", { callerId });
      setShowCallModal(false);
    } catch (err) {
      console.error("Error accepting call:", err);
      endCall();
    }
  };

  // Decline call
  const declineCall = () => {
    setShowCallModal(false);
    setCallerId(null);
    // Optionally notify caller
  };

  // Toggle audio
  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted(!isMuted);
  };

  // Toggle video
  const toggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff(!isVideoOff);
  };

  // End call
  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicegatheringstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setRemoteStream(null);
    setShowCallModal(false);
    setCallerId(null);
    socketRef.current?.emit("end-call", { targetId: callerId });
  };
  //* FIXING SPACE-KEY OF ROOM CHAT INTERFIREING WITH SPACE-KEY OF GAME CONTROL
  const [isInputFocused, setIsInputFocused] = useState(false);
  console.log(isInputFocused);

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
      <AlertDialog
        open={showCallModal && !!callerId} // callerId is converted to its boolean equivalent
        onOpenChange={setShowCallModal}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incoming Call</AlertDialogTitle>
            <AlertDialogDescription>
              You have an incoming call from{" "}
              <span className="font-bold">{callerName}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="text-[#b63434] border-[#b63434] hover:bg-[#b63434] hover:text-white"
              onClick={declineCall}
            >
              Decline
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-500 hover:bg-green-700 "
              onClick={() => {
                acceptCall();
                setShowCallModal(false);
              }}
            >
              Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/*  JUKE BOX UI */}
      <AlertDialog
        open={isJukeboxModalOpen} // callerId is converted to its boolean equivalent
        onOpenChange={setIsJukeboxModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set a Tune 🎵</AlertDialogTitle>
            <AlertDialogDescription>
              <input
                type="text"
                placeholder="Paste YouTube Playlist Link"
                className="w-full p-2 border border-gray-300 rounded mb-4"
                value={playlistLink}
                onChange={(e) => setPlaylistLink(e.target.value)}
              />
              {currentSong && (
                <div className="mt-2 text-center">
                  <strong>Now Playing:</strong> {currentSong}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="text-[#252525] border-[#252525] hover:bg-[#252525] hover:text-white"
              onClick={() => setIsJukeboxModalOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="" onClick={handlePlaylistSubmit}>
              Play
            </AlertDialogAction>
          </AlertDialogFooter>
          {playlistLink && (
            <div className="flex justify-center space-x-4">
              {isPaused ? (
                <Button
                  onClick={() => socketRef.current.emit("resumePlaylist")}
                >
                  <FaPlay />
                </Button>
              ) : (
                <Button onClick={() => socketRef.current.emit("pausePlaylist")}>
                  <FaPause />
                </Button>
              )}
              <Button onClick={() => socketRef.current.emit("prevSong")}>
                <TbPlayerSkipBackFilled />
              </Button>
              <Button onClick={() => socketRef.current.emit("skipSong")}>
                <TbPlayerSkipForwardFilled />
              </Button>
              <Button onClick={() => socketRef.current.emit("stopPlaylist")}>
                <FaStop />
              </Button>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
      {/* Hidden YouTube Player for Audio-Only Playback */}
      <YouTube
        videoId="" // Will load the playlist via player.loadPlaylist
        opts={{
          height: "0",
          width: "0",
          playerVars: {
            listType: "playlist",
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
          },
        }}
        onReady={onYouTubeReady}
        onStateChange={(event: any) => {
          console.log("YouTube Player State:", event.data);
        }}
      />
      {remoteStream && (
        <div className="modal-overlay absolute top-0 left-0 w-full h-full bg-gray-600 bg-opacity-75 flex items-center justify-center z-30">
          <div className="modal-content rounded-xl bg-white p-4  shadow-lg flex flex-col items-center">
            {/* Remote video */}
            <video
              className="remote-video rounded-xl border w-full max-h-[300px] object-cover mb-4"
              autoPlay
              playsInline
              ref={remoteVideoRef}
            />
            {/* Local video indeed */}
            <video
              className="w-full rounded-xl max-h-[300px] object-cover mb-4"
              autoPlay
              muted
              playsInline
              ref={(localVid) => {
                if (localVid && localStream) {
                  localVid.srcObject = localStream;
                }
              }}
            />

            <div className="controls flex justify-center gap-4">
              <div
                className={`px-4 py-2 rounded  cursor-pointer hover:opacity-75  ${
                  isMuted ? "bg-red-500" : "bg-green-500"
                }`}
                onClick={toggleMute}
              >
                {isMuted ? (
                  <AiOutlineAudioMuted className="text-white" />
                ) : (
                  <FaMicrophone className="text-white" />
                )}
              </div>
              <div
                className={`px-4 py-2 rounded  cursor-pointer hover:opacity-75  ${
                  isVideoOff ? "bg-red-500" : "bg-green-500"
                }`}
                onClick={toggleVideo}
              >
                {isVideoOff ? (
                  <IoVideocamOffOutline className="text-white" />
                ) : (
                  <FaVideo className="text-white" />
                )}
              </div>
              <div
                className="bg-red-500 px-4 py-2 rounded cursor-pointer hover:opacity-75  "
                onClick={endCall}
              >
                <MdCallEnd className="text-white" />
              </div>
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

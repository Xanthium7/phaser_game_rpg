import { Server, Socket } from "socket.io";

export default function roomChat(io: Server, socket: Socket) {
  const { roomId, playername } = socket.handshake.query as {
    roomId: string;
    playername?: string;
  };
  socket.on("chatMessage", (messageData: { message: string }) => {
    console.log(`Message from ${playername}: ${messageData.message}`);
    socket.to(roomId).emit("chatMessage", {
      playername,
      message: messageData.message,
      time: new Date().toLocaleTimeString(),
    });
  });
}

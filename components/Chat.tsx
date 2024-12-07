import React from "react";

const Chat = ({
  message,
  user,
  time,
}: {
  message: string;
  user: string;
  time: string;
}) => {
  return (
    <div className="flex gap-2 bg-[#5a5a5a57] px-2 border-[1px] items-center w-full">
      <span className="font-extrabold text-sm">{user}: </span>
      <span className="font-extralight break-words text-xs">{message}</span>
      <span className="text-xs ml-auto flex-shrink-0">{time}</span>
    </div>
  );
};

export default Chat;

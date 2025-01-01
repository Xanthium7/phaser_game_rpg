"use client";
import React, { useEffect, useState } from "react";
// import io from "socket.io-client";
import { ToastContainer, toast } from "react-toastify";
import TicTacToeBoard from "./TicTacToeBoard";
// import "react-toastify/dist/ReactToastify.css";

const TicTacToeModal = ({
  socket,
  roomId,
  playername,
  onClose,
}: {
  socket: any;
  roomId: string;
  playername: string;
  onClose: () => void;
}) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    socket.on("gameStart", (data: any) => {
      setSymbol(data.symbol);
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
      setGameStarted(true);
      toast.info(`Game started! You are '${data.symbol}'`);
    });
    socket.on("gameUpdate", (data: any) => {
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
      setWinner(data.winner);
      if (data.winner) {
        const winnerName = data.winner === socket.id ? "You" : "Opponent";
        toast.success(`${winnerName} won the game!`);
        setGameStarted(false);
      }
    });
    socket.on("gameReset", (data: any) => {
      setBoard(data.board);
      setWinner(null);
      setGameStarted(false);
      toast.info("Game has been reset.");
    });
    socket.on("invalidMove", (message: string) => {
      toast.error(message);
    });

    // Listen for gameFull
    socket.on("gameFull", () => {
      toast.error("Game room is full.");
      onClose();
    });
    return () => {
      socket.disconnect();
    };
  }, [roomId, playername, onClose]);

  const handleCellClick = (index: number) => {
    if (!gameStarted) {
      toast.warn("Game has not started yet.");
      return;
    }
    if (currentTurn !== socket.id) {
      toast.warn("It's not your turn.");
      return;
    }
    if (board[index]) {
      toast.warn("Cell already occupied.");
      return;
    }

    socket.emit("makeMove", index);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded shadow-lg">
        <h2 className="text-2xl mb-4">Tic-Tac-Toe</h2>
        {gameStarted ? (
          <>
            <p className="mb-2">
              You are '{symbol}'.{" "}
              {currentTurn === socket.id ? "Your" : "Opponent's"} Turn
            </p>
            <TicTacToeBoard
              board={board}
              onCellClick={handleCellClick}
              disable={winner !== null}
            />
            {winner && (
              <p className="mt-4 text-lg">
                {winner === socket.id ? "You won!" : "Opponent won!"}
              </p>
            )}
          </>
        ) : (
          <p className="mb-4">Waiting for another player to join...</p>
        )}
        <button
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          onClick={onClose}
        >
          Close
        </button>
        <ToastContainer />
      </div>
    </div>
  );
};

export default TicTacToeModal;

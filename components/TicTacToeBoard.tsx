"use client";
import React from "react";

interface Props {
  board: (string | null)[];
  onCellClick: (index: number) => void;
  disable: boolean;
}

const TicTacToeBoard = ({ board, onCellClick, disable }: Props) => {
  const renderCell = (index: number) => {
    return (
      <button
        className="w-20 h-20 border border-gray-400 text-2xl"
        onClick={() => onCellClick(index)}
        disabled={!!board[index] || disable}
      >
        {board[index]}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-1">
      {board.map((cell, index) => (
        <div key={index}>{renderCell(index)}</div>
      ))}
    </div>
  );
};

export default TicTacToeBoard;

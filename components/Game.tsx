"use client";
import Phaser from "phaser";
import { GridEngine, GridEngineHeadless } from "grid-engine";
import { useEffect } from "react";

const Game = () => {
  useEffect(() => {
    async function initPhaser() {
      const Phaser = await import("phaser");
      const { default: GridEngine } = await import("grid-engine");
      const Preloader = await import("../scenes/Preloader");
      //   const TestScene = await import("./scenes/TestScene");

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        title: "cool-title",
        parent: "game-content",
        pixelArt: true,
        backgroundColor: "#612e1e",
        scale: {
          zoom: 2,
        },
        scene: [Preloader.default],
        physics: {
          default: "arcade",
          arcade: {
            debug: true,
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
      return () => {
        game.destroy(true);
      };
    }

    initPhaser();
  }, []);
  return <div id="game-content" className="overflow-hidden"></div>;
};

export default Game;

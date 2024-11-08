import Phaser, { Scene } from "phaser";
import { GridEngine, Direction } from "grid-engine";

export default class Preloader extends Scene {
  private socket!: SocketIOClient.Socket;
  private players: { [id: string]: { sprite: Phaser.GameObjects.Sprite } } = {};
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super("Preloader");
  }

  preload() {
    // Load assets
    this.load.tilemapTiledJSON("map", "assets/map.json");
    this.load.image("tileset", "assets/Overworld.png");
    this.load.spritesheet("hero", "assets/character.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
  }

  create(data: { socket: SocketIOClient.Socket }) {
    // **Initialize Socket.IO**
    this.socket = data.socket;

    // **Create the Tilemap and Layers**
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("Overworld", "tileset");
    const groundLayer = map.createLayer("ground", tileset!, 0, 0);
    const fenceLayer = map.createLayer("fence", tileset!, 0, 0);

    // **Initialize GridEngine without Characters**
    const gridEngineConfig = {
      characters: [],
    };
    this.gridEngine.create(map, gridEngineConfig);

    // **Set Up Cursor Input**
    this.cursors = this.input.keyboard.createCursorKeys();

    // **Handle Socket.IO Events**

    // **1. Receive Current Players**
    this.socket.on("currentPlayers", (players: any) => {
      Object.keys(players).forEach((id) => {
        if (id === this.socket.id) {
          // Add the current player
          this.addPlayer(players[id], true);
        } else {
          // Add other players
          this.addPlayer(players[id], false);
        }
      });
    });

    // **2. New Player Joined**
    this.socket.on("newPlayer", (playerInfo: any) => {
      this.addPlayer(playerInfo, false);
    });

    // **3. Player Moved**
    this.socket.on("playerMoved", (playerInfo: any) => {
      const player = this.players[playerInfo.id];
      if (player) {
        // Update the player's position using GridEngine
        this.gridEngine.setPosition(playerInfo.id, {
          x: playerInfo.x,
          y: playerInfo.y,
        });
      }
    });

    // **4. Player Disconnected**
    this.socket.on("playerDisconnected", (playerId: string) => {
      if (this.players[playerId]) {
        // Remove the player's sprite and character
        this.players[playerId].sprite.destroy();
        this.gridEngine.removeCharacter(playerId);
        delete this.players[playerId];
      }
    });
  }

  update() {
    const playerId = this.socket.id;

    // Check if the player's character exists
    if (!this.gridEngine.hasCharacter(playerId)) return;

    // Handle input and movement
    if (!this.gridEngine.isMoving(playerId)) {
      if (this.cursors.left.isDown) {
        this.gridEngine.move(playerId, Direction.LEFT);
      } else if (this.cursors.right.isDown) {
        this.gridEngine.move(playerId, Direction.RIGHT);
      } else if (this.cursors.up.isDown) {
        this.gridEngine.move(playerId, Direction.UP);
      } else if (this.cursors.down.isDown) {
        this.gridEngine.move(playerId, Direction.DOWN);
      }
    }

    // **Emit Movement Data**
    const position = this.gridEngine.getPosition(playerId);
    this.socket.emit("playerMovement", {
      x: position.x,
      y: position.y,
    });
  }

  private addPlayer(playerInfo: any, isCurrentPlayer: boolean) {
    // **Create the Player's Sprite**
    const sprite = this.add.sprite(0, 0, "hero");

    // **Store the Player**
    this.players[playerInfo.id] = { sprite };

    // **Add the Player to GridEngine**
    this.gridEngine.addCharacter({
      id: playerInfo.id,
      sprite: sprite,
      startPosition: { x: playerInfo.x, y: playerInfo.y },
    });

    // **Camera Follow for Current Player**
    if (isCurrentPlayer) {
      this.cameras.main.startFollow(sprite, true);
      this.cameras.main.setFollowOffset(-sprite.width, -sprite.height);
    }
  }
}
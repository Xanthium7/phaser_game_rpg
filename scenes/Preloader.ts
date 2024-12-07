import { GridEngine, Direction } from "grid-engine";
import Phaser, { Scene } from "phaser";

export default class Preloader extends Scene {
  private gridEngine!: GridEngine;
  private socket!: SocketIOClient.Socket;

  private players: { [id: string]: Phaser.GameObjects.Sprite } = {};
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private nameTexts: { [id: string]: Phaser.GameObjects.Text } = {};
  private characterGridWidths: { [id: string]: number } = {};

  constructor() {
    super("Preloader");
  }

  init(data: { socket: SocketIOClient.Socket }) {
    this.socket = data.socket;

    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  preload() {
    // const character_grid_width = 136 * Math.floor(Math.random() * 10);

    this.load.tilemapTiledJSON("map", "/assets/map.json");
    this.load.image("tileset", "/assets/Overworld.png");
    this.load.spritesheet("hero", "/assets/character.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
  }
  create() {
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("Overworld", "tileset");
    const groundLayer = map.createLayer("ground", tileset!, 0, 0);
    const fenceLayer = map.createLayer("fence", tileset!, 0, 0);

    // Set the starting position
    const startPosition = { x: 25, y: 20 };

    // Create grid engine
    this.gridEngine.create(map, {
      characters: [
        {
          id: this.socket.id,
          sprite: this.players[this.socket.id],
          // speed: 1000,
          startPosition: startPosition,
        },
      ],
    });

    // Set up movement event listeners
    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      const sprite = this.players[charId];
      if (sprite) {
        sprite.anims.play(`${charId}_${direction}`);
      }
    });

    this.gridEngine.movementStopped().subscribe(({ charId, direction }) => {
      const sprite = this.players[charId];
      if (sprite) {
        sprite.anims.stop();
        const characterGridWidth = this.characterGridWidths[charId];
        sprite.setFrame(this.getStopFrame(direction, characterGridWidth));
      }
    });

    this.gridEngine.directionChanged().subscribe(({ charId, direction }) => {
      const sprite = this.players[charId];
      if (sprite) {
        const characterGridWidth = this.characterGridWidths[charId];
        sprite.setFrame(this.getStopFrame(direction, characterGridWidth));
      }
    });

    // this.addPlayer({ id: this.socket.id, x: startPosition.x, y: startPosition.y }, true);
    this.socket.emit("playerMovement", {
      id: this.socket.id,
      x: startPosition.x,
      y: startPosition.y,
    });

    // Handle keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    // Request the current players from the server
    this.socket.emit("getCurrentPlayers");
    // Setup multiplayer events
    this.setupMultiplayerEvents();

    // Handle player movement
    this.gridEngine.movementStopped().subscribe(({ charId }) => {
      if (charId === this.socket.id) {
        const newPosition = this.gridEngine.getPosition(charId);
        console.log(
          `Player moved to position: x=${newPosition.x}, y=${newPosition.y}`
        );
        this.socket.emit("playerMovement", {
          id: charId,
          x: newPosition.x,
          y: newPosition.y,
          // name: this.players[charId].getData('name'),
          // name: "NAMEE"
        });
      }
    });
  }

  // ANIAMTION LOGIC
  private createPlayerAnimation(
    name: string,
    startFrame: number,
    endFrame: number
  ) {
    this.anims.create({
      key: name,
      frames: this.anims.generateFrameNumbers("hero", {
        start: startFrame,
        end: endFrame,
      }),
      frameRate: 16,
      repeat: -1,
      yoyo: true,
    });
  }
  private getStopFrame(direction: string, characterGridWidth: number): number {
    switch (direction) {
      case "up":
        return 34 + characterGridWidth;
      case "right":
        return 17 + characterGridWidth;
      case "down":
        return 0 + characterGridWidth;
      case "left":
        return 51 + characterGridWidth;
      default:
        return 0 + characterGridWidth;
    }
  }

  private setupMultiplayerEvents() {
    // Handle new player joining
    this.socket.on("newPlayer", (playerInfo: any) => {
      console.log(`New player connected: ${playerInfo.id}`);
      this.addPlayer(playerInfo, false);
    });

    // Handle current players already in the game
    this.socket.on("currentPlayers", (players: any) => {
      console.log("Received currentPlayers:", players);
      Object.keys(players).forEach((id) => {
        const playerInfo = players[id];
        console.log(`Processing player ID: ${id}`);
        if (id === this.socket.id) {
          console.log("Adding current player");
          this.addPlayer(playerInfo, id === this.socket.id);
          // Current player already added
        } else {
          console.log("Adding other player");
          this.addPlayer(playerInfo, id === this.socket.id);
        }
      });
    });

    // Handle player movement
    this.socket.on("playerMoved", (playerInfo: any) => {
      if (playerInfo.id !== this.socket.id) {
        const player = this.players[playerInfo.id];
        if (player && this.gridEngine.hasCharacter(playerInfo.id)) {
          this.gridEngine.moveTo(playerInfo.id, {
            x: playerInfo.x,
            y: playerInfo.y,
          });
        }
      }
    });

    // Handle player disconnect
    this.socket.on("playerDisconnected", (id: string) => {
      console.log(`Player disconnected: ${id}`);
      if (this.players[id]) {
        this.gridEngine.removeCharacter(id);
        this.players[id].destroy();
        delete this.players[id];
      }
      if (this.nameTexts[id]) {
        this.nameTexts[id].destroy();
        delete this.nameTexts[id];
      }
    });
  }

  private addPlayer(playerInfo: any, isCurrentPlayer: boolean) {
    const x = playerInfo.x * 16;
    const y = playerInfo.y * 16;

    const hash = playerInfo.id
      .split("")
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const characterGridWidth = 136 * (hash % 10);
    this.characterGridWidths[playerInfo.id] = characterGridWidth;

    const sprite = this.add.sprite(x, y, "hero", characterGridWidth);

    // Create animations
    this.createPlayerAnimation(
      `${playerInfo.id}_down`,
      0 + characterGridWidth,
      3 + characterGridWidth
    );
    this.createPlayerAnimation(
      `${playerInfo.id}_right`,
      17 + characterGridWidth,
      20 + characterGridWidth
    );
    this.createPlayerAnimation(
      `${playerInfo.id}_up`,
      34 + characterGridWidth,
      37 + characterGridWidth
    );
    this.createPlayerAnimation(
      `${playerInfo.id}_left`,
      51 + characterGridWidth,
      54 + characterGridWidth
    );

    this.players[playerInfo.id] = sprite;

    const playerName = playerInfo.name || "Chigga";

    //These values odnt matter cause we set it in the update function
    const nameText = this.add
      .text(0, 0, playerName, {
        fontSize: "8px",
        fontStyle: "bold",
        color: "#ffffff",
        fontFamily: "monaco, monospace",
        resolution: 1,
      })
      .setOrigin(0.5, 1);
    this.nameTexts[playerInfo.id] = nameText;

    this.gridEngine.addCharacter({
      id: playerInfo.id,
      sprite: sprite,
      startPosition: { x: playerInfo.x, y: playerInfo.y },
    });
    if (isCurrentPlayer) {
      this.cameras.main.startFollow(sprite, true);
      this.cameras.main.setFollowOffset(-sprite.width, -sprite.height);
    }
  }
  //   const COLORS = ["BLUE", "WHITE", "BLACK", "BASIC", "PINK", "BROWN", "VIOLET", "YELLOW", "GREEN", "CYAN"];

  update() {
    const playerId = this.socket.id;

    // Update Player Name positions
    Object.keys(this.players).forEach((id) => {
      const sprite = this.players[id];
      const nameText = this.nameTexts[id];
      if (sprite && nameText) {
        nameText.setPosition(sprite.x + sprite.width / 2, sprite.y);
      }
    });

    if (!this.gridEngine.hasCharacter(playerId)) {
      console.log(`Character with ID ${playerId} does not exist in GridEngine`);
      return;
    }

    if (!this.gridEngine.isMoving(playerId)) {
      let moved = false;

      if (this.cursors.left.isDown) {
        console.log("Left key is down");
        this.gridEngine.move(playerId, Direction.LEFT);
        moved = true;
      } else if (this.cursors.right.isDown) {
        console.log("Right key is down");
        this.gridEngine.move(playerId, Direction.RIGHT);
        moved = true;
      } else if (this.cursors.up.isDown) {
        console.log("Up key is down");
        this.gridEngine.move(playerId, Direction.UP);
        moved = true;
      } else if (this.cursors.down.isDown) {
        console.log("Down key is down");
        this.gridEngine.move(playerId, Direction.DOWN);
        moved = true;
      } else if (this.cursors.space.isDown) {
        alert("down");
      } else {
      }

      // Listen for movement completion
      // if(moved){

      // }
    }
  }
}

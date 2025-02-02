import { GridEngine, Direction } from "grid-engine";
import * as Phaser from "phaser";
import { Scene } from "phaser";
import DialogueBox from "./DialogueBox";
import {
  Ai_response_log,
  getNpcAction,
  update_Groot_memory,
} from "@/actions/actions";
// import { Ai_response } from "@/actions/actions";

// to prevent chat controls from messing with game controls
declare global {
  interface Window {
    isChatFocused: boolean;
  }
}

// Define a global dictionary of places
const globalPlaces: { [key: string]: { x: number; y: number } } = {
  CHILLMART: { x: 124, y: 50 },
  DROOPYVILLE: { x: 168, y: 32 },
  LIBRARY: { x: 46, y: 58 },
  MART: { x: 118, y: 50 },
  PARK: { x: 118, y: 50 },
  // Add more places as needed
};

export default class Preloader extends Scene {
  private gridEngine!: GridEngine;
  private socket!: SocketIOClient.Socket;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private name!: string;
  private players: { [id: string]: Phaser.GameObjects.Sprite } = {};
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private nameTexts: { [id: string]: Phaser.GameObjects.Text } = {};
  private characterGridWidths: { [id: string]: number } = {};
  private dialogueBox!: DialogueBox;
  private npcIsInteracting: boolean = false;
  private npcDecisionInterval!: Phaser.Time.TimerEvent;
  private currentNpcAction: string | null = null; // Track current NPC action

  constructor() {
    super("Preloader");
  }

  init(data: { socket: SocketIOClient.Socket }) {
    this.socket = data.socket;
    this.shiftKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT
    );
    this.input.keyboard!.addCapture([Phaser.Input.Keyboard.KeyCodes.SHIFT]);
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  preload() {
    // const character_grid_width = 136 * Math.floor(Math.random() * 10);

    this.load.tilemapTiledJSON("map", "/assets/map1.json");
    this.load.image("tileset", "/assets/Overworld1.png");
    this.load.spritesheet("hero", "/assets/character.png", {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.load.spritesheet("npc_log", "/assets/log.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
  }
  create() {
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("Overworld", "tileset");
    const groundLayer = map.createLayer("ground", tileset!, 0, 0);
    const fenceLayer = map.createLayer("colliding", tileset!, 0, 0);
    const vaseLayer = map.createLayer("vases", tileset!, 0, 0);

    this.input.keyboard?.removeCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);

    //* Video call trigger
    this.input.keyboard!.on("keydown-F4", () => {
      this.handleVideoCall();
    });

    // Set the starting position
    const startPosition = { x: 130, y: 80 };

    this.dialogueBox = new DialogueBox(this, 50, 330, 850, 145);
    this.add.existing(this.dialogueBox);
    this.dialogueBox.show("Welcome to your new world!");

    // Create grid engine
    this.gridEngine.create(map, {
      characters: [
        {
          id: this.socket.id,
          sprite: this.players[this.socket.id],
          // speed: 1000,
          speed: 4,
          startPosition: startPosition,
        },
      ],
    });

    // Walk aimation for NPC
    this.anims.create({
      key: "npc_walk_down",
      frames: this.anims.generateFrameNumbers("npc_log", { start: 0, end: 3 }),
      frameRate: 16,
      repeat: -1,
    });

    this.anims.create({
      key: "npc_walk_left",
      frames: this.anims.generateFrameNumbers("npc_log", {
        start: 18,
        end: 21,
      }),
      frameRate: 16,
      repeat: -1,
    });

    this.anims.create({
      key: "npc_walk_right",
      frames: this.anims.generateFrameNumbers("npc_log", {
        start: 12,
        end: 15,
      }),
      frameRate: 16,
      repeat: -1,
    });

    this.anims.create({
      key: "npc_walk_up",
      frames: this.anims.generateFrameNumbers("npc_log", {
        start: 6,
        end: 9,
      }),
      frameRate: 16,
      repeat: -1,
    });

    this.addNPCLog();

    // Initialize AI-controlled NPC actions
    this.initializeNpcAgent();

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

    // Handle keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();

    this.socket.emit("getCurrentPlayers");
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
          speed: 4,
        });
      }
    });
  }

  private lastDirection: string = "down";

  private addNPCLog(): void {
    const startGridPosition = { x: 147, y: 70 }; // Grid coordinates
    const npcLog = this.add.sprite(0, 0, "npc_log");

    this.gridEngine.addCharacter({
      id: "npc_log",
      sprite: npcLog,
      startPosition: startGridPosition,
      speed: 4,
    });

    // Initialize NPC facing down
    // npcLog.play("npc_walk_down");

    // Listen to GridEngine movement events
    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      if (charId === "npc_log") {
        this.lastDirection = direction;
        npcLog.play(`npc_walk_${direction}`);
      }
    });
    this.gridEngine.movementStopped().subscribe(async ({ charId }) => {
      if (charId === "npc_log") {
        npcLog.anims.stop();
        // Set frame based on last direction
        switch (this.lastDirection) {
          case "up":
            npcLog.setFrame(6);
            break;
          case "down":
            npcLog.setFrame(0);
            break;
          case "left":
            npcLog.setFrame(13);
            break;
          case "right":
            npcLog.setFrame(8);
            break;
        }

        this.npcDecisionInterval.paused = false;
      }
    });

    // Remove manual movement logic
    // this.time.addEvent({
    //   delay: 3000,
    //   callback: () => {
    //     // ...existing random movement code...
    //   },
    //   loop: true,
    // });
  }

  // Initialize the agentic system for the NPC
  private initializeNpcAgent(): void {
    this.npcDecisionInterval = this.time.addEvent({
      delay: 1000, // Decide every 1 second (adjustable)
      callback: this.decideNpcAction,
      callbackScope: this,
      loop: true,
    });
  }

  // Function to decide NPC's next action
  private async decideNpcAction(): Promise<void> {
    const npcName = "npc_log";
    console.log(`Deciding action for ${npcName}`);

    try {
      // Pause decision loop for duration of the current action
      this.npcDecisionInterval.paused = true;

      const action = await getNpcAction(this.name);
      console.log(`Action received for ${npcName}: ${action}`);

      if (globalPlaces[action]) {
        // Action is to move to a defined location
        this.currentNpcAction = action;
        const targetPosition = globalPlaces[action];
        console.log(
          `Moving ${npcName} to (${targetPosition.x}, ${targetPosition.y})`
        );

        // Update memory before action

        this.gridEngine.moveTo(npcName, {
          x: targetPosition.x,
          y: targetPosition.y,
        });
        // For debugginf purposes
        this.dialogueBox.show(
          `NPC is moving to ${action} at (${targetPosition.x}, ${targetPosition.y})`
        );
        this.npcDecisionInterval.paused = false;
        await update_Groot_memory(
          `\n*Groot has went  to ${action}*\n`,
          this.name
        );
      } else if (action === "IDLE") {
        this.dialogueBox.show(`NPC is idle.`);
        // Resume the decision timer if action is IDLE
        this.npcDecisionInterval.paused = false;
        await update_Groot_memory(`\n*Groot stayed idle*\n`, this.name);
      } else if (action === "WANDER") {
        this.dialogueBox.show(`NPC is wandering.`);
        this.gridEngine.moveRandomly("npc_log", 500);

        await update_Groot_memory(
          `\n*Groot wandered around that place*\n`,
          this.name
        );
        this.npcDecisionInterval.paused = false;
      } else if (action === "PLAYER") {
        this.dialogueBox.show(`NPC is coming to the ${this.name}.`);
        const playerPosition = this.gridEngine.getPosition(this.socket.id);
        this.gridEngine.moveTo(npcName, {
          x: playerPosition.x,
          y: playerPosition.y,
        });
        this.npcDecisionInterval.paused = false;
        await update_Groot_memory(
          `\n*Groot came to the ${this.name}*\n`,
          this.name
        );
      } else {
        this.dialogueBox.show(`NPC received an unknown action: ${action}.`);
        console.warn(`Unknown action received for NPC: ${action}`);
        // Resume the decision timer if action is unknown
        this.npcDecisionInterval.paused = false;
      }
      // Reset current action (or it can be reset in movementStopped event)
      this.currentNpcAction = null;
    } catch (error) {
      console.error(`Error in decideNpcAction for ${npcName}:`, error);
      this.dialogueBox.show(
        "NPC encountered an error while deciding its action."
      );
    } finally {
      // Always resume decision loop after finishing the action
      this.npcDecisionInterval.paused = false;
    }
  }

  private handleVideoCall(): void {
    const currentPlayerId = this.socket.id;
    const facingDirection = this.gridEngine.getFacingDirection(currentPlayerId);
    const currentPosition = this.gridEngine.getPosition(currentPlayerId);

    const targetPosition = { ...currentPosition }; // Copy the current position
    switch (facingDirection) {
      case "up":
        targetPosition.y -= 1;
        break;
      case "down":
        targetPosition.y += 1;
        break;
      case "left":
        targetPosition.x -= 1;
        break;
      case "right":
        targetPosition.x += 1;
        break;
    }

    // Check if another player occupies that tile
    const playersInFront = Object.keys(this.players).filter((id) => {
      if (id === currentPlayerId) return false;
      const pos = this.gridEngine.getPosition(id);
      return pos.x === targetPosition.x && pos.y === targetPosition.y;
    });

    if (playersInFront.length > 0) {
      const targetPlayerId = playersInFront[0]; // Single player
      this.socket.emit("initiate-video-call", { targetId: targetPlayerId });
    } else {
      this.dialogueBox.show("No player is in front of you.");
    }
  }
  private lastInteractionTime: number = 0;
  private interactionCooldown: number = 500; // 500ms cooldown

  private handleInteractivity(): void {
    const currentTime = Date.now();
    if (currentTime - this.lastInteractionTime < this.interactionCooldown) {
      return; // Prevent spamming
    }
    this.lastInteractionTime = currentTime;

    const currentPlayerId = this.socket.id;
    const facingDirection = this.gridEngine.getFacingDirection(currentPlayerId);
    const currentPosition = this.gridEngine.getPosition(currentPlayerId);

    const targetPosition = { ...currentPosition }; // Copy the current position
    switch (facingDirection) {
      case "up":
        targetPosition.y -= 1;
        break;
      case "down":
        targetPosition.y += 1;
        break;
      case "left":
        targetPosition.x -= 1;
        break;
      case "right":
        targetPosition.x += 1;
        break;
    }

    // this.dialogueBox.show(
    //   `You interacted at position X:${targetPosition.x}, Y:${targetPosition.y}`
    // );
    if (
      (targetPosition.x === 82 && targetPosition.y === 89) ||
      (targetPosition.x === 81 && targetPosition.y === 89) ||
      (targetPosition.x === 81 && targetPosition.y === 88) ||
      (targetPosition.x === 82 && targetPosition.y === 88)
    ) {
      this.showJukeBoxModal();
    }
    if (
      (targetPosition.x === 21 && targetPosition.y === 107) ||
      (targetPosition.x === 22 && targetPosition.y === 106) ||
      (targetPosition.x === 23 && targetPosition.y === 107) ||
      (targetPosition.x === 23 && targetPosition.y === 108) ||
      (targetPosition.x === 23 && targetPosition.y === 109)
    ) {
      this.dialogueBox.show("This looks a bit... SUS..");
    }
    if (
      (targetPosition.x === 142 && targetPosition.y === 77) ||
      (targetPosition.x === 141 && targetPosition.y === 77) ||
      (targetPosition.x === 142 && targetPosition.y === 76) ||
      (targetPosition.x === 141 && targetPosition.y === 76)
    ) {
      this.dialogueBox.show("YO ANGELO!");
    }
    if (targetPosition.x === 196 && targetPosition.y === 78) {
      this.dialogueBox.show("I built a cool castle here but a caseo ate it");
    }
    if (targetPosition.x === 118 && targetPosition.y === 50) {
      this.dialogueBox.show("Welcome to Chill-Mart");
    }
    if (targetPosition.x === 162 && targetPosition.y === 32) {
      this.dialogueBox.show("Welcome to DroopyVille");
    }
    if (targetPosition.x === 177 && targetPosition.y === 26) {
      this.dialogueBox.show("'sign seems too worn down to read...'");
    }
    if (targetPosition.x === 181 && targetPosition.y === 53) {
      this.dialogueBox.show("The Dead dont tell tales..");
    }
    if (targetPosition.x === 162 && targetPosition.y === 32) {
      this.dialogueBox.show("Drop by DroopyVille");
    }
    if (targetPosition.x === 58 && targetPosition.y === 32) {
      this.dialogueBox.show("CHILLINGTON PARK");
    }
    if (targetPosition.x === 49 && targetPosition.y === 44) {
      this.dialogueBox.show(
        "'Hello.. Can u hear me... Im under the water... here too much raining.. weeps*"
      );
    }
    if (targetPosition.x === 46 && targetPosition.y === 78) {
      this.dialogueBox.show("PUBLIC LIBRARY");
    }

    if (
      (targetPosition.x === 207 && targetPosition.y === 66) ||
      (targetPosition.x === 206 && targetPosition.y === 66) ||
      (targetPosition.x === 205 && targetPosition.y === 66)
    ) {
      this.dialogueBox.show("Glad they are not placed on Soul Soil..");
    }
    const npcGridPosition = this.gridEngine.getPosition("npc_log");
    const distance = Phaser.Math.Distance.Between(
      targetPosition.x,
      targetPosition.y,
      npcGridPosition.x,
      npcGridPosition.y
    );

    if (distance <= 1) {
      // Pause the NPC decision timer
      this.npcDecisionInterval.paused = true;

      console.log("Talking to Groot...");

      // Initiate dialogue prompt
      const prompt = window.prompt("Talk to Groot: ");
      if (prompt !== null) {
        Ai_response_log(prompt, this.name).then(async (response: any) => {
          this.dialogueBox.show(response);
          console.log("Groot's response:", response);

          // // Update memory after interaction
          // await Ai_response_log(`groot completed the interaction`, "groot");

          // Resume the decision timer
          this.npcDecisionInterval.paused = false;
        });
      } else {
        // Resume the decision timer if prompt is canceled
        this.npcDecisionInterval.paused = false;
      }
    }
  }

  private showJukeBoxModal() {
    this.socket.emit("showJukeboxModal");
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
          this.gridEngine.setSpeed(playerInfo.id, playerInfo.speed);
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
    this.name = playerName;

    //These values dodnt matter cause we set it in the update function
    const nameText = this.add
      .text(0, 0, playerName, {
        fontSize: "8px",
        fontStyle: "bold",
        color: "#ffffff",
        fontFamily: "monaco, monospace",
        resolution: 1,
      })
      .setOrigin(0.5, 1);
    nameText.setDepth(10);
    this.nameTexts[playerInfo.id] = nameText;

    this.gridEngine.addCharacter({
      id: playerInfo.id,
      sprite: sprite,
      startPosition: { x: playerInfo.x, y: playerInfo.y },
      speed: playerInfo.speed || 4,
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
      // console.log(`Character with ID ${playerId} does not exist in GridEngine`);
      return;
    }
    // **Check if chat input is focused**
    if (window.isChatFocused) {
      return;
    }

    if (!this.gridEngine.isMoving(playerId)) {
      let moved = false;
      const speed = this.shiftKey.isDown ? 8 : 4;
      this.gridEngine.setSpeed(playerId, speed);

      if (this.cursors.left.isDown) {
        this.gridEngine.move(playerId, Direction.LEFT);
        moved = true;
      } else if (this.cursors.right.isDown) {
        this.gridEngine.move(playerId, Direction.RIGHT);
        moved = true;
      } else if (this.cursors.up.isDown) {
        this.gridEngine.move(playerId, Direction.UP);
        moved = true;
      } else if (this.cursors.down.isDown) {
        this.gridEngine.move(playerId, Direction.DOWN);
        moved = true;
      } else if (this.cursors.space.isDown) {
        this.handleInteractivity();
      } else {
      }
      if (moved) {
        const currentPosition = this.gridEngine.getPosition(playerId);
        this.socket.emit("playerMovement", {
          id: playerId,
          x: currentPosition.x,
          y: currentPosition.y,
          speed: speed, // Include current speed
        });
      }
    }
  }
}

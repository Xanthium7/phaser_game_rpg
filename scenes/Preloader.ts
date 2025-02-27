import { GridEngine, Direction } from "grid-engine";
import * as Phaser from "phaser";
import { Scene } from "phaser";
import DialogueBox from "./DialogueBox";
import {
  Ai_response,
  get_npc_memeory,
  getNpcAction,
  update_Groot_memory,
} from "@/actions/actions";
import {
  groot_log_prompt,
  librarian_prompt,
  blacksmith_prompt,
  lisa_prompt,
  anne_prompt,
  elsa_prompt,
  tom_prompt,
  brick_prompt,
  col_prompt,
} from "@/characterPrompts";
import npcStateManager, { NPCAction } from "../utils/npcStateManager";
import npcInteractionManager from "../utils/npcInteractions";

// to prevent chat controls from messing with game controls
declare global {
  interface Window {
    isChatFocused: boolean;
  }
}

// Define a global dictionary of places
const globalPlaces: { [key: string]: { x: number; y: number } } = {
  CHILLMART: { x: 107, y: 32 },
  DROOPYVILLE: { x: 168, y: 32 },
  LIBRARY: { x: 46, y: 107 },
  MART: { x: 118, y: 50 },
  PARK: { x: 36, y: 44 },
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

  // Add new properties for better state management
  private npcStates: {
    [key: string]: {
      isMoving: boolean;
      currentAction: string | null;
      lastActionTime: number;
      isInteracting: boolean;
      currentPlan: string | null;
    };
  } = {};

  // Add a new dictionary for NPC properties
  private npcProperties: {
    [key: string]: import("@/actions/actions").NPCProperties;
  } = {
    npc_log: {
      name: "Groot",
      personality: "chaotic, sarcastic, and deeply caring",
      systemPrompt: groot_log_prompt,
      memories: "",
      currentAction: "NONE",
      lastAction: "NONE",
      location: "",
      availableActions: [
        "GO TO CHILLMART",
        "GO TO LIBRARY",
        "GO TO DROOPYVILLE",
        "GO TO PARK",
        "GO TO PLAYER",
        "WANDER",
        "IDLE",
      ],
    },
    librarian: {
      name: "Amelia",
      personality: "scholarly, calm, and helpful",
      systemPrompt: librarian_prompt,
      memories: "",
      location: "",
      currentAction: "NONE",
      lastAction: "NONE",
      availableActions: ["GO TO LIBRARY", "WANDER", "IDLE", "GO TO CHILLMART"],
    },
    blacksmith: {
      name: "Ron",
      personality: "hardy, strong, and straightforward",
      systemPrompt: blacksmith_prompt,
      memories: "",
      location: "",
      currentAction: "NONE",
      lastAction: "NONE",
      availableActions: ["GO TO DROOPYVILLE", "WANDER", "IDLE"],
    },
    lisa: {
      name: "Lisa",
      personality: "cheerful, sociable, and optimistic",
      systemPrompt: lisa_prompt,
      memories: "",
      location: "",
      currentAction: "NONE",
      lastAction: "NONE",
      availableActions: [
        "GO TO DROOPYVILLE",
        "WANDER",
        "IDLE",
        "GO TO CHILLMART",
      ],
    },
    anne: {
      name: "Anne",
      personality: "efficient, business-minded, and organized",
      systemPrompt: anne_prompt,
      memories: "",
      location: "",
      currentAction: "NONE",
      lastAction: "NONE",
      availableActions: ["GO TO CHILLMART", "WANDER", "IDLE"],
    },
    elsa: {
      name: "Elsa",
      personality: "enigmatic, reserved, and knowledgeable",
      systemPrompt: elsa_prompt,
      memories: "",
      location: "",
      currentAction: "NONE",
      lastAction: "NONE",
      availableActions: ["GO TO CHILLMART", "GO TO LIBRARY", "WANDER", "IDLE"],
    },
    tom: {
      name: "Tom",
      personality: "free-spirited, adventurous, and resourceful",
      systemPrompt: tom_prompt,
      memories: "",
      location: "",
      currentAction: "NONE",
      lastAction: "NONE",
      availableActions: [
        "GO TO CHILLMART",
        "GO TO LIBRARY",
        "GO TO DROOPYVILLE",
        "GO TO PARK",
        "WANDER",
        "IDLE",
      ],
    },
    brick: {
      name: "Brick",
      personality: "strong-willed, protective, and disciplined",
      systemPrompt: brick_prompt,
      memories: "",
      location: "",
      currentAction: "NONE",
      lastAction: "NONE",
      availableActions: [
        "GO TO CHILLMART",
        "WANDER",
        "IDLE",
        "GO TO DROOPYVILLE",
      ],
    },
    col: {
      name: "Col",
      personality: "strict, vigilant, and reserved",
      systemPrompt: col_prompt,
      memories: "",
      location: "",
      currentAction: "NONE",
      lastAction: "NONE",
      availableActions: ["GO TO DROOPYVILLE", "WANDER", "IDLE"],
    },
  };

  // Add new properties for NPC management
  private npcFollowUpActions: Map<string, Phaser.Time.TimerEvent> = new Map();
  private npcPositions: Record<string, { x: number; y: number }> = {};
  private npcInteractionCheckTimer: Phaser.Time.TimerEvent | null = null;

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
    this.load.spritesheet("librarian", "/assets/librarian.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("blacksmith", "/assets/blacksmith.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("elsa", "/assets/mart_women.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("anne", "/assets/mart_women2.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("lisa", "/assets/dp_w.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("brick", "/assets/warrior_dp.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("col", "/assets/warrior_dp2.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("traveller", "/assets/traveller.png", {
      frameWidth: 64,
      frameHeight: 64,
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

    // Walk aimation for NPC LOG
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
    this.addlibrarian();
    this.addBlacksmith();
    this.addLisa();
    this.addAnne();
    this.addElsa();
    this.addTom();
    this.addBrick();
    this.addCol();

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
        // Stop the walking animation
        sprite.anims.stop();

        // Set the correct idle frame for the current direction
        const characterGridWidth = this.characterGridWidths[charId] || 0;
        switch (direction) {
          case "up":
            sprite.setFrame(34 + characterGridWidth);
            break;
          case "right":
            sprite.setFrame(17 + characterGridWidth);
            break;
          case "down":
            sprite.setFrame(0 + characterGridWidth);
            break;
          case "left":
            sprite.setFrame(51 + characterGridWidth);
            break;
        }
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

    // Initialize all NPCs in state manager
    Object.keys(this.npcProperties).forEach((npcId) => {
      npcStateManager.initializeNPC(npcId);
    });

    // Set up regular interaction checks
    this.npcInteractionCheckTimer = this.time.addEvent({
      delay: 30000,
      callback: this.checkForPossibleNPCInteractions,
      callbackScope: this,
      loop: true,
    });

    // Set up regular cleanup of expired interactions
    this.time.addEvent({
      delay: 5000, // Check every 5 seconds
      callback: () => npcInteractionManager.cleanupExpiredInteractions(),
      callbackScope: this,
      loop: true,
    });

    // Add movement completion tracking
    this.gridEngine
      .movementStopped()
      .subscribe(this.handleMovementStopped.bind(this));

    // Start NPCs with initial delay
    this.time.delayedCall(2000, () => {
      this.decideNpcAction("npc_log");
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
      }
    });
    this.gridEngine.moveRandomly("npc_log", 500);
  }

  private addlibrarian(): void {
    const startGridPosition = { x: 28, y: 104 };
    const librarian = this.add.sprite(0, 0, "librarian");

    librarian.setScale(0.5);

    this.gridEngine.addCharacter({
      id: "librarian",
      sprite: librarian,
      startPosition: startGridPosition,
      speed: 4,
    });

    // Create animations for librarian
    this.anims.create({
      key: "librarian_walk_down",
      frames: this.anims.generateFrameNumbers("librarian", {
        start: 18,
        end: 26,
      }),
      frameRate: 16,
      repeat: -1,
    });

    this.anims.create({
      key: "librarian_walk_left",
      frames: this.anims.generateFrameNumbers("librarian", {
        start: 9,
        end: 17,
      }),
      frameRate: 16,
      repeat: -1,
    });

    this.anims.create({
      key: "librarian_walk_right",
      frames: this.anims.generateFrameNumbers("librarian", {
        start: 27,
        end: 35,
      }),
      frameRate: 16,
      repeat: -1,
    });

    this.anims.create({
      key: "librarian_walk_up",
      frames: this.anims.generateFrameNumbers("librarian", {
        start: 0,
        end: 8,
      }),
      frameRate: 16,
      repeat: -1,
    });

    // Listen to GridEngine movement events
    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      if (charId === "librarian") {
        librarian.play(`librarian_walk_${direction}`);
      }
    });

    this.gridEngine.movementStopped().subscribe(({ charId, direction }) => {
      if (charId === "librarian") {
        librarian.anims.stop();
        switch (direction) {
          case "up":
            librarian.setFrame(8);
            break;
          case "down":
            librarian.setFrame(0);
            break;
          case "left":
            librarian.setFrame(4);
            break;
          case "right":
            librarian.setFrame(12);
            break;
        }
      }
    });

    // Make the NPC move randomly
    this.gridEngine.moveRandomly("librarian", 5000);
  }

  private addBlacksmith(): void {
    const startGridPosition = { x: 212, y: 56 };
    const npc = this.add.sprite(0, 0, "blacksmith");
    npc.setScale(0.5);
    this.setupNPC("blacksmith", npc, startGridPosition, 200000);
  }

  private addLisa(): void {
    const startGridPosition = { x: 198, y: 29 };
    const npc = this.add.sprite(0, 0, "lisa");
    npc.setScale(0.5);
    this.setupNPC("lisa", npc, startGridPosition, 3000);
  }

  private addAnne(): void {
    const startGridPosition = { x: 107, y: 35 };
    const npc = this.add.sprite(0, 0, "anne");
    npc.setScale(0.5);
    this.setupNPC("anne", npc, startGridPosition, 4000);
  }

  private addElsa(): void {
    const startGridPosition = { x: 110, y: 35 };
    const npc = this.add.sprite(0, 0, "elsa");
    npc.setScale(0.5);
    this.setupNPC("elsa", npc, startGridPosition, 3500);
  }

  private addTom(): void {
    const startGridPosition = { x: 130, y: 70 };
    const npc = this.add.sprite(0, 0, "traveller");
    npc.setScale(0.5);
    this.setupNPC("tom", npc, startGridPosition, 1500);
  }

  private addBrick(): void {
    const startGridPosition = { x: 100, y: 32 };
    const npc = this.add.sprite(0, 0, "brick");
    npc.setScale(0.5);
    this.setupNPC("brick", npc, startGridPosition, 5000);
  }

  private addCol(): void {
    const startGridPosition = { x: 201, y: 55 };
    const npc = this.add.sprite(0, 0, "col");
    npc.setScale(0.5);
    this.setupNPC("col", npc, startGridPosition, 5000);
  }

  private setupNPC(
    id: string,
    sprite: Phaser.GameObjects.Sprite,
    startPosition: { x: number; y: number },
    randomMoveDelay: number
  ): void {
    this.gridEngine.addCharacter({
      id,
      sprite,
      startPosition,
      speed: 4,
    });

    // Create animations
    const animationKeys = ["up", "down", "left", "right"];
    animationKeys.forEach((direction, index) => {
      this.anims.create({
        key: `${id}_walk_${direction}`,
        frames: this.anims.generateFrameNumbers(sprite.texture.key, {
          start: index * 9,
          end: index * 9 + 8,
        }),
        frameRate: 16,
        repeat: -1,
      });
    });

    // Movement listeners
    this.gridEngine.movementStarted().subscribe(({ charId, direction }) => {
      if (charId === id) {
        sprite.play(`${id}_walk_${direction}`);
      }
    });

    this.gridEngine.movementStopped().subscribe(({ charId, direction }) => {
      if (charId === id) {
        sprite.anims.stop();
        sprite.setFrame(
          direction === "up"
            ? 0
            : direction === "left"
            ? 9
            : direction === "down"
            ? 18
            : 27
        );
      }
    });

    // Start random movement
    this.gridEngine.moveRandomly(id, randomMoveDelay);
  }

  // Initialize the agentic system for the NPC
  private initializeNpcAgent() {
    this.npcDecisionInterval = this.time.addEvent({
      delay: 60000,
      callback: this.decideNpcAction,
      callbackScope: this,
      loop: true,
    });
  }

  private getNpcLocation(npcName: string): string {
    const position = this.gridEngine.getPosition(npcName);

    for (const [placeName, coords] of Object.entries(globalPlaces)) {
      const distance =
        Math.abs(position.x - coords.x) + Math.abs(position.y - coords.y);
      if (distance <= 50) {
        return placeName;
      }
    }

    return "UNKNOWN";
  }

  // Function to decide NPC's next action
  private async decideNpcAction(npcId: string = "npc_log"): Promise<void> {
    const npc = this.npcProperties[npcId];
    if (!npc) return;

    // Skip if NPC is already in an interaction or moving
    const currentState = npcStateManager.getState(npcId);
    if (currentState === "interacting" || currentState === "moving") {
      console.log(
        `Skipping decision for ${npcId} - current state: ${currentState}`
      );
      return;
    }

    console.log(`Deciding action for ${npcId} (${npc.name})`);

    // Update NPC location
    const location = this.getNpcLocation(npcId);
    npc.location = location;

    // For Groot, get memory
    if (npcId === "npc_log") {
      const groot_memory = await get_npc_memeory("npc_log", this.name);
      npc.memories = groot_memory;
    }

    // Store the real previous action state
    const previousAction = npc.currentAction || "NONE";
    npc.lastAction = previousAction;

    // Get action from AI
    const actionResponse = await getNpcAction(npc, this.name);
    let [actionType, reason] = actionResponse.split(" [");
    const reasonText = reason ? reason.slice(0, -1) : "";

    // Update NPC state
    npc.currentAction = actionType.trim();

    console.log(`NPC ${npcId} decided to ${actionType} because ${reasonText}`);
    console.log(
      `Previous action was: ${previousAction}, New action: ${actionType}`
    );

    // Create an action record
    const action: NPCAction = {
      type: actionType.trim(),
      reason: reasonText,
      startTime: Date.now(),
      completed: false,
    };

    // Set action in state manager
    npcStateManager.setCurrentAction(npcId, action);
    npcStateManager.setState(npcId, "moving");

    // Execute the action
    await this.executeNpcAction(npcId, actionType.trim(), reasonText);
  }

  private async executeNpcAction(
    npcId: string,
    actionType: string,
    reasoning: string
  ): Promise<void> {
    // For Groot, update memory about the decision
    if (npcId === "npc_log") {
      await update_Groot_memory(
        `I decided to ${actionType} because ${reasoning}`,
        this.name
      );
    }

    switch (actionType) {
      case "IDLE":
        this.gridEngine.stopMovement(npcId);
        console.log(`${npcId} stays idle: ${reasoning}`);

        // After idle period, complete action
        this.time.delayedCall(20000, () => {
          npcStateManager.completeCurrentAction(npcId);
          this.scheduleFollowUpAction(npcId);
        });
        break;

      case "WANDER":
        this.gridEngine.moveRandomly(npcId, 500);
        console.log(`${npcId} wanders around: ${reasoning}`);

        // After wandering period, complete action
        this.time.delayedCall(45000, () => {
          npcStateManager.completeCurrentAction(npcId);
          this.scheduleFollowUpAction(npcId);
        });
        break;

      case "GO TO PLAYER":
        const playerPos = this.gridEngine.getPosition(this.socket.id);
        console.log(
          `${npcId} moves to player at ${playerPos.x},${playerPos.y}: ${reasoning}`
        );
        this.gridEngine.moveTo(npcId, playerPos);
        break;

      case "GO TO CHILLMART":
      case "GO TO DROOPYVILLE":
      case "GO TO LIBRARY":
      case "GO TO PARK":
        const placeName = actionType.replace("GO TO ", "");
        const destination = globalPlaces[placeName];

        if (destination) {
          console.log(`${npcId} moves to ${placeName}: ${reasoning}`);
          this.gridEngine.moveTo(npcId, destination);
        } else {
          console.error(`Unknown place: ${placeName}`);
          this.gridEngine.moveRandomly(npcId, 1000);
        }
        break;

      default:
        console.log(`Unknown action: ${actionType}`);
        this.gridEngine.moveRandomly(npcId, 1000);
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

    // Check for interactions with all NPCs
    const npcIds = Object.keys(this.npcProperties);

    for (const npcId of npcIds) {
      if (!this.gridEngine.hasCharacter(npcId)) continue;

      const npcPosition = this.gridEngine.getPosition(npcId);
      const distance = Phaser.Math.Distance.Between(
        targetPosition.x,
        targetPosition.y,
        npcPosition.x,
        npcPosition.y
      );

      if (distance <= 1) {
        // Pause the NPC decision timer
        this.npcDecisionInterval.paused = true;

        const npcName = this.npcProperties[npcId].name;
        console.log(`Talking to ${npcName}...`);
        const userInput = window.prompt(`Talk to ${npcName}: `);

        if (userInput) {
          Ai_response(npcId, userInput, this.name).then((response) => {
            console.log(`${npcName} Response:`, response);
            this.dialogueBox.show(response);

            if (response.includes("[") && response.includes("]")) {
              this.decideNpcAction(npcId);
            }
          });
        }

        // Resume the decision timer
        this.npcDecisionInterval.paused = false;
        return; // Exit after handling one NPC interaction
      }
    }

    // Handle location-based interactions only if no NPC interaction happened
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

    // if (distance <= 1) {
    //   // Pause the NPC decision timer
    //   this.npcDecisionInterval.paused = true;

    //   console.log("Talking to Groot...");
    //   const userInput = window.prompt("Talk to Groot: ");
    //   if (userInput) {
    //     Ai_response("npc_log", userInput, this.name).then((response) => {
    //       console.log("Groot Response:", response);
    //       this.dialogueBox.show(response);

    //       if (response.includes("[") && response.includes("]")) {
    //         this.decideNpcAction();
    //       }
    //     });
    //   }

    //   // Resume the decision timer
    //   this.npcDecisionInterval.paused = false;
    // } else {
    //   // Resume the decision timer if prompt is canceled
    //   this.npcDecisionInterval.paused = false;
    // }
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

    // Add idle animations

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
        // If no movement keys are pressed, ensure the correct idle frame is set
        const sprite = this.players[playerId];
        const direction = this.gridEngine.getFacingDirection(playerId);
        const characterGridWidth = this.characterGridWidths[playerId] || 0;

        if (sprite) {
          switch (direction) {
            case "up":
              sprite.setFrame(34 + characterGridWidth);
              break;
            case "right":
              sprite.setFrame(17 + characterGridWidth);
              break;
            case "down":
              sprite.setFrame(0 + characterGridWidth);
              break;
            case "left":
              sprite.setFrame(51 + characterGridWidth);
              break;
          }
        }
      }

      if (moved) {
        const currentPosition = this.gridEngine.getPosition(playerId);
        this.socket.emit("playerMovement", {
          id: playerId,
          x: currentPosition.x,
          y: currentPosition.y,
          speed: speed,
        });
      }
    }
  }

  // Add this method to check for possible interactions between NPCs
  private checkForPossibleNPCInteractions(): void {
    // Update all NPC positions
    Object.keys(this.npcProperties).forEach((npcId) => {
      if (this.gridEngine.hasCharacter(npcId)) {
        this.npcPositions[npcId] = this.gridEngine.getPosition(npcId);
      }
    });

    // Check for NPCs close to each other
    const npcIds = Object.keys(this.npcProperties);
    for (let i = 0; i < npcIds.length; i++) {
      const npc1Id = npcIds[i];

      // Skip if NPC is already interacting or moving
      if (npcStateManager.getState(npc1Id) !== "idle") continue;

      for (let j = i + 1; j < npcIds.length; j++) {
        const npc2Id = npcIds[j];

        // Skip if NPC is already interacting or moving
        if (npcStateManager.getState(npc2Id) !== "idle") continue;

        const pos1 = this.npcPositions[npc1Id];
        const pos2 = this.npcPositions[npc2Id];

        if (!pos1 || !pos2) continue;

        // Check if NPCs are close to each other
        const distance = Phaser.Math.Distance.Between(
          pos1.x,
          pos1.y,
          pos2.x,
          pos2.y
        );

        if (distance <= 2) {
          // Close enough to interact
          this.initiateNPCInteraction(npc1Id, npc2Id);
          return; // Only start one interaction at a time
        }
      }
    }
  }

  // Method to handle movement completion
  private handleMovementStopped({
    charId,
  }: {
    charId: string;
    direction: string;
  }): void {
    // Only handle NPCs, not players
    if (charId === this.socket.id) return;
    if (!this.npcProperties[charId]) return;

    console.log(`NPC ${charId} stopped moving`);

    // Update NPC location and memory
    const location = this.getNpcLocation(charId);
    this.npcProperties[charId].location = location;

    // Complete the current action
    const currentAction = npcStateManager.getCurrentAction(charId);
    if (currentAction && !currentAction.completed) {
      npcStateManager.completeCurrentAction(charId);

      // Update memory for Groot
      if (charId === "npc_log") {
        update_Groot_memory(`I arrived at ${location}`, this.name);
      }

      // Schedule follow-up action
      this.scheduleFollowUpAction(charId);
    }
  }

  // Schedule what to do after completing an action
  private scheduleFollowUpAction(npcId: string): void {
    // Cancel any existing follow-up
    if (this.npcFollowUpActions.has(npcId)) {
      this.npcFollowUpActions.get(npcId)?.remove();
    }

    // Random delay between 5-15 seconds
    const delay = Phaser.Math.Between(5000, 15000);

    const timer = this.time.delayedCall(delay, () => {
      //**  50% chance to wander at destination, 50% to make a new decision
      if (Math.random() > 0.5) {
        this.gridEngine.moveRandomly(npcId, 1000);
        console.log(`${npcId} is now wandering at the destination`);

        // Schedule next decision after wandering
        const nextDecisionDelay = Phaser.Math.Between(30000, 60000);
        this.time.delayedCall(nextDecisionDelay, () => {
          this.decideNpcAction(npcId);
        });
      } else {
        this.decideNpcAction(npcId);
      }
    });

    this.npcFollowUpActions.set(npcId, timer);
  }

  // Method to initiate interaction between NPCs
  private initiateNPCInteraction(npc1Id: string, npc2Id: string): void {
    const npc1 = this.npcProperties[npc1Id];
    const npc2 = this.npcProperties[npc2Id];

    if (!npc1 || !npc2) return;

    const npc1Name = npc1.name;
    const npc2Name = npc2.name;

    console.log(`Starting interaction between ${npc1Name} and ${npc2Name}`);

    // Stop movement for both NPCs
    this.gridEngine.stopMovement(npc1Id);
    this.gridEngine.stopMovement(npc2Id);

    // Make them face each other
    const pos1 = this.gridEngine.getPosition(npc1Id);
    const pos2 = this.gridEngine.getPosition(npc2Id);

    if (pos1.x < pos2.x) {
      this.gridEngine.turnTowards(npc1Id, Direction.RIGHT);
      this.gridEngine.turnTowards(npc2Id, Direction.LEFT);
    } else {
      this.gridEngine.turnTowards(npc1Id, Direction.LEFT);
      this.gridEngine.turnTowards(npc2Id, Direction.RIGHT);
    }

    // Start interaction
    const description = `discussing their day`;
    const interaction = npcInteractionManager.startInteraction(
      npc1Id,
      npc2Id,
      npc1Name,
      npc2Name,
      "chat",
      30000,
      description
    );

    // Update memory for Groot if involved
    if (npc1Id === "npc_log" || npc2Id === "npc_log") {
      const otherName = npc1Id === "npc_log" ? npc2Name : npc1Name;
      update_Groot_memory(
        `I met with ${otherName} and we started ${description}`,
        this.name
      );
    }
    // Show visual indication of interaction
    const bubbleX = ((pos1.x + pos2.x) * 16) / 2;
    const bubbleY = Math.min(pos1.y, pos2.y) * 16 - 20;

    const chatBubble = this.add
      .text(bubbleX, bubbleY, "💬", {
        fontSize: "20px",
      })
      .setOrigin(0.5);

    // Fade out and destroy chat bubble when interaction ends
    this.tweens.add({
      targets: chatBubble,
      alpha: { from: 1, to: 0 },
      duration: interaction.duration,
      ease: "Linear",
      onComplete: () => {
        chatBubble.destroy();
      },
    });

    // After interaction ends, schedule new decisions
    this.time.delayedCall(interaction.duration + 100, () => {
      this.decideNpcAction(npc1Id);
      this.time.delayedCall(2000, () => {
        this.decideNpcAction(npc2Id);
      });
    });
  }
}

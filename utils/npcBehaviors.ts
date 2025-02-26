import { GridEngine } from "grid-engine";

type BehaviorType = "wander" | "idle" | "interact" | "follow";

export interface NPCBehavior {
  type: BehaviorType;
  duration: number;
  targetId?: string;
  location?: { x: number; y: number };
}

export const behaviors = {
  // When an NPC arrives at ChillMart
  atChillMart: (gridEngine: GridEngine, npcId: string): NPCBehavior => {
    // 70% chance to wander, 30% chance to idle
    if (Math.random() < 0.7) {
      gridEngine.moveRandomly(npcId, 500);
      return { type: "wander", duration: 30000 };
    } else {
      gridEngine.stopMovement(npcId);
      return { type: "idle", duration: 15000 };
    }
  },

  // When an NPC arrives at the Library
  atLibrary: (gridEngine: GridEngine, npcId: string): NPCBehavior => {
    // 80% chance to idle (reading), 20% chance to wander
    if (Math.random() < 0.8) {
      gridEngine.stopMovement(npcId);
      return { type: "idle", duration: 45000 };
    } else {
      gridEngine.moveRandomly(npcId, 300);
      return { type: "wander", duration: 20000 };
    }
  },

  // More behaviors for other locations...

  // Generic behavior when reaching a destination
  reachedDestination: (gridEngine: GridEngine, npcId: string): NPCBehavior => {
    // 50/50 chance between wandering or idling
    if (Math.random() < 0.5) {
      gridEngine.moveRandomly(npcId, 800);
      return { type: "wander", duration: Phaser.Math.Between(20000, 40000) };
    } else {
      gridEngine.stopMovement(npcId);
      return { type: "idle", duration: Phaser.Math.Between(10000, 30000) };
    }
  },
};

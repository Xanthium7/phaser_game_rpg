import { update_Groot_memory } from "@/actions/actions";
import npcStateManager from "./npcStateManager";

export type NPCInteractionType = "chat" | "trade" | "follow" | "avoid";

export interface NPCInteraction {
  npc1Id: string;
  npc2Id: string;
  npc1Name: string;
  npc2Name: string;
  type: NPCInteractionType;
  startTime: number;
  duration: number;
  description: string;
}

class NPCInteractionManager {
  private activeInteractions: NPCInteraction[] = [];

  startInteraction(
    npc1Id: string,
    npc2Id: string,
    npc1Name: string,
    npc2Name: string,
    type: NPCInteractionType,
    duration: number = 10000, // Default 10 seconds
    description: string = "chatting"
  ): NPCInteraction {
    // End any existing interactions for these NPCs
    this.endInteractionsForNPC(npc1Id);
    this.endInteractionsForNPC(npc2Id);

    // Create new interaction
    const interaction: NPCInteraction = {
      npc1Id,
      npc2Id,
      npc1Name,
      npc2Name,
      type,
      startTime: Date.now(),
      duration,
      description,
    };

    // Add to active interactions
    this.activeInteractions.push(interaction);

    // Update NPC states
    npcStateManager.setState(npc1Id, "interacting");
    npcStateManager.setState(npc2Id, "interacting");
    npcStateManager.setInteractionTarget(npc1Id, npc2Id);
    npcStateManager.setInteractionTarget(npc2Id, npc1Id);

    return interaction;
  }

  endInteractionsForNPC(npcId: string): void {
    const interactions = this.activeInteractions.filter(
      (i) => i.npc1Id === npcId || i.npc2Id === npcId
    );

    for (const interaction of interactions) {
      // Remove from active interactions
      this.activeInteractions = this.activeInteractions.filter(
        (i) => i !== interaction
      );

      // Reset states for both NPCs
      const otherId =
        interaction.npc1Id === npcId ? interaction.npc2Id : interaction.npc1Id;
      npcStateManager.setState(npcId, "decision_pending");
      npcStateManager.setState(otherId, "decision_pending");
      npcStateManager.setInteractionTarget(npcId, null);
      npcStateManager.setInteractionTarget(otherId, null);
    }
  }

  getActiveInteraction(npcId: string): NPCInteraction | null {
    return (
      this.activeInteractions.find(
        (i) => i.npc1Id === npcId || i.npc2Id === npcId
      ) || null
    );
  }

  cleanupExpiredInteractions(): void {
    const now = Date.now();
    const expiredInteractions = this.activeInteractions.filter(
      (i) => now > i.startTime + i.duration
    );

    for (const interaction of expiredInteractions) {
      // Reset states for both NPCs
      npcStateManager.setState(interaction.npc1Id, "decision_pending");
      npcStateManager.setState(interaction.npc2Id, "decision_pending");
      npcStateManager.setInteractionTarget(interaction.npc1Id, null);
      npcStateManager.setInteractionTarget(interaction.npc2Id, null);
    }

    // Remove expired interactions
    this.activeInteractions = this.activeInteractions.filter(
      (i) => now <= i.startTime + i.duration
    );
  }
}

const npcInteractionManager = new NPCInteractionManager();
export default npcInteractionManager;

"use server";

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
import { prisma } from "@/lib/db";
import Groq from "groq-sdk";
import npcStateManager from "../utils/npcStateManager";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const model_name = "llama-3.1-8b-instant";

// Map of NPC IDs to their system prompts
const NPC_PROMPTS: Record<string, string> = {
  npc_log: groot_log_prompt,
  librarian: librarian_prompt,
  blacksmith: blacksmith_prompt,
  lisa: lisa_prompt,
  anne: anne_prompt,
  elsa: elsa_prompt,
  tom: tom_prompt,
  brick: brick_prompt,
  col: col_prompt,
};

// Map of NPC IDs to their names
const NPC_NAMES: Record<string, string> = {
  npc_log: "Groot",
  librarian: "Amelia",
  blacksmith: "Ron",
  lisa: "Lisa",
  anne: "Anne",
  elsa: "Elsa",
  tom: "Tom",
  brick: "Brick",
  col: "Col",
};

export interface NPCProperties {
  name: string;
  personality: string;
  systemPrompt: string;
  memories?: string;
  currentAction?: string;
  lastAction?: string;
  location?: string;
  availableActions?: string[];
}

export interface GameState {
  location: string;
  time: string;
  mood: string;
  environment: { nearbyPlayers: number; nearbyNPCs: string[] };
  availableActions: string[];
}

export async function Ai_response(
  npcId: string,
  prompt: string,
  username: string
): Promise<string> {
  try {
    // Get the correct prompt for this NPC
    const npcPrompt = NPC_PROMPTS[npcId] || groot_log_prompt;
    const npcName = NPC_NAMES[npcId] || "NPC";

    // Get memory for this specific NPC
    const memory = await get_npc_memory(npcId, username);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
        ${npcPrompt}

        CONVERSATION HISTORY:
        ${memory}

        AVAILABLE ACTIONS:
        - GO TO CHILLMART
        - GO TO LIBRARY
        - GO TO DROOPYVILLE
        - GO TO PARK
        - GO TO PLAYER
        - WANDER AROUND
        - STAY IDLE

        RESPONSE FORMAT:
        1. If the user's request requires an action:
           Respond with: "Message [ACTION_NAME]"
           Example: "I'll get some snacks! [GO TO CHILLMART]"

        2. If no action is needed:
           Respond with just the message
           Example: "Hello! Nice to meet you!"

        Remember to maintain character personality and reference past conversations naturally.
        `,
        },
        {
          role: "user",
          content: `${username}: ${prompt}`,
        },
      ],
      model: model_name,
      temperature: 0.3,
    });

    const response = chatCompletion.choices[0]?.message?.content?.trim() || "";
    const memoryEntry = `\n${username}: ${prompt}\n${npcName}: ${response}\n`;
    await update_npc_memory(npcId, memoryEntry, username);
    return response;
  } catch (error) {
    console.error(`AI Response Error for ${npcId}:`, error);
    return `${NPC_NAMES[npcId] || "I"} seem to be lost in thought right now...`;
  }
}

// Add a new function to get NPC-specific memory
export async function get_npc_memory(
  npcId: string,
  username: string
): Promise<string> {
  try {
    const memory = await prisma.history.findFirst({
      where: {
        username: username,
      },
    });

    if (!memory) return "";

    // For Groot, use legacy field for backward compatibility
    if (npcId === "npc_log") {
      return memory.log_groot?.slice(-2000) || "";
    }

    // For other NPCs
    return (
      ((memory as History)[npcId] as string | undefined)?.slice(-2000) || ""
    );
  } catch (error) {
    console.error(`Error getting memory for ${npcId}:`, error);
    return "";
  }
}

// Keep for backward compatibility
export async function get_npc_memeory(
  npcId: string,
  username: string
): Promise<string> {
  return get_npc_memory(npcId, username);
}

export async function getNpcAction(
  npc_properties: NPCProperties,
  username: string
): Promise<string> {
  try {
    // Get recent action history from state manager
    const recentActionSummary = npcStateManager.getActionSummary(
      npc_properties.name.toLowerCase()
    );

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
      You are an NPC in a game world named ${
        npc_properties.name
      }. You are simulating life in a town.
      
      CURRENT STATE:
      - Current location: ${npc_properties.location || "UNKNOWN"}
      - Current action: ${npc_properties.currentAction || "NONE"}
      - Last action: ${npc_properties.lastAction || "NONE"}
      - Recent actions: ${recentActionSummary}
      - Time of day: ${getTimeOfDay()}
      
      STRICT RESPONSE FORMAT:
      You must respond with exactly: ActionName [reasoning]
      - ActionName should be selected from the available actions.
      - [reasoning] must be in square brackets
      - Be creative and varied in your actions.
      - Avoid repeating your most recent action.
      - Consider the time of day and your location when deciding.
      - Consider interacting with NPCs at relevant locations.
      
      Example valid responses:
      WANDER [feeling restless and want to explore new areas]
      GO TO CHILLMART [hungry and need to buy some snacks]
      IDLE [enjoying the nice weather and taking a break]
      GO TO LIBRARY [want to read about local history]
      `,
        },
        {
          role: "user",
          content: `
      Character Details:
      - Personality: ${npc_properties.personality}
      - Background: ${npc_properties.systemPrompt}
      - Current Location: ${npc_properties.location}
      - Current Action: ${npc_properties.currentAction}
      - Last Action: ${npc_properties.lastAction}
      - Recent Memories: ${npc_properties.memories?.slice(-2000)}
      
      Available Actions: ${(npc_properties.availableActions ?? []).join(", ")}
      
      Choose your next action carefully. If you've been going to the same place repeatedly, consider doing something else.
      What single action will you take? Remember to use exact format: ActionName [reasoning]
      `,
        },
      ],
      model: model_name,
      temperature: 0.7, // Higher temperature for more varied responses
    });

    const response = chatCompletion.choices[0]?.message?.content?.trim() || "";

    // Validate response format
    if (!response.includes("[") || !response.includes("]")) {
      return "IDLE [tired to decide]";
    }

    const [action, ...rest] = response.split("[");
    const reasoning = rest.join("[").replace("]", "").trim();

    // Update last and current actions
    npc_properties.lastAction = npc_properties.currentAction;
    npc_properties.currentAction = action.trim();

    console.log("NPC Decision:", {
      name: npc_properties.name,
      action: action.trim(),
      reasoning,
      currentAction: npc_properties.currentAction,
      lastAction: npc_properties.lastAction,
    });

    update_Groot_memory(
      `\n[*${
        npc_properties.name
      } chooses to ${action.trim()} because ${reasoning}*]\n`,
      username
    );
    return response;
  } catch (error) {
    console.error("getNpcAction Error:", error);
    return "ran out of acorns [error occurred]";
  }
}

// Helper function for time of day
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

// Add function to update memory for any NPC
// Define a type for the History model
type History = {
  id: number;
  username: string;
  log_groot: string;
  librarian?: string;
  blacksmith?: string;
  lisa?: string;
  anne?: string;
  elsa?: string;
  tom?: string;
  brick?: string;
  col?: string;
  [key: string]: string | number | undefined; // Index signature for dynamic access
};

export async function update_npc_memory(
  npcId: string,
  new_memory: string,
  username: string
) {
  try {
    const existingHistory = await prisma.history.findFirst({
      where: {
        username: username,
      },
    });

    if (existingHistory) {
      const updateData: Record<string, string> = {};

      // For Groot, use the legacy field name
      if (npcId === "npc_log") {
        updateData.log_groot = (existingHistory.log_groot || "") + new_memory;
      } else {
        // Use type assertion to safely access dynamic properties
        const existingContent = (existingHistory as History)[npcId] as
          | string
          | undefined;
        updateData[npcId] = (existingContent || "") + new_memory;
      }

      await prisma.history.update({
        where: { id: existingHistory.id },
        data: updateData,
      });
    } else {
      const createData: any = { username: username };

      // For Groot, use the legacy field name
      if (npcId === "npc_log") {
        createData.log_groot = new_memory;
      } else {
        createData[npcId] = new_memory;
      }

      await prisma.history.create({
        data: createData,
      });
    }
  } catch (error) {
    console.error(`Error updating memory for ${npcId}:`, error);
  }
}

export async function update_Groot_memory(
  new_memory: string,
  username: string
) {
  return update_npc_memory("npc_log", new_memory, username);
}

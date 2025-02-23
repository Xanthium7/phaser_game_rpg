"use server";

import { groot_brain_log_prompt, groot_log_prompt } from "@/characterPrompts";
import { prisma } from "@/lib/db";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  const memory = get_npc_memeory(npcId, username);
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
        ${groot_log_prompt}

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
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    });

    const response = chatCompletion.choices[0]?.message?.content?.trim() || "";
    const memoryEntry = `\n${username}: ${prompt}\nGroot: ${response}\n`;
    await update_Groot_memory(memoryEntry, username);
    return response;
  } catch (error) {
    console.error("getNpcAction Error:", error);
    return " [error occurred]";
  }
}

export async function get_npc_memeory(
  npcId: string,
  username: string
): Promise<string> {
  const memory = await prisma.history.findMany({
    where: {
      username: username,
    },
    select: {
      log_groot: true,
    },
    take: 1,
  });
  const groot_memory = memory[0]?.log_groot?.slice(-2000);
  return groot_memory;
}

export async function getNpcAction(
  npc_properties: NPCProperties,
  username: string
): Promise<string> {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
      You are an NPC in a game world named ${npc_properties.name}. 
      
      STRICT RESPONSE FORMAT:
      You must respond with exactly: ActionName [reasoning]
      - ActionName should be a selected as exact action from the available actions.
      - [reasoning] must be in square brackets
    
      
      Example valid responses:
      WANDER [looking for adventure]
      CHILLMART [need to buy snacks]
      IDLE [enjoying the view]
      `,
        },
        {
          role: "user",
          content: `
      Character Details:
      - Personality: ${npc_properties.personality}
      - Background: ${npc_properties.systemPrompt}
      - Current Location: ${npc_properties.location}
      - Curent Action: ${npc_properties.currentAction}
      - Last Action: ${npc_properties.lastAction}
      - Recent Memories: ${npc_properties.memories}
      
      Available Actions: ${(npc_properties.availableActions ?? []).join(", ")}
      
      What single action will you take? Remember to use exact format: ActionName [reasoning]
      `,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    });

    const response = chatCompletion.choices[0]?.message?.content?.trim() || "";

    // Validate response format
    if (!response.includes("[") || !response.includes("]")) {
      return "IDLE [lazy to decide]";
    }

    const [action, ...rest] = response.split("[");
    const reasoning = rest.join("[").replace("]", "").trim();

    // Update last and current actions
    npc_properties.lastAction = npc_properties.currentAction;
    npc_properties.currentAction = action.trim();

    console.log("NPC Decision:", npc_properties);

    update_Groot_memory(
      `\n[*${
        npc_properties.name
      } chooses to ${action.trim()} because ${reasoning}*]\n`,
      username
    );
    return response;
  } catch (error) {
    console.error("getNpcAction Error:", error);
    return "IDLE [error occurred]";
  }
}

export async function update_Groot_memory(
  new_memory: string,
  username: string
) {
  const existingHistory = await prisma.history.findFirst({
    where: {
      username: username,
    },
  });

  if (existingHistory) {
    const updatedLog = existingHistory.log_groot + new_memory;
    await prisma.history.update({
      where: { id: existingHistory.id },
      data: { log_groot: updatedLog },
    });
  } else {
    await prisma.history.create({
      data: {
        username: username,
        log_groot: new_memory,
      },
    });
  }
}

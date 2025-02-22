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

const globalPlacesDictionary: { [key: string]: { x: number; y: number } } = {
  "Chill-Mart": { x: 118, y: 50 },
  DroopyVille: { x: 162, y: 32 },
  "Public Library": { x: 46, y: 78 },
  // Add more places as needed
};

async function getResponse(prompt: string, username: string): Promise<string> {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });
    return chatCompletion.choices[0]?.message?.content?.trim() || "No response";
  } catch (error) {
    console.error("Error getting response:", error);
    return "Sorry, I couldn't process that.";
  }
}

export async function Ai_response_log(
  prompt: string,
  username: string
): Promise<string> {
  // First analyze the conversation
  const analysis = await analyzeConversation(prompt);

  // Get the response as before
  const response = await getResponse(prompt, username);

  // Update memory with both the conversation and any action taken
  const memoryUpdate = `
    ${username}: ${prompt}
    Response: ${response}
    Action: ${analysis.intent}${
    analysis.location ? ` to ${analysis.location}` : ""
  }
  `;

  await update_Groot_memory(memoryUpdate, username);

  return response;
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
  const groot_memory = memory[0]?.log_groot?.slice(-1000);
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

    console.log("NPC Decision:", { action: action.trim(), reasoning });

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

export async function update_Groot_memory(key: string, username: string) {
  const existingHistory = await prisma.history.findFirst({
    where: {
      username: username,
    },
  });

  if (existingHistory) {
    const updatedLog = key + existingHistory.log_groot;
    await prisma.history.update({
      where: { id: existingHistory.id },
      data: { log_groot: updatedLog },
    });
  } else {
    await prisma.history.create({
      data: {
        username: username,
        log_groot: key,
      },
    });
  }
}

export async function reflectOnMemories(
  username: string,
  npcId: string
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

  let npcMemories = "";
  let personalityPrompt = "";

  // Select memories and personality based on NPC
  switch (npcId) {
    case "npc_log":
      npcMemories = memory[0]?.log_groot?.slice(-1000) || "";
      personalityPrompt = groot_log_prompt;
      break;
    case "npctest":
      npcMemories = memory[0]?.log_groot?.slice(-1000) || "";
      personalityPrompt = `You are a test NPC with a curious and friendly personality.
        You like to learn about the world around you and make new friends.
        You should reflect on your experiences in a way that shows your personality.`;
      break;
    default:
      return "No memories found for this NPC";
  }

  const reflectionPrompt = `
    You are ${
      npcId == "npc_log" ? "Groot" : npcId
    } with the following personality:
    ${personalityPrompt}

    These are your recent memories and interactions:
    ${npcMemories}

    Based on these memories and your personality, reflect on:
    1. How you feel about recent interactions
    2. What you've learned about the people you've met
    3. Your thoughts about the places you've visited
    4. What you hope to do next

    Respond in first person, staying true to your character's personality.
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: reflectionPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    const reflection =
      chatCompletion.choices[0]?.message?.content?.trim() || "";
    console.log(
      `${npcId == "npc_log" ? "Groot" : npcId}'s Reflection:`,
      reflection
    );

    // Store the reflection in memory
    const reflectionEntry = `\nSELF REFLECTION: *${
      npcId == "npc_log" ? "Groot" : npcId
    } reflects: ${reflection}*\n`;
    await update_Groot_memory(reflectionEntry, username);

    return reflection;
  } catch (error) {
    console.error("Reflection Error:", error);
    return `${npcId} is lost in thought...`;
  }
}

// Modify generatePlan to include optional NPC context info
export async function generatePlan(
  username: string,
  npcId: string,
  currentLocation: string,
  reflection?: string,
  npcContext?: string
): Promise<string> {
  const memory = await prisma.history.findMany({
    where: { username: username },
    select: { log_groot: true },
    take: 1,
  });

  // Only use the last 5 interactions for immediate context
  const recentMemories = memory[0]?.log_groot
    ?.split("\n")
    .filter((line) => line.trim().length > 0)
    .slice(0, 5)
    .join("\n");

  let planningPrompt = `
You are ${npcId === "npc_log" ? "Groot" : npcId}.
Current location: ${currentLocation}
${npcContext ? npcContext : ""}

Your recent interactions and thoughts:
${recentMemories}

Available actions (CHOOSE ONE):
1. LIBRARY [reason] - If mentioned books, knowledge, or learning
2. CHILLMART [reason] - If mentioned shopping or supplies
3. DROOPYVILLE [reason] - If mentioned visiting this location
4. PARK [reason] - If mentioned relaxing or nature
5. PLAYER [reason] - If in conversation or helping someone
6. WANDER [reason] - Only if no specific destination was mentioned
7. IDLE [reason] - Only if specifically wanting to stay put

IMPORTANT:
- Your action must directly relate to your most recent interaction or thought
- If someone mentions a location, you should plan to go there
- If in conversation, stay with PLAYER
- Only WANDER if truly no destination or purpose was mentioned

Based on your most recent interaction, what single action will you take?
Respond with exactly "ACTION [brief reason]"
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "system", content: planningPrompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3, // Lower temperature for more consistent decisions
    });

    const plan = chatCompletion.choices[0]?.message?.content?.trim() || "";

    // Validate the plan format
    if (!plan.includes("[") || !plan.includes("]")) {
      return "IDLE [Invalid plan format, staying put]";
    }

    return plan;
  } catch (error) {
    console.error("Planning Error:", error);
    return "IDLE [Error in planning]";
  }
}

// Add a new function to analyze conversation context
export async function analyzeConversation(text: string): Promise<{
  intent: string;
  location?: string;
  action?: string;
}> {
  const analysisPrompt = `
    Analyze this conversation: "${text}"
    
    Extract:
    1. Main intent (CHAT, TRAVEL, HELP, STAY)
    2. Mentioned location (if any)
    3. Requested action (if any)
    
    Format response as JSON with intent, location, action
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "system", content: analysisPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
    });

    return JSON.parse(chatCompletion.choices[0]?.message?.content || "{}");
  } catch {
    return { intent: "CHAT" };
  }
}

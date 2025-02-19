"use server";

import { groot_brain_log_prompt, groot_log_prompt } from "@/characterPrompts";
import { prisma } from "@/lib/db";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const globalPlacesDictionary: { [key: string]: { x: number; y: number } } = {
  "Chill-Mart": { x: 118, y: 50 },
  DroopyVille: { x: 162, y: 32 },
  "Public Library": { x: 46, y: 78 },
  // Add more places as needed
};

export async function Ai_response_log(
  prompt: string,
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
  const groot_memory = memory[0]?.log_groot?.slice(0, 2000);
  console.log(groot_memory);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            groot_log_prompt +
            `
      Your responses will have a context memory based on previous interactions with the user. 
      The memory will be in the form:
      <username>: user's query
      <response>: Groot's response.

      Based on the context, you are to write a response to the user's query.

      MEMORY CONTEXT:
      ${groot_memory}

      `,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
    });

    const response = chatCompletion.choices[0]?.message?.content || "";
    console.log(response);

    const logEntry = `
    ${username}: ${prompt}
    response: ${response}
    `;

    const existingHistory = await prisma.history.findFirst({
      where: {
        username: username,
      },
    });

    // console.log(existingHistory?.log_groot);

    if (existingHistory) {
      const updatedLog = logEntry + existingHistory.log_groot;
      await prisma.history.update({
        where: { id: existingHistory.id },
        data: { log_groot: updatedLog },
      });
    } else {
      await prisma.history.create({
        data: {
          username: username,
          log_groot: logEntry,
        },
      });
    }

    return response;
  } catch (error) {
    console.error("Ai_response Error:", error);
    return "I'm having trouble understanding right now.";
  }
}

export async function getNpcAction(username: string): Promise<string> {
  const memory = await prisma.history.findMany({
    where: {
      username: username,
    },
    select: {
      log_groot: true,
    },
    take: 1,
  });
  const groot_memory = memory[0]?.log_groot?.slice(0, 2000);
  // console.log(groot_memory);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            groot_brain_log_prompt +
            `
    [MEMORY]
    ${groot_memory}
    [/MEMORY]
        `,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    const response = chatCompletion.choices[0]?.message?.content?.trim() || "";
    console.log("NPC Decision:", response);

    const logEntry = [
      "CHILLMART",
      "DROOPYVILLE",
      "LIBRARY",
      "MART",
      "PARK",
      "PLAYER",
    ].includes(response.toUpperCase())
      ? `\n*Groot decided to go to ${response}*\n`
      : `\n*Groot decides to do ${response}*\n`;

    const existingHistory = await prisma.history.findFirst({
      where: {
        username: username,
      },
    });

    if (existingHistory) {
      const updatedLog = logEntry + existingHistory.log_groot;
      await prisma.history.update({
        where: { id: existingHistory.id },
        data: { log_groot: updatedLog },
      });
    } else {
      await prisma.history.create({
        data: {
          username: username,
          log_groot: logEntry,
        },
      });
    }

    return response.toUpperCase();
  } catch (error) {
    console.error("getNpcAction Error:", error);
    return "No Action";
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
      npcMemories = memory[0]?.log_groot?.slice(0, 2000) || "";
      personalityPrompt = groot_log_prompt;
      break;
    case "npctest":
      npcMemories = memory[0]?.log_groot?.slice(0, 2000) || "";
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

export async function generatePlan(
  username: string,
  npcId: string,
  currentLocation: string,
  reflection?: string
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
  let availableActions = "";

  // Select memories, personality, and available actions based on NPC
  switch (npcId) {
    case "npc_log":
      npcMemories = memory[0]?.log_groot?.slice(0, 2000) || "";
      personalityPrompt = groot_log_prompt;
      availableActions = `
        Available actions:
        - WANDER [reason]: Move randomly around the area
        - IDLE [reason]: Stay in place
        - PLAYER [reason]: Move towards the nearest player
        - CHILLMART [reason]: Go to the Chill-Mart
        - DROOPYVILLE [reason]: Visit Droopyville
        - LIBRARY [reason]: Go to the Library
        - PARK [reason]: Visit the Park
      `;
      break;
    case "npctest":
      npcMemories = memory[0]?.log_groot?.slice(0, 2000) || "";
      personalityPrompt = `You are a test NPC with a curious and friendly personality.
        You like to learn about the world around you and make new friends.`;
      availableActions = `
        Available actions:
        - WANDER [reason]: Move randomly around the area
        - IDLE [reason]: Stay in place
        - FOLLOW [reason]: Follow nearby players
      `;
      break;
    default:
      return "No planning available for this NPC";
  }

  const planningPrompt = `
    You are ${
      npcId == "npc_log" ? "Groot" : npcId
    } with the following personality:
    ${personalityPrompt}

    Current location: ${currentLocation}
    
    ${availableActions}

    Recent memories and interactions:
    ${npcMemories}

    ${reflection ? `Recent reflection:\n${reflection}\n` : ""}

    Based on your personality, current location, recent memories${
      reflection ? " and reflection" : ""
    }, 
    what action should you take next?
    Respond with a single action from the available actions list, followed by [reason] in brackets.
    Example: "WANDER [I want to explore this new area I haven't seen before]"
  `;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: planningPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    const plan = chatCompletion.choices[0]?.message?.content?.trim() || "";
    console.log(`${npcId}'s Plan:`, plan);

    // Store the plan in memory
    const planEntry = `\n*${
      npcId == "npc_log" ? "Groot" : npcId
    } plans to: ${plan}*\n`;
    await update_Groot_memory(planEntry, username);

    return plan;
  } catch (error) {
    console.error("Planning Error:", error);
    return `${npcId} is unsure what to do next...`;
  }
}

"use server";

import { groot_log_prompt } from "@/characterPrompts";
import { prisma } from "@/lib/db";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
      model: "llama-3.3-70b-versatile",
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

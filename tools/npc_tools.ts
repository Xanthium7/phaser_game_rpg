import { tool } from "ai";
import { z } from "zod";

const globalPlaces: { [key: string]: { x: number; y: number } } = {
  CHILLMART: { x: 107, y: 32 },
  DROOPYVILLE: { x: 168, y: 32 },
  LIBRARY: { x: 46, y: 107 },
  MART: { x: 118, y: 50 },
  PARK: { x: 36, y: 44 },
};
export const travel_tool = tool({
  description: `Travel to a new location in the game world.
    `,
  parameters: z.object({
    npcId: z.string().describe("The ID of the NPC that is travelling"),
    location: z.enum(["CHILLMART", "LIBRARY", "DROOPYVILLE", "PARK"]),
    reason: z.string().describe("Why the NPC wants to go there"),
  }),

  execute: async ({ location }) => {
    return "[GO TO " + location + "]";
  },
});

"use server";

import { generateStory, type StoryInput } from "@/ai/flows/story-and-structure-generation";

export async function generateStoryAction(input: StoryInput): Promise<{ story?: string; error?: string }> {
  try {
    // Basic validation example (can be expanded or use a library like Zod here too)
    if (!input.storyTitle || !input.protagonistName || !input.coreConflict) {
      return { error: "Missing required fields: Story Title, Protagonist Name, and Core Conflict are necessary." };
    }
    
    const result = await generateStory(input);
    if (result && result.story) {
      return { story: result.story };
    } else {
      return { error: "Failed to generate story. The AI did not return valid content." };
    }
  } catch (e) {
    console.error("Error generating story:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during story generation.";
    return { error: `Error generating story: ${errorMessage}` };
  }
}
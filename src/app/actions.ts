"use server";

import { generateStoryStructure, type StoryStructureInput, type StoryStructureOutput, type StoryNodeStructure } from "@/ai/flows/generate-story-structure";
import { generateNodeContent, type NodeContentInput } from "@/ai/flows/generate-node-content";

export interface FullStoryGenerationInput {
  structure: StoryStructureOutput;
  originalStoryInput: StoryStructureInput;
}

// Action to generate the initial story structure/outline
export async function generateStoryStructureAction(input: StoryStructureInput): Promise<{ structure?: StoryStructureOutput; error?: string }> {
  try {
    if (!input.storyTitle || !input.protagonistName || !input.coreConflict) {
      return { error: "Missing required fields: Story Title, Protagonist Name, and Core Conflict are necessary." };
    }
    const result = await generateStoryStructure(input);
    if (result && result.nodes && result.startNodeId) {
      return { structure: result };
    } else {
      return { error: "Failed to generate story structure. The AI did not return valid content." };
    }
  } catch (e) {
    console.error("Error generating story structure:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during structure generation.";
    return { error: `Error generating story structure: ${errorMessage}` };
  }
}

// Action for generating the full story content based on the approved structure and original input
export async function generateFullStoryAction(
  input: FullStoryGenerationInput
): Promise<{ success?: boolean; error?: string; fullStoryContent?: Record<string, string> }> {
  console.log("generateFullStoryAction called with structure and original input.");
  const { structure, originalStoryInput } = input;
  const generatedContents: Record<string, string> = {};
  let hasErrors = false;

  try {
    for (const nodeStruct of structure.nodes) {
      console.log(`Generating content for node: ${nodeStruct.id} - ${nodeStruct.title}`);
      const nodeInput: NodeContentInput = {
        storyContext: originalStoryInput,
        nodeStructure: nodeStruct,
      };
      
      // Introduce a small delay between calls to avoid overwhelming the API quickly (optional)
      // await new Promise(resolve => setTimeout(resolve, 200)); 

      const nodeContentResult = await generateNodeContent(nodeInput);

      if (nodeContentResult && nodeContentResult.content) {
        generatedContents[nodeStruct.id] = nodeContentResult.content;
      } else {
        console.error(`Failed to generate content for node ${nodeStruct.id}.`);
        generatedContents[nodeStruct.id] = `[Content generation failed for this section. Original summary: ${nodeStruct.summary}]`; // Placeholder for failed nodes
        hasErrors = true; // Flag that at least one node failed
      }
    }

    if (Object.keys(generatedContents).length === 0) {
        return { error: "No content was generated for any story node." };
    }
    
    // The generatedContents (Record<string, string>) will be stored.
    // The story parser will later combine this with the structure.
    // This action is called on the server, so it can't directly use sessionStorage.
    // The page calling this action (`review-structure/page.tsx`) will handle sessionStorage.

    console.log("Full story content generation process complete.");
    if (hasErrors) {
        console.warn("Some nodes failed to generate content properly.");
         return { success: true, fullStoryContent: generatedContents, error: "Partial success: Some story sections might be missing or incomplete." };
    }

    return { success: true, fullStoryContent: generatedContents };

  } catch (e) {
    console.error("Critical error during full story generation process:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during full story generation.";
    return { error: `Error generating full story: ${errorMessage}` };
  }
}

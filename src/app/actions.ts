// @ts-nocheck
// TODO: Fix types
"use server";

import { generateStoryStructure, type StoryStructureInput, type StoryStructureOutput, type StoryNodeStructure } from "@/ai/flows/generate-story-structure";
import { generateNodeContent, type NodeContentInput, type NodeContentOutput } from "@/ai/flows/generate-node-content";

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

export interface NodesBatchResult {
  batchContent?: Record<string, string>; // nodeId -> content
  error?: string; // General error for the batch or summary of node errors
  // nodeErrors?: Record<string, string>; // Optional: detailed errors per node
}

// New action to generate content for a batch of nodes
export async function generateNodesBatchAction(
  nodes: StoryNodeStructure[],
  storyContext: StoryStructureInput
): Promise<NodesBatchResult> {
  const batchContent: Record<string, string> = {};
  const nodeErrorsMessages: string[] = [];
  let overallBatchError: string | undefined;

  console.log(`Generating content for batch of ${nodes.length} nodes.`);

  try {
    for (const nodeStruct of nodes) {
      const nodeInput: NodeContentInput = {
        storyContext: storyContext,
        nodeStructure: nodeStruct,
      };
      
      // Small delay to potentially avoid hitting rate limits very rapidly.
      // Genkit or the underlying model API might have its own rate limiting.
      // Adjust or remove if not necessary or if it slows down too much.
      await new Promise(resolve => setTimeout(resolve, 300)); 

      try {
        const nodeContentResult = await generateNodeContent(nodeInput);
        if (nodeContentResult && nodeContentResult.content) {
          batchContent[nodeStruct.id] = nodeContentResult.content;
        } else {
          const message = `No content returned for node ${nodeStruct.id}.`;
          console.error(message, "AI Output:", nodeContentResult);
          nodeErrorsMessages.push(`Node ${nodeStruct.id}: ${message}`);
          batchContent[nodeStruct.id] = `[Content generation failed: No content from AI. Original summary: ${nodeStruct.summary}]`;
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error generating content for node.";
        console.error(`Error generating content for node ${nodeStruct.id}:`, e);
        nodeErrorsMessages.push(`Node ${nodeStruct.id}: ${errorMsg}`);
        batchContent[nodeStruct.id] = `[Content generation critically failed: ${errorMsg}. Original summary: ${nodeStruct.summary}]`;
      }
    }
  } catch (e) {
    overallBatchError = e instanceof Error ? e.message : "An unknown error occurred during batch processing internals.";
    console.error("Critical error during nodes batch processing (outer loop):", e);
  }

  let finalErrorSummary = overallBatchError;
  if (nodeErrorsMessages.length > 0) {
    const individualErrors = nodeErrorsMessages.join('; ');
    if (finalErrorSummary) {
      finalErrorSummary += ` Additionally, some nodes failed: ${individualErrors}`;
    } else {
      finalErrorSummary = `One or more nodes in the batch failed to generate: ${individualErrors}`;
    }
  }
  
  console.log(`Batch generation complete. Content items: ${Object.keys(batchContent).length}, Errors: ${finalErrorSummary || 'None'}`);
  return { batchContent, error: finalErrorSummary };
}


// This action is no longer called directly by the client for full story generation.
// The client (`review-structure/page.tsx`) will now loop and call `generateNodesBatchAction`.
// Keeping it here for reference or potential future server-side orchestration if needed.
export async function generateFullStoryAction(
  input: FullStoryGenerationInput
): Promise<{ success?: boolean; error?: string; fullStoryContent?: Record<string, string> }> {
  console.warn("generateFullStoryAction is deprecated for client use. Client should use batching.");
  const { structure, originalStoryInput } = input;
  const generatedContents: Record<string, string> = {};
  let hasErrors = false;

  try {
    for (const nodeStruct of structure.nodes) {
      const nodeInput: NodeContentInput = {
        storyContext: originalStoryInput,
        nodeStructure: nodeStruct,
      };
      await new Promise(resolve => setTimeout(resolve, 200));
      const nodeContentResult = await generateNodeContent(nodeInput);

      if (nodeContentResult && nodeContentResult.content) {
        generatedContents[nodeStruct.id] = nodeContentResult.content;
      } else {
        generatedContents[nodeStruct.id] = `[Content generation failed. Summary: ${nodeStruct.summary}]`;
        hasErrors = true;
      }
    }
    if (hasErrors) {
      return { success: true, fullStoryContent: generatedContents, error: "Partial success: Some sections incomplete." };
    }
    return { success: true, fullStoryContent: generatedContents };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error.";
    return { error: `Error generating full story: ${errorMessage}` };
  }
}

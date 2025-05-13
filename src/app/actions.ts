"use server";

import { generateStoryStructure, type StoryStructureInput, type StoryStructureOutput } from "@/ai/flows/generate-story-structure";
// Placeholder for the next step's flow
// import { generateNodeContent, type NodeContentInput } from "@/ai/flows/generate-node-content";

// Action to generate the initial story structure/outline
export async function generateStoryStructureAction(input: StoryStructureInput): Promise<{ structure?: StoryStructureOutput; error?: string }> {
  try {
    // Basic validation example
    if (!input.storyTitle || !input.protagonistName || !input.coreConflict) {
      return { error: "Missing required fields: Story Title, Protagonist Name, and Core Conflict are necessary." };
    }

    const result = await generateStoryStructure(input);

    if (result && result.nodes && result.startNodeId) {
      // Further validation can be added here if needed (e.g., check structure validity)
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

// Placeholder Action for generating the full story content based on the approved structure
export async function generateFullStoryAction(structure: StoryStructureOutput): Promise<{ success?: boolean; error?: string; story?: Record<string, string> /* Temp return */ }> {
  console.log("generateFullStoryAction called with structure:", structure);
  // --- THIS IS WHERE THE NODE-BY-NODE GENERATION LOGIC WILL GO ---
  // 1. Iterate through structure.nodes
  // 2. For each node, call a new `generateNodeContentFlow` (to be created)
  //    - Pass node details (id, title, summary) and maybe original input context.
  // 3. Collect the generated content for each node.
  // 4. Store the complete story content (e.g., in session storage or a database).
  // 5. Return success/failure and maybe the generated story map.

  // --- Placeholder Implementation ---
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work

  // Simulate generating content for each node (replace with actual AI calls later)
  const generatedStoryContent: Record<string, string> = {};
  for (const node of structure.nodes) {
      generatedStoryContent[node.id] = `--- Content for ${node.title} ---\n${node.summary}\n\n[Full narrative content for node ${node.id} will be generated here.]\n\n${
        node.isEnding
          ? "--- THE END ---"
          : node.decisions?.map((d, i) => `${i + 1}. ${d.text} (-> ${d.nextNodeId})`).join('\n') ?? ''
      }`;
  }

  // Simulate storing the story (replace with actual storage later)
   try {
     sessionStorage.setItem("tieDyedTales_fullStoryContent", JSON.stringify(generatedStoryContent));
     sessionStorage.setItem("tieDyedTales_startNodeId", structure.startNodeId); // Store start node too
   } catch (e) {
      // Handle sessionStorage not being available (e.g., during SSR part of action?)
      console.warn("SessionStorage not available during generateFullStoryAction placeholder.");
      // In a real scenario, might need a different storage mechanism if calling from contexts without sessionStorage.
   }


  console.log("Placeholder: Full story generation complete (simulated).");
  return { success: true, story: generatedStoryContent }; // Indicate success
  // --- End Placeholder ---

  // Example error return:
  // return { error: "Full story generation not yet implemented." };
}
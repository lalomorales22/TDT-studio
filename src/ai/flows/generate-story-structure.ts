'use server';

/**
 * @fileOverview Generates a structured outline for a Choose Your Own Adventure story.
 *
 * - generateStoryStructure - A function that generates the story structure.
 * - StoryStructureInput - The input type (same basic details as before).
 * - StoryStructureOutput - The output type (a structured JSON representation of the story outline).
 * - StoryNodeStructure - Type defining the structure of a single node in the outline.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Input schema remains largely the same, focusing on the initial story concept
const StoryStructureInputSchema = z.object({
  storyTitle: z.string().describe('The title of the story.'),
  genre: z.string().describe('The genre of the story (e.g., Fantasy, Sci-Fi, Mystery, Horror, Comedy).'),
  targetAudience: z.string().describe('The target audience for the story (e.g., Kids (8-12), Teens (13-18), Adults).'),
  protagonistName: z.string().describe('The name of the protagonist.'),
  protagonistDescription: z.string().describe('A brief description of the protagonist (personality, skills, background).'),
  keyMotivation: z.string().describe('The protagonist’s key motivation (e.g., To save their village, to find treasure, to escape a threat).'),
  primaryLocation: z.string().describe('The primary location(s) of the story (e.g., An ancient forest, a futuristic city, a haunted mansion).'),
  atmosphereMood: z.string().describe('The atmosphere/mood of the story (e.g., Mysterious, exciting, eerie, lighthearted).'),
  keyFeatures: z.string().describe('Key features of the setting (e.g., A hidden temple, a bustling spaceport, secret passages).'),
  supportingCharacterName: z.string().optional().describe('Name of supporting character (optional).'),
  supportingCharacterRole: z.string().optional().describe('Role/relationship to protagonist (optional).'),
  supportingCharacterDescription: z.string().optional().describe('Brief description of supporting character (optional).'),
  keyItemName: z.string().optional().describe('Name of key item/object (optional).'),
  keyItemSignificance: z.string().optional().describe('Significance/powers of key item (optional).'),
  coreConflict: z.string().describe('The core conflict/inciting incident (e.g., A dark shadow falls over the land, a strange signal is received, a valuable item is stolen).'),
  desiredStoryLength: z.enum(['Short', 'Medium', 'Long']).describe('Desired story length (Short, Medium, Long). This influences the number of nodes and branches.'),
  desiredEndings: z.string().describe('Desired number of distinct endings (e.g., 2, 3, 4+).'),
  writingStyle: z.string().describe('The desired writing style for the final story (e.g., Descriptive and immersive, fast-paced and action-oriented, witty and humorous).'),
});
export type StoryStructureInput = z.infer<typeof StoryStructureInputSchema>;


// Schema for a single decision within a node structure
const DecisionStructureSchema = z.object({
  text: z.string().describe('The brief text presented to the reader for this choice.'),
  nextNodeId: z.string().describe('The unique ID of the node this decision leads to.'),
});

// Schema for a single node within the story structure
const StoryNodeStructureSchema = z.object({
    id: z.string().describe('A unique identifier for this node (e.g., "start_page", "forest_path_A"). Use snake_case.'),
    title: z.string().describe('A brief, descriptive title for this story segment.'),
    summary: z.string().describe('A short (1-2 sentence) summary of what happens in this node. This will guide the later content generation.'),
    decisions: z.array(DecisionStructureSchema).optional().describe('An array of possible decisions the player can make at the end of this node. Omit or leave empty if this is an ending node.'),
    isEnding: z.boolean().describe('Set to true if this node represents one of the story endings, otherwise false.'),
});
export type StoryNodeStructure = z.infer<typeof StoryNodeStructureSchema>;


// Output schema is an array of story node structures, representing the entire outline
const StoryStructureOutputSchema = z.object({
  nodes: z.array(StoryNodeStructureSchema).describe('An array containing the structure for all nodes in the story.'),
  startNodeId: z.string().describe('The ID of the starting node for the story.'),
});
export type StoryStructureOutput = z.infer<typeof StoryStructureOutputSchema>;


// Exported function to call the flow
export async function generateStoryStructure(input: StoryStructureInput): Promise<StoryStructureOutput> {
  console.log("Generating story structure with input:", input);
  const result = await generateStoryStructureFlow(input);
  console.log("Story structure generation result:", result);
  return result;
}


const storyStructurePrompt = ai.definePrompt({
  name: 'storyStructurePrompt',
  input: {schema: StoryStructureInputSchema},
  output: {schema: StoryStructureOutputSchema},
  prompt: `You are an AI expert in designing interactive "Choose Your Own Adventure" story structures. Your task is to take the user's initial concept and generate a detailed, branching OUTLINE of the story, formatted as a JSON object.

**DO NOT WRITE THE FULL STORY CONTENT.** Focus *only* on the structure: node IDs, titles, brief summaries, decisions, and identifying ending nodes.

**User's Story Concept:**
*   Story Title: {{{storyTitle}}}
*   Genre: {{{genre}}}
*   Target Audience: {{{targetAudience}}}
*   Protagonist Name: {{{protagonistName}}}
*   Protagonist Description: {{{protagonistDescription}}}
*   Key Motivation: {{{keyMotivation}}}
*   Primary Location(s): {{{primaryLocation}}}
*   Atmosphere/Mood: {{{atmosphereMood}}}
*   Key Features: {{{keyFeatures}}}
*   Supporting Character Name: {{{supportingCharacterName}}}
*   Supporting Character Role: {{{supportingCharacterRole}}}
*   Supporting Character Description: {{{supportingCharacterDescription}}}
*   Key Item Name: {{{keyItemName}}}
*   Key Item Significance: {{{keyItemSignificance}}}
*   Core Conflict/Inciting Incident: {{{coreConflict}}}
*   Desired Story Length: {{{desiredStoryLength}}} (Interpret 'Short' as ~5-10 nodes, 'Medium' as ~15-25 nodes, 'Long' as ~30+ nodes)
*   Desired Number of Distinct Endings: {{{desiredEndings}}}
*   Writing Style (for later): {{{writingStyle}}}

**Instructions:**

1.  **Elaborate:** Expand on the user's ideas to create a compelling branching narrative structure. Think about plot points, rising action, climax possibilities, and multiple resolutions based on choices.
2.  **Define Nodes:** Break the story down into logical segments or "nodes." Each node represents a specific scene, situation, or point of decision.
3.  **Assign Unique IDs:** Give each node a unique, descriptive ID using snake_case (e.g., \`cave_entrance\`, \`dragon_lair_choice\`, \`escape_route_west\`).
4.  **Create Titles:** Write a brief, engaging title for each node (e.g., "The Whispering Cave Mouth," "Confronting the Guard Captain," "A Hero's Welcome").
5.  **Write Summaries:** For each node, provide a concise 1-2 sentence summary describing the key event or situation of that segment. This summary is crucial for guiding the later content generation phase. Example: "The protagonist discovers a hidden map clutched in the hand of a fallen explorer. Examining it reveals two potential paths forward."
6.  **Define Decisions:** For nodes that are *not* endings, define the choices the player can make. Each decision should have:
    *   \`text\`: The brief choice presented to the player (e.g., "Follow the mountain path," "Investigate the strange noise").
    *   \`nextNodeId\`: The ID of the node that this choice leads to. Ensure this ID exists within your generated structure.
7.  **Identify Endings:** Mark nodes that conclude a storyline branch by setting \`isEnding\` to \`true\`. These nodes should not have any decisions. Ensure you create at least the number of distinct endings requested by the user.
8.  **Designate Start Node:** Choose one node ID to be the starting point of the adventure and specify it in the \`startNodeId\` field of the output object. This MUST be the ID of one of the nodes in the \`nodes\` array.
9.  **Output Format:** Structure the entire output as a single JSON object conforming to the \`StoryStructureOutputSchema\`. The main part will be the \`nodes\` array, containing objects for each node as defined by \`StoryNodeStructureSchema\`.

**Example Node Structure (within the JSON \`nodes\` array):**
\`\`\`json
{
  "id": "forest_crossroads",
  "title": "Crossroads in the Woods",
  "summary": "The protagonist reaches a crossroads. A weathered signpost points north towards the mountains and east towards a dark swamp.",
  "decisions": [
    { "text": "Head north towards the mountains.", "nextNodeId": "mountain_path_start" },
    { "text": "Venture east into the swamp.", "nextNodeId": "swamp_entrance" }
  ],
  "isEnding": false
}
\`\`\`
**Example Ending Node Structure:**
\`\`\`json
{
  "id": "treasure_found_ending",
  "title": "Victory and Riches!",
  "summary": "The protagonist successfully navigates the final trap and discovers the legendary treasure vault, securing their goal.",
  "isEnding": true
}
\`\`\`

**Final Output MUST be a valid JSON object matching the specified schema.** Ensure all \`nextNodeId\` values correspond to actual \`id\` values within the \`nodes\` array. Provide the complete structure within the \`nodes\` array and specify the \`startNodeId\`.
`,
});

const generateStoryStructureFlow = ai.defineFlow(
  {
    name: 'generateStoryStructureFlow',
    inputSchema: StoryStructureInputSchema,
    outputSchema: StoryStructureOutputSchema,
    // Add safety settings if needed, e.g., to allow potentially darker themes if requested genre is Horror
    // config: {
    //   safetySettings: [
    //     { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    //     // ... other settings
    //   ],
    // },
  },
  async (input) => {
    const { output } = await storyStructurePrompt(input);
    // Basic validation: Check if output exists and has a nodes array and a startNodeId
    if (!output || !Array.isArray(output.nodes) || output.nodes.length === 0 || !output.startNodeId) {
        console.error("Invalid structure generated:", output);
        throw new Error("AI failed to generate a valid story structure. Output might be empty or malformed.");
    }
    // Validate that startNodeId exists in the nodes array
    if (!output.nodes.some(node => node.id === output.startNodeId)) {
        console.error(`Generated startNodeId "${output.startNodeId}" not found in generated nodes.`);
        // Attempt recovery: Use the first node ID if available
        const firstNodeId = output.nodes[0]?.id;
        if (firstNodeId) {
            console.warn(`Attempting to use the first node "${firstNodeId}" as startNodeId.`);
            output.startNodeId = firstNodeId;
        } else {
            throw new Error("AI failed to generate a valid story structure. The start node ID is missing or invalid, and no nodes were found.");
        }
    }

    // Optional: Add more validation here (e.g., check if all nextNodeIds point to valid nodes)

    return output;
  }
);

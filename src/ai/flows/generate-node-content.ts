'use server';
/**
 * @fileOverview Generates the narrative content for a single node in a Choose Your Own Adventure story.
 *
 * - generateNodeContent - A function that generates the content for a story node.
 * - NodeContentInput - The input type for the generateNodeContent function.
 * - NodeContentOutput - The return type for the generateNodeContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { StoryStructureInput, StoryNodeStructure as StoryNodeStructureType } from './generate-story-structure'; // Assuming types are exported

// Define Zod schema for StoryNodeStructure if not directly importable or to avoid circular deps
// This should ideally match the one in generate-story-structure.ts
const DecisionStructureSchema = z.object({
  text: z.string().describe('The brief text presented to the reader for this choice.'),
  nextNodeId: z.string().describe('The unique ID of the node this decision leads to.'),
});

const StoryNodeStructureSchema = z.object({
    id: z.string().describe('A unique identifier for this node (e.g., "start_page", "forest_path_A").'),
    title: z.string().describe('A brief, descriptive title for this story segment.'),
    summary: z.string().describe('A short (1-2 sentence) summary of what happens in this node. This will guide the later content generation.'),
    decisions: z.array(DecisionStructureSchema).optional().describe('An array of possible decisions the player can make at the end of this node. Omit or leave empty if this is an ending node.'),
    isEnding: z.boolean().describe('Set to true if this node represents one of the story endings, otherwise false.'),
});


const NodeContentInputSchema = z.object({
  storyContext: z.custom<StoryStructureInput>(), // Using z.custom as StoryStructureInput is complex; ensure it's validated upstream
  nodeStructure: StoryNodeStructureSchema,
});
export type NodeContentInput = z.infer<typeof NodeContentInputSchema>;

const NodeContentOutputSchema = z.object({
  nodeId: z.string(),
  content: z.string().describe("The fully generated narrative content for the story node. This should be the story text itself, without any extra formatting like 'Node ID:' or 'Title:'. If it's an ending, it's the concluding text. If it has decisions, it's the text leading up to those choices."),
});
export type NodeContentOutput = z.infer<typeof NodeContentOutputSchema>;

export async function generateNodeContent(input: NodeContentInput): Promise<NodeContentOutput> {
  // console.log("Generating node content for ID:", input.nodeStructure.id, "with context:", input.storyContext);
  const result = await generateNodeContentFlow(input);
  // console.log("Node content generation result:", result);
  return result;
}

const nodeContentPrompt = ai.definePrompt({
  name: 'nodeContentPrompt',
  input: {schema: NodeContentInputSchema},
  output: {schema: NodeContentOutputSchema},
  prompt: `You are a master storyteller AI. Your task is to write the full narrative content for a specific segment (node) of a "Choose Your Own Adventure" story, based on its structural details and the overall story context.

**Overall Story Context:**
*   Story Title: {{{storyContext.storyTitle}}}
*   Genre: {{{storyContext.genre}}}
*   Target Audience: {{{storyContext.targetAudience}}}
*   Protagonist: {{{storyContext.protagonistName}}} - {{{storyContext.protagonistDescription}}}
*   Setting: {{{storyContext.primaryLocation}}} - {{{storyContext.atmosphereMood}}}
*   Writing Style: {{{storyContext.writingStyle}}}

**Current Story Node Details:**
*   Node ID: {{{nodeStructure.id}}}
*   Node Title: {{{nodeStructure.title}}} (Use this as inspiration, or implicitly as a chapter heading, but DO NOT repeat "Title:" in your output)
*   Node Summary (Guideline): {{{nodeStructure.summary}}}
*   Is this an Ending Node? {{{nodeStructure.isEnding}}}
{{#if nodeStructure.decisions}}
*   Decisions Leading From This Node (for narrative flow, DO NOT list them explicitly):
    {{#each nodeStructure.decisions}}
    - "{{this.text}}" (leads to node: {{this.nextNodeId}})
    {{/each}}
{{/if}}

**Instructions:**

1.  **Write the Narrative:** Based on the node's title and summary, and keeping the overall story context and writing style in mind, write the engaging narrative for this specific story segment.
2.  **Integrate Decisions (If Any):** If this node has decisions, your narrative should naturally lead the reader to a point where these choices would be presented. **DO NOT explicitly list the decisions in your output (e.g., "1. Go left, 2. Go right").** The user interface will handle displaying the decision options based on the \`nodeStructure.decisions\` provided separately. Your text should just be the story part.
3.  **Handle Endings:** If \`nodeStructure.isEnding\` is true, write a fitting conclusion for this branch of the story.
4.  **Output ONLY the Story Content:** Your response for the 'content' field should be *only* the narrative text for this node. Do not include "Node ID:", "Title:", "Summary:", or any explicit list of decisions. Just the story.

Example for a non-ending node:
"Elara cautiously steps into the Whispering Cave. The air grows cold, and a faint dripping sound echoes from the darkness ahead. She can barely make out two passages. One seems to descend steeply, while the other continues level but into an even narrower opening. The scent of damp earth and something else... something metallic, hangs in the air."

Example for an ending node:
"With the Sunstone secured, Elara returned to her village. The gem's light bathed her sibling, and slowly, color returned to their cheeks. The cult was defeated, peace restored, and Elara, once a rogue seeking answers, was now hailed as a hero. Her adventures were far from over, but for now, she had earned her rest."

**Provide the output as a JSON object matching the \`NodeContentOutputSchema\`, with the 'nodeId' and the generated 'content'.**
`,
});

const generateNodeContentFlow = ai.defineFlow(
  {
    name: 'generateNodeContentFlow',
    inputSchema: NodeContentInputSchema,
    outputSchema: NodeContentOutputSchema,
    // Consider safety settings based on genre if necessary
    // config: {
    //   safetySettings: [...]
    // },
  },
  async (input) => {
    const { output } = await nodeContentPrompt(input);
    if (!output || !output.content) {
      console.error("AI failed to generate valid node content for node ID:", input.nodeStructure.id, "Output:", output);
      // Fallback content to prevent total failure, but indicate an issue
      return {
        nodeId: input.nodeStructure.id,
        content: `[Error generating content for this section. Summary: ${input.nodeStructure.summary}]`
      };
    }
    // Ensure the output includes the nodeId for consistency, though the prompt also requests it.
    return {
      nodeId: input.nodeStructure.id, // Ensure this matches the input node's ID
      content: output.content,
    };
  }
);

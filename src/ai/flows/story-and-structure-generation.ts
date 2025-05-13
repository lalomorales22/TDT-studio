'use server';

/**
 * @fileOverview A choose your own adventure story generator flow.
 *
 * - generateStory - A function that handles the story generation process.
 * - StoryInput - The input type for the generateStory function.
 * - StoryOutput - The return type for the generateStory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StoryInputSchema = z.object({
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
  desiredStoryLength: z.enum(['Short', 'Medium', 'Long']).describe('Desired story length (Short, Medium, Long). Note: More nodes mean more branching possibilities.'),
  desiredEndings: z.string().describe('Desired number of distinct endings (e.g., 2, 3, 4+).'),
  writingStyle: z.string().describe('The writing style (e.g., Descriptive and immersive, fast-paced and action-oriented, witty and humorous).'),
});
export type StoryInput = z.infer<typeof StoryInputSchema>;

const StoryOutputSchema = z.object({
  story: z.string().describe('The complete Choose Your Own Adventure story, with structure and content.'),
});
export type StoryOutput = z.infer<typeof StoryOutputSchema>;

export async function generateStory(input: StoryInput): Promise<StoryOutput> {
  return generateStoryFlow(input);
}

const storyPrompt = ai.definePrompt({
  name: 'storyPrompt',
  input: {schema: StoryInputSchema},
  output: {schema: StoryOutputSchema},
  prompt: `You are an AI expert in creating "Choose Your Own Adventure" style interactive stories. Your primary goal is to generate a complete, well-structured story in plain text format based on the user's inputs.

**CRITICAL FORMATTING REQUIREMENTS:**
The entire output MUST be a single string.
This string will contain multiple story segments.
EVERY segment MUST begin with the exact phrase "Node ID:" followed by its unique identifier, then a newline. For example:
"Node ID: start_page"
"Node ID: forest_path_A"
Do NOT include any introductory text, preamble, or explanation before the first "Node ID:" line. The very first line of your output MUST be "Node ID: ...".
Each segment MUST have a "Brief Title:" on a new line immediately after its "Node ID:" line.
If a segment has decisions, they MUST be clearly formatted as specified below.
If a segment is an ending, it MUST be clearly marked as specified below.

Input Section:
Story Title: {{{storyTitle}}}
Genre: {{{genre}}}
Target Audience: {{{targetAudience}}}

Protagonist:
Name: {{{protagonistName}}}
Description: {{{protagonistDescription}}}
Key Motivation: {{{keyMotivation}}}

Setting:
Primary Location(s): {{{primaryLocation}}}
Atmosphere/Mood: {{{atmosphereMood}}}
Key Features: {{{keyFeatures}}}

Supporting Character (Optional):
Name: {{{supportingCharacterName}}}
Role/Relationship to Protagonist: {{{supportingCharacterRole}}}
Description: {{{supportingCharacterDescription}}}

Key Item/Object (Optional):
Name: {{{keyItemName}}}
Significance/Powers: {{{keyItemSignificance}}}

Core Conflict/Inciting Incident: {{{coreConflict}}}

Desired Story Length: {{{desiredStoryLength}}}
Desired Number of Distinct Endings: {{{desiredEndings}}}
Writing Style: {{{writingStyle}}}

AI Instruction:
Based on the inputs above, generate a detailed branching narrative.

For EACH segment of the story:
1.  **Node ID**: Start with "Node ID: [unique_node_id]" on its own line. This is MANDATORY for every segment. Example: \`Node ID: forest_encounter_1\`
2.  **Brief Title**: On the NEXT line, provide "Brief Title: [Segment Title]". This is MANDATORY for every segment. Example: \`Brief Title: A Shadow in the Trees\`
3.  **Segment Content**: On the lines following the title, write the narrative for this segment (one or more paragraphs). Describe the scene, actions, dialogue, and atmosphere.
4.  **Decisions (if applicable)**: If the segment leads to choices:
    *   After the segment content, clearly present the decision options to the reader.
    *   Each option MUST be formatted on its own line like: "- [Decision Text] Go to page [Next_Node_ID]" or "1. [Decision Text] Go to page [Next_Node_ID]".
    *   Example of decision section:
        - You decide to investigate the strange noise. Go to page forest_investigate
        - You choose to ignore it and continue on the path. Go to page forest_path_continue
5.  **Ending (if applicable)**: If this segment is an ending:
    *   After the narrative content, write "Ending:" on its own line.
    *   Then, on subsequent lines, provide a concluding paragraph describing the final outcome.

Overall Story Structure Requirements:
*   The story MUST start with a node (e.g., \`Node ID: start_page\`). This will be the first segment in your output.
*   Include multiple decision points that lead to different paths.
*   Ensure the story includes at least the specified number of distinct endings.
*   Maintain logical connections between segments based on decisions.
*   The writing style should match the user's request.
*   Maintain consistency with characters, setting, and items.

**Example of a Single Story Segment Output:**
Node ID: cave_entrance
Brief Title: The Dark Cave Mouth
You stand before a gaping cave entrance. A chilling wind howls from within, carrying faint whispers. The air is heavy with the scent of damp earth and something else... something ancient and unsettling. Your torch flickers, casting dancing shadows on the jagged rock face.
- Enter the cave. Go to page cave_explore_depths
- Turn back and seek another path. Go to page forest_retreat

**Example of an Ending Segment Output:**
Node ID: treasure_found_ending
Brief Title: Victory and Riches!
After navigating the treacherous traps, you finally reach the heart of the ancient temple. Before you lies a vast chamber filled with glittering gold, jewels, and ancient artifacts. You've found the legendary treasure! Your name will be sung by bards for generations to come.
Ending:
You return to your village a hero, your bravery and wit having secured a prosperous future for your people. The quest was perilous, but the rewards were beyond imagination.

Remember: Adherence to the "Node ID:", "Brief Title:", decision, and ending formats is CRITICAL for the story to be usable. The entire output must be one continuous block of text consisting of these structured segments.
`,
});

const generateStoryFlow = ai.defineFlow(
  {
    name: 'generateStoryFlow',
    inputSchema: StoryInputSchema,
    outputSchema: StoryOutputSchema,
  },
  async input => {
    const {output} = await storyPrompt(input);
    return output!;
  }
);

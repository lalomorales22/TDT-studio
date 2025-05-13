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
  prompt: `You are an AI expert in creating "Choose Your Own Adventure" style interactive stories. Using the provided inputs, generate a detailed branching narrative structure and content.

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
Generate a detailed branching narrative structure for a 'Choose Your Own Adventure' story. Represent this structure as a hierarchical outline.
Each node in the structure represents a distinct segment or 'page' of the story. For each node, provide:
Node ID: A unique identifier (e.g., page_1, forest_path_A, city_square_decision).
Brief Title: A short descriptive title for the segment (e.g., The Journey Begins, Fork in the Path, Encounter in the Alley).
Segment Summary: A 1-3 sentence summary of the key events or description of the scene for this segment.
Decision(s) and Outcomes: If this segment requires a reader decision, clearly list the options available to the reader. For each option, specify the Node ID of the next segment the reader will go to if they choose that option. If a segment is an ending, state 'Ending' and briefly describe the outcome.

Ensure the structure includes:
A clear starting node (e.g., start_page).
Multiple decision points that lead to different paths.
At least the specified number of distinct endings.
Paths that vary in length and potential outcomes.
Logical connections between segments based on decisions.

Using the narrative structure and the initial story inputs, write the full narrative content for each segment (Node ID) in the structure.
For each Node ID from the structure:
Write the story segment's narrative content. This should be a paragraph or more, describing the scene, actions, dialogue, and atmosphere based on the Segment Summary.
At the end of the segment, clearly present the decision options to the reader, exactly as outlined in the structure. Phrase the options naturally within the narrative or clearly list them (e.g., 'Do you choose to [Option A]? Go to page [Node ID]. Or do you [Option B]? Go to page [Node ID].'). Use the Node IDs as the 'page numbers' the reader goes to.
Ensure the writing style matches the user's request.
Maintain consistency with the protagonist, supporting characters, setting, and items defined in the initial inputs.
If a segment is an 'Ending' node, write a concluding paragraph describing the final outcome.
Present the output with each segment clearly labeled by its Node ID.
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

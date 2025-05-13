// Represents a decision within a parsed story node
export interface StoryDecision {
  text: string;
  nextNodeId: string;
}

// Represents the data for a single parsed story node ready for display
export interface StoryNodeData {
  id: string;
  title?: string; // Title extracted or generated during parsing
  rawContent: string; // The main narrative text parsed for this node
  decisions: StoryDecision[]; // Parsed decisions for this node
  isEnding: boolean; // Whether this node was identified as an ending
  endingText?: string; // Specific text for the ending, if available
}

// Represents the fully parsed story, mapping node IDs to their data
export type ParsedStory = Map<string, StoryNodeData>;

// --- Types related to the AI-generated Structure ---
// These types mirror the Zod schemas in generate-story-structure.ts

export interface DecisionStructure {
  text: string;
  nextNodeId: string;
}

export interface StoryNodeStructure {
    id: string;
    title: string;
    summary: string;
    decisions?: DecisionStructure[];
    isEnding: boolean;
}

export interface StoryStructureOutput {
  nodes: StoryNodeStructure[];
  startNodeId: string;
}
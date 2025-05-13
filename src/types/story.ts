export interface StoryDecision {
  text: string;
  nextNodeId: string;
}

export interface StoryNodeData {
  id: string;
  title?: string; 
  rawContent: string;
  decisions: StoryDecision[];
  isEnding: boolean;
  endingText?: string;
}

export type ParsedStory = Map<string, StoryNodeData>;
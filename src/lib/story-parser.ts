import type { StoryNodeData, StoryDecision, ParsedStory } from '@/types/story';

export function parseStory(fullStoryText: string): { storyMap: ParsedStory; startNodeId: string | null } {
  const storyMap: ParsedStory = new Map();
  let startNodeId: string | null = null;

  if (!fullStoryText || typeof fullStoryText !== 'string') {
    console.error("Invalid story text input for parsing.");
    return { storyMap, startNodeId };
  }

  // Split story into segments based on "Node ID: "
  // Adding a newline before the first "Node ID: " if it's not there to standardize splitting.
  const normalizedText = fullStoryText.startsWith("Node ID: ") ? `\n${fullStoryText}` : fullStoryText;
  const segments = normalizedText.split(/\nNode ID:\s*/).filter(segment => segment.trim() !== "");

  for (const segment of segments) {
    const lines = segment.split('\n');
    const idLine = lines.shift();
    if (!idLine) continue;

    const id = idLine.trim();
    if (!startNodeId) {
      startNodeId = id;
    }

    let rawContent = "";
    const decisions: StoryDecision[] = [];
    let isEnding = false;
    let endingText = "";
    
    // Try to find "Brief Title:"
    let title: string | undefined;
    const titleMatch = segment.match(/Brief Title:\s*([^\n]+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      // Fallback: Capitalize and space out Node ID
      title = id.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }

    // Heuristic: Content is everything after ID (and optional title/summary) until decision prompts or "Ending:"
    // This is a simplified parser. A more robust one would handle variations in AI output.
    
    // Find where content might end / decisions begin
    let contentEndIndex = lines.length;
    for(let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^\d+\.\s*.+Go to page\s+\w+/i) || line.startsWith("What do you do?") || line.startsWith("Do you?") || line.startsWith("Decision(s):")) {
            contentEndIndex = i;
            break;
        }
        if (line.startsWith("Ending:")) {
            contentEndIndex = i;
            isEnding = true;
            break;
        }
    }
    
    rawContent = lines.slice(0, contentEndIndex).join('\n').replace(/^(Content:|Brief Title:.*|Segment Summary:.*)\n?/im, "").trim();

    // Parse decisions or ending
    if (isEnding) {
        endingText = lines.slice(contentEndIndex + 1).join('\n').trim();
    } else {
        for (let i = contentEndIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            // Match "1. Decision text. Go to page NODE_ID." or "1. Decision text Go to page NODE_ID"
            const decisionMatch = line.match(/^(\d+)\.\s*(.+?)\.?\s*(?:Go to page|Go to)\s+([a-zA-Z0-9_]+)\.?$/i);
            if (decisionMatch) {
                decisions.push({
                    text: decisionMatch[2].trim(),
                    nextNodeId: decisionMatch[3].trim(),
                });
            }
        }
        if (decisions.length === 0 && !segment.includes("Ending:")) { // If no decisions parsed and not explicitly an ending, assume it's an implicit ending.
            isEnding = true;
        }
    }
    
    storyMap.set(id, {
      id,
      title,
      rawContent,
      decisions,
      isEnding,
      endingText: isEnding ? (endingText || rawContent) : undefined, // If endingText is empty, use rawContent
    });
  }

  return { storyMap, startNodeId };
}
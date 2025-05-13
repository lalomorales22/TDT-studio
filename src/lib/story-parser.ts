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
  let normalizedText = fullStoryText.trim(); // Trim whitespace at start/end
  if (normalizedText && !normalizedText.startsWith("Node ID:") && !normalizedText.startsWith("\nNode ID:")) {
    // If there's text but it doesn't start with Node ID, try to find the first occurrence.
    const firstNodeIdOccurrence = normalizedText.indexOf("Node ID:");
    if (firstNodeIdOccurrence > 0) { // Preamble exists
      normalizedText = normalizedText.substring(firstNodeIdOccurrence);
    } else if (firstNodeIdOccurrence === -1) { // No "Node ID:" found at all
        console.error("No 'Node ID:' found in the story text.");
        return { storyMap, startNodeId };
    }
    // If firstNodeIdOccurrence is 0, it's already starting with "Node ID:", which is fine.
  }


  // Ensure segments are split correctly, even if "Node ID:" is the very first thing.
  // Prepending a newline if it starts directly with "Node ID:" ensures the first split element isn't empty due to delimiter at start.
  if (normalizedText.startsWith("Node ID:")) {
    normalizedText = `\n${normalizedText}`;
  }
  
  const segments = normalizedText.split(/\nNode ID:\s*/).filter(segment => segment.trim() !== "");

  if (segments.length === 0) {
    console.error("No segments found after splitting by 'Node ID:'.");
    return { storyMap, startNodeId };
  }

  for (const segment of segments) {
    const lines = segment.split('\n');
    const idLine = lines.shift(); // This should be the node's ID
    if (!idLine || idLine.trim().length === 0) {
        console.warn(`Skipping segment, ID line is empty or malformed.`);
        continue;
    }
    // Check if idLine itself contains other markers like "Brief Title:", which would mean it's not a clean ID.
    if (idLine.includes(":") && !idLine.trim().match(/^[a-zA-Z0-9_]+$/)) {
        console.warn(`Skipping segment, ID line seems malformed: "${idLine}"`);
        continue;
    }

    const id = idLine.trim();
    if (!startNodeId) {
      startNodeId = id;
    }

    let rawContent = "";
    const decisions: StoryDecision[] = [];
    let isEnding = false;
    let endingText = "";
    
    let title: string | undefined;
    // Try to find "Brief Title:" specifically in the current segment's lines
    let titleLineIndex = -1;
    for(let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith("Brief Title:")) {
            title = lines[i].replace("Brief Title:", "").trim();
            titleLineIndex = i;
            break;
        }
    }
    if (!title) {
      title = id.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }

    // Content is lines after ID (and optionally title), until decisions or ending.
    // Filter out known headers from the lines used for raw content.
    const contentLines = lines.filter((line, index) => {
        if (index === titleLineIndex) return false; // Don't include the title line if explicitly parsed
        const trimmedLine = line.trim();
        return !trimmedLine.startsWith("Segment Summary:") && !trimmedLine.startsWith("Content:");
    });


    let contentEndIndex = contentLines.length;
    for(let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i].trim();
        if (line.match(/^\d+\.\s*.+Go to page\s+\w+/i) || line.match(/^-\s*.+Go to page\s+\w+/i) || line.startsWith("What do you do?") || line.startsWith("Do you?") || line.startsWith("Decision(s):") || line.startsWith("Decisions:")) {
            contentEndIndex = i;
            break;
        }
        if (line.startsWith("Ending:")) {
            contentEndIndex = i;
            isEnding = true;
            break;
        }
    }
    
    rawContent = contentLines.slice(0, contentEndIndex).join('\n').trim();

    if (isEnding) {
        endingText = contentLines.slice(contentEndIndex + 1).join('\n').trim();
        if (endingText.startsWith("Ending:")) { // remove the "Ending:" label itself
            endingText = endingText.substring("Ending:".length).trim();
        }
    } else {
        for (let i = contentEndIndex; i < contentLines.length; i++) {
            const line = contentLines[i].trim();
            const decisionMatch = line.match(/^(?:\d+\.|-)\s*(.+?)\.?\s*(?:Go to page|Go to)\s+([a-zA-Z0-9_]+)\.?$/i);
            if (decisionMatch) {
                decisions.push({
                    text: decisionMatch[2].trim(), // decisionMatch[1] is text, decisionMatch[2] is nextNodeId
                    nextNodeId: decisionMatch[3].trim(), // Corrected indices based on typical regex group capture
                });
            }
        }
         // If no decisions explicitly parsed and not an "Ending:" block, check if content implies ending
        if (decisions.length === 0 && !isEnding) {
            const lowerRawContent = rawContent.toLowerCase();
            if (lowerRawContent.includes("the end") || lowerRawContent.includes("your adventure ends") || lowerRawContent.includes("ending.")) {
                 isEnding = true;
            } else if (contentEndIndex === contentLines.length) { // No decision markers found AND no "Ending:" tag
                 // Implicit ending if no decision options are presented and it's the last bit of text for this node.
                 isEnding = true;
            }
        }
    }
    
    storyMap.set(id, {
      id,
      title,
      rawContent,
      decisions,
      isEnding,
      endingText: isEnding ? (endingText || rawContent) : undefined,
    });
  }

  return { storyMap, startNodeId };
}

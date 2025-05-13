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
    // A simple regex to check if it looks like a valid ID (alphanumeric + underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(idLine.trim())) {
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
    // If no explicit title, generate one from the ID
    if (!title) {
      title = id.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }

    // Content is lines after ID (and optionally title), until decisions or ending.
    // Filter out known headers/markers from the lines used for raw content.
    const contentLines = lines.filter((line, index) => {
        if (index === titleLineIndex) return false; // Don't include the title line if explicitly parsed
        const trimmedLine = line.trim();
        return !trimmedLine.startsWith("Segment Summary:")
            && !trimmedLine.startsWith("Content:")
            && !trimmedLine.startsWith("Node ID:") // Filter out any misplaced Node ID lines
            && !trimmedLine.startsWith("Brief Title:"); // Filter out any misplaced Title lines
    });


    let contentEndIndex = contentLines.length;
    for(let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i].trim();
        // Decision markers
        if (line.match(/^(?:\d+\.|-)\s*.+?(?:\.|)\s*(?:Go to page|Go to)\s+[a-zA-Z0-9_]+(?:\.|)$/i) || line.match(/^What do you do\??/i) || line.match(/^Do you\??/i) || line.match(/^Decision\(?s?\)?:\s*$/i)) {
            contentEndIndex = i;
            break;
        }
        // Ending marker
        if (line.match(/^Ending:\s*$/i)) {
            contentEndIndex = i;
            isEnding = true;
            break;
        }
    }

    rawContent = contentLines.slice(0, contentEndIndex).join('\n').trim();

    if (isEnding) {
        // Ending text starts after the "Ending:" line
        let endingStartIndex = contentEndIndex + 1;
        // Adjust if the "Ending:" line itself wasn't filtered out (it shouldn't be based on filter logic, but check anyway)
        if(contentLines[contentEndIndex]?.trim().match(/^Ending:\s*$/i)) {
             endingStartIndex = contentEndIndex + 1;
        } else {
             // If Ending: marker wasn't found but isEnding is true (e.g. set later), assume ending text starts after content
             endingStartIndex = contentEndIndex;
        }
        endingText = contentLines.slice(endingStartIndex).join('\n').trim();
        // Ensure the "Ending:" label isn't included in the text itself
        if (endingText.toLowerCase().startsWith("ending:")) {
            endingText = endingText.substring("ending:".length).trim();
        }
    } else {
        // Parse decisions from the lines after the content
        for (let i = contentEndIndex; i < contentLines.length; i++) {
            const line = contentLines[i].trim();
            // Regex captures: Group 1 = Text, Group 2 = nextNodeId
            const decisionMatch = line.match(/^(?:\d+\.|-)\s*(.+?)\.?\s*(?:Go to page|Go to)\s+([a-zA-Z0-9_]+)\.?$/i);
            if (decisionMatch && decisionMatch[1] && decisionMatch[2]) { // Check if capture groups exist
                decisions.push({
                    text: decisionMatch[1].trim(), // Group 1: Decision Text
                    nextNodeId: decisionMatch[2].trim(), // Group 2: Next Node ID
                });
            }
        }
         // If no decisions explicitly parsed and not an "Ending:" block, check if content implies ending
        if (decisions.length === 0 && !isEnding) {
            const lowerRawContent = rawContent.toLowerCase();
            // Simple check for common ending phrases if no decisions/Ending: tag found
            if (lowerRawContent.includes("the end") || lowerRawContent.includes("your adventure ends") || lowerRawContent.includes("ending.")) {
                 isEnding = true;
            } else if (contentEndIndex === contentLines.length) { // No decision markers found AND no "Ending:" tag
                 // Implicit ending if no decision options are presented and it's the last bit of text for this node.
                 isEnding = true;
            }
        }
    }

    // If it's an ending, ensure endingText is set (use rawContent if endingText is empty)
    const finalEndingText = isEnding ? (endingText || rawContent) : undefined;

    storyMap.set(id, {
      id,
      title,
      rawContent,
      decisions,
      isEnding,
      endingText: finalEndingText,
    });
  }

  // Validate start node exists
  if (startNodeId && !storyMap.has(startNodeId)) {
      console.warn(`Parsed startNodeId "${startNodeId}" does not exist in the final storyMap. Attempting to find the first node.`);
      // Fallback: Use the first key in the map if available
      const firstKey = storyMap.keys().next().value;
      if (firstKey) {
          startNodeId = firstKey;
          console.log(`Using first node found as start node: "${startNodeId}"`);
      } else {
          console.error("Story map is empty after parsing. Cannot determine start node.");
          startNodeId = null; // Ensure it's null if map is empty
      }
  }

  return { storyMap, startNodeId };
}

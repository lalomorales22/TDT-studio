import type { StoryNodeData, StoryDecision, ParsedStory } from '@/types/story';

/**
 * Parses the story content. Can handle either the original text format
 * or a JSON string representing a map of node IDs to generated content strings.
 */
export function parseStory(storyContent: string): { storyMap: ParsedStory; startNodeId: string | null } {
  const storyMap: ParsedStory = new Map();
  let startNodeId: string | null = null;

  if (!storyContent || typeof storyContent !== 'string') {
    console.error("Invalid story content input for parsing.");
    return { storyMap, startNodeId };
  }

  // Attempt to parse as JSON first (new format from full generation)
  try {
    const parsedJson = JSON.parse(storyContent);
    if (typeof parsedJson === 'object' && parsedJson !== null) {
        // Assume it's a Record<string, string> where keys are node IDs and values are content
        for (const nodeId in parsedJson) {
            if (Object.prototype.hasOwnProperty.call(parsedJson, nodeId)) {
                const nodeContent = parsedJson[nodeId];
                if (typeof nodeContent === 'string') {
                   // Need to parse the individual node content string to extract title, decisions etc.
                   // This reuses the logic from the original text parser for *each node's content*.
                   const nodeData = parseSingleNodeContent(nodeId, nodeContent);
                   storyMap.set(nodeId, nodeData);
                } else {
                    console.warn(`Invalid content type for node ID ${nodeId} in JSON structure. Expected string.`);
                }
            }
        }
        // Attempt to retrieve the startNodeId stored separately
        startNodeId = sessionStorage.getItem("tieDyedTales_startNodeId");
        // Validate startNodeId exists in the map
         if (startNodeId && !storyMap.has(startNodeId)) {
            console.warn(`Stored startNodeId "${startNodeId}" not found in parsed JSON map. Attempting to use first key.`);
            startNodeId = storyMap.keys().next().value || null;
         } else if (!startNodeId && storyMap.size > 0) {
             console.warn(`No startNodeId found in storage. Using first key from parsed JSON map.`);
             startNodeId = storyMap.keys().next().value || null;
         }

        console.log("Parsed story from JSON structure.");
        return { storyMap, startNodeId };
    }
  } catch (e) {
    // If JSON parsing fails, assume it's the original plain text format
    console.log("Content is not valid JSON, attempting to parse as plain text.");
  }

  // --- Fallback to Original Plain Text Parsing Logic ---
  console.log("Parsing story from plain text format.");
  // Split story into segments based on "Node ID: "
  let normalizedText = storyContent.trim();
  if (normalizedText && !normalizedText.startsWith("Node ID:") && !normalizedText.startsWith("\nNode ID:")) {
    const firstNodeIdOccurrence = normalizedText.indexOf("Node ID:");
    if (firstNodeIdOccurrence > 0) {
      normalizedText = normalizedText.substring(firstNodeIdOccurrence);
    } else if (firstNodeIdOccurrence === -1) {
        console.error("No 'Node ID:' found in the story text.");
        return { storyMap, startNodeId };
    }
  }

  if (normalizedText.startsWith("Node ID:")) {
    normalizedText = `\n${normalizedText}`;
  }

  const segments = normalizedText.split(/\nNode ID:\s*/).filter(segment => segment.trim() !== "");

  if (segments.length === 0) {
    console.error("No segments found after splitting by 'Node ID:'.");
    return { storyMap, startNodeId };
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const lines = segment.split('\n');
    const idLine = lines.shift(); // This should be the node's ID

    if (!idLine || idLine.trim().length === 0 || !/^[a-zA-Z0-9_]+$/.test(idLine.trim())) {
        console.warn(`Skipping segment ${i + 1}, ID line seems malformed or empty: "${idLine}"`);
        continue;
    }
    const id = idLine.trim();

    // Reconstruct the content part of the segment (everything after the ID line)
    const contentString = lines.join('\n');

    // Parse this individual node's content
    const nodeData = parseSingleNodeContent(id, contentString);
    storyMap.set(id, nodeData);

    // Set startNodeId from the first valid parsed node ID
    if (!startNodeId) {
      startNodeId = id;
    }
  }

   // Final validation for start node in plain text parsing
  if (startNodeId && !storyMap.has(startNodeId)) {
      console.warn(`Parsed startNodeId "${startNodeId}" does not exist in the final storyMap (text parse). Attempting to find the first node.`);
      const firstKey = storyMap.keys().next().value;
      startNodeId = firstKey || null;
  }

  return { storyMap, startNodeId };
}


/**
 * Parses the content string of a *single* story node to extract its details.
 * Handles "Brief Title:", "Ending:", and decision lines.
 */
function parseSingleNodeContent(id: string, contentString: string): StoryNodeData {
    const lines = contentString.split('\n');
    let title: string | undefined;
    let rawContent = "";
    const decisions: StoryDecision[] = [];
    let isEnding = false;
    let endingText: string | undefined = undefined;

    // Extract Title
    let titleLineIndex = lines.findIndex(line => line.trim().startsWith("Brief Title:"));
    if (titleLineIndex !== -1) {
        title = lines[titleLineIndex].replace("Brief Title:", "").trim();
    } else {
         // Generate title from ID if not found
        title = id.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }

    // Filter out known markers and the title line itself for content processing
    const potentialContentLines = lines.filter((line, index) => {
        if (index === titleLineIndex) return false;
        const trimmedLine = line.trim();
        return !trimmedLine.startsWith("Node ID:") // Should not happen here, but safeguard
            && !trimmedLine.startsWith("Brief Title:")
            && !trimmedLine.startsWith("Segment Summary:") // Filter potential remnants
            && !trimmedLine.startsWith("Content:");
    });


    let contentEndIndex = potentialContentLines.length;
    for (let i = 0; i < potentialContentLines.length; i++) {
        const line = potentialContentLines[i].trim();
         // Decision markers (refined regex)
         const decisionMatch = line.match(/^(?:\d+\.|-)\s*(.+?)\.?\s*(?:Go to page|Go to|->)\s+([a-zA-Z0-9_]+)\.?$/i);
        if (decisionMatch) {
            contentEndIndex = i; // Content ends before the first decision line
            break;
        }
        // Stronger check for decision section start
        if (line.match(/^Decision(s?):/i) || line.match(/^(What do you do|Choose one):/i)) {
             contentEndIndex = i;
             break;
        }

        // Ending marker
        if (line.match(/^Ending:\s*$/i) || line.match(/^--- THE END ---$/i)) {
            contentEndIndex = i;
            isEnding = true;
            break;
        }
    }

    rawContent = potentialContentLines.slice(0, contentEndIndex).join('\n').trim();

    if (isEnding) {
        // Ending text starts after the "Ending:" line or marker
        let endingStartIndex = potentialContentLines.findIndex(line => line.trim().match(/^Ending:\s*$/i) || line.trim().match(/^--- THE END ---$/i));
        if(endingStartIndex !== -1) {
            endingText = potentialContentLines.slice(endingStartIndex + 1).join('\n').trim();
            // Remove the marker itself if somehow included
            if (endingText.startsWith("Ending:")) endingText = endingText.substring(7).trim();
            if (endingText.startsWith("--- THE END ---")) endingText = endingText.substring(15).trim();
        }
         // If ending marker found but no text after, use raw content as ending text
        if (!endingText && rawContent) {
            endingText = rawContent;
        } else if (!endingText && !rawContent) {
             endingText = "The story concludes here."; // Default ending text
        }

    } else {
        // Parse decisions only if not an ending
        for (let i = contentEndIndex; i < potentialContentLines.length; i++) {
            const line = potentialContentLines[i].trim();
            // Regex captures: Group 1 = Text, Group 2 = nextNodeId
            const decisionMatch = line.match(/^(?:\d+\.|-)\s*(.+?)\.?\s*(?:Go to page|Go to|->)\s+([a-zA-Z0-9_]+)\.?$/i);
            if (decisionMatch && decisionMatch[1] && decisionMatch[2]) {
                decisions.push({
                    text: decisionMatch[1].trim(),
                    nextNodeId: decisionMatch[2].trim(),
                });
            }
        }

        // Implicit ending check if no explicit ending marker and no decisions found
        if (decisions.length === 0) {
             const lowerRawContent = rawContent.toLowerCase();
             if (lowerRawContent.includes("the end") || lowerRawContent.includes("your adventure ends") || lowerRawContent.includes("conclusion")) {
                  isEnding = true;
                  endingText = rawContent; // Use the content as the ending text
                  rawContent = ""; // Clear raw content if implicitly becomes ending text
             } else if (contentEndIndex === potentialContentLines.length && potentialContentLines.length > 0) {
                  // If we reached the end of lines for this node without decisions or ending markers,
                  // treat it as a dead end / implicit ending.
                  isEnding = true;
                  endingText = rawContent;
                  rawContent = "";
                  console.warn(`Node ${id} has no decisions or explicit ending marker. Treating as implicit ending.`);
             }
        }
    }


    return {
      id,
      title,
      rawContent: isEnding ? "" : rawContent, // Don't show raw content for ending nodes typically
      decisions: isEnding ? [] : decisions, // No decisions on ending nodes
      isEnding,
      endingText: isEnding ? (endingText || "The story concludes.") : undefined, // Provide default if needed
    };
}
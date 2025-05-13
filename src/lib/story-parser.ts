import type { StoryNodeData, StoryDecision, ParsedStory, StoryNodeStructure, StoryStructureOutput } from '@/types/story';

/**
 * Parses the story content.
 * Primary path: Uses fully generated content and structure from sessionStorage.
 * Fallback: Original text-based parsing if new structured data is not found.
 */
export function parseStory(
    fullStoryContentJsonString: string | null, // Record<string, string> (nodeId -> generated narrative)
    storyStructureJsonString: string | null, // StoryStructureOutput
    legacyStoryText: string | null // Original plain text story for fallback
): { storyMap: ParsedStory; startNodeId: string | null } {
    const storyMap: ParsedStory = new Map();
    let startNodeId: string | null = null;

    // Primary parsing path using structured data
    if (fullStoryContentJsonString && storyStructureJsonString) {
        try {
            const fullStoryContent: Record<string, string> = JSON.parse(fullStoryContentJsonString);
            const storyStructure: StoryStructureOutput = JSON.parse(storyStructureJsonString);

            if (storyStructure && storyStructure.nodes && storyStructure.startNodeId && fullStoryContent) {
                for (const nodeStruct of storyStructure.nodes) {
                    const generatedNarrative = fullStoryContent[nodeStruct.id] || `[Content missing for node ${nodeStruct.id}. Summary: ${nodeStruct.summary}]`;
                    
                    const nodeData: StoryNodeData = {
                        id: nodeStruct.id,
                        title: nodeStruct.title,
                        // rawContent for non-endings is the generated narrative. For endings, it's usually blank as endingText is primary.
                        rawContent: nodeStruct.isEnding ? "" : generatedNarrative, 
                        decisions: nodeStruct.isEnding ? [] : nodeStruct.decisions || [],
                        isEnding: nodeStruct.isEnding,
                        endingText: nodeStruct.isEnding ? generatedNarrative : undefined,
                    };
                    storyMap.set(nodeStruct.id, nodeData);
                }
                startNodeId = storyStructure.startNodeId;

                if (storyMap.size > 0) {
                    console.log("Successfully parsed story using structured content and definitions.");
                    return { storyMap, startNodeId };
                }
            }
        } catch (e) {
            console.warn("Failed to parse new structured story data, attempting fallback.", e);
            // Proceed to fallback if parsing new format fails
        }
    }

    // Fallback to legacy text parsing if new structured data isn't available or fails
    console.log("Attempting legacy text parsing for story content.");
    if (!legacyStoryText || typeof legacyStoryText !== 'string' || legacyStoryText.trim() === "") {
        console.error("No valid story content provided for parsing (legacy or new).");
        return { storyMap, startNodeId };
    }
    
    // Simplified legacy parser (original structure with AI generated node content)
    // Assumes legacyStoryText might be a JSON string of Record<string, string> (nodeId -> full node text with title/decisions etc.)
    // OR the very old plain text format.
    try {
        const parsedJson = JSON.parse(legacyStoryText);
        if (typeof parsedJson === 'object' && parsedJson !== null && !Array.isArray(parsedJson)) { // Check it's an object, not an array
            // Likely Record<string, string> from an older version of generateFullStoryAction
            console.log("Parsing legacy story text as JSON map of node content.");
            let firstNodeIdInJson: string | null = null;
            for (const nodeId in parsedJson) {
                if (Object.prototype.hasOwnProperty.call(parsedJson, nodeId)) {
                    if (!firstNodeIdInJson) firstNodeIdInJson = nodeId;
                    const nodeContentString = parsedJson[nodeId];
                    if (typeof nodeContentString === 'string') {
                        const nodeData = parseSingleNodeRawText(nodeId, nodeContentString);
                        storyMap.set(nodeId, nodeData);
                    }
                }
            }
            // Attempt to get startNodeId from sessionStorage, else use the first one found
            startNodeId = sessionStorage.getItem("tieDyedTales_startNodeId") || firstNodeIdInJson;
            if (startNodeId && !storyMap.has(startNodeId) && firstNodeIdInJson) {
                startNodeId = firstNodeIdInJson; // Fallback if stored startNodeId is invalid
            }
            if (storyMap.size > 0) return { storyMap, startNodeId };
        }
    } catch (e) {
        // Not JSON, or not the expected JSON structure, so proceed to plain text split.
        console.log("Legacy story text is not a JSON map, attempting plain text node splitting.");
    }


    // Fallback to original plain text parsing (very old format)
    // This part might be deprecated if the AI always outputs structured node content now.
    let normalizedText = legacyStoryText.trim();
    if (normalizedText && !normalizedText.startsWith("Node ID:") && !normalizedText.startsWith("\nNode ID:")) {
        const firstNodeIdOccurrence = normalizedText.indexOf("Node ID:");
        if (firstNodeIdOccurrence > 0) {
            normalizedText = normalizedText.substring(firstNodeIdOccurrence);
        } else if (firstNodeIdOccurrence === -1) {
            console.error("No 'Node ID:' found in the legacy story text.");
            return { storyMap, startNodeId };
        }
    }

    if (normalizedText.startsWith("Node ID:")) {
        normalizedText = `\n${normalizedText}`;
    }

    const segments = normalizedText.split(/\nNode ID:\s*/).filter(segment => segment.trim() !== "");

    if (segments.length === 0) {
        console.error("No segments found after splitting by 'Node ID:' in legacy text.");
        return { storyMap, startNodeId };
    }

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const lines = segment.split('\n');
        const idLine = lines.shift(); 

        if (!idLine || idLine.trim().length === 0 || !/^[a-zA-Z0-9_]+$/.test(idLine.trim())) {
            console.warn(`Skipping legacy segment ${i + 1}, ID line malformed: "${idLine}"`);
            continue;
        }
        const id = idLine.trim();
        const contentString = lines.join('\n');
        const nodeData = parseSingleNodeRawText(id, contentString);
        storyMap.set(id, nodeData);
        if (!startNodeId) startNodeId = id;
    }
    
    if (startNodeId && !storyMap.has(startNodeId)) {
        const firstKey = storyMap.keys().next().value;
        startNodeId = firstKey || null;
    }

    return { storyMap, startNodeId };
}


/**
 * Parses the raw text content of a *single* story node from older formats
 * where title, decisions, and ending markers are embedded in the text.
 */
function parseSingleNodeRawText(id: string, rawNodeText: string): StoryNodeData {
    const lines = rawNodeText.split('\n');
    let title: string | undefined;
    let narrativeContent = "";
    const decisions: StoryDecision[] = [];
    let isEnding = false;
    let endingText: string | undefined = undefined;

    let titleLineIndex = lines.findIndex(line => line.trim().startsWith("Brief Title:") || line.trim().startsWith("Title:"));
    if (titleLineIndex !== -1) {
        title = lines[titleLineIndex].replace(/^(Brief Title:|Title:)/, "").trim();
    } else {
        title = id.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }

    const contentProcessingLines = lines.filter((line, index) => {
        if (index === titleLineIndex) return false;
        const trimmedLine = line.trim();
        return !trimmedLine.startsWith("Node ID:") && !trimmedLine.startsWith("Brief Title:") && !trimmedLine.startsWith("Title:") && !trimmedLine.startsWith("Segment Summary:") && !trimmedLine.startsWith("Content:");
    });

    let contentEndIndex = contentProcessingLines.length;
    for (let i = 0; i < contentProcessingLines.length; i++) {
        const line = contentProcessingLines[i].trim();
        const decisionMatch = line.match(/^(?:\d+\.|-)\s*(.+?)\.?\s*(?:Go to page|Go to|->)\s+([a-zA-Z0-9_]+)\.?$/i);
        if (decisionMatch) {
            contentEndIndex = i;
            break;
        }
        if (line.match(/^Decision(s?):/i) || line.match(/^(What do you do|Choose one):/i)) {
             contentEndIndex = i;
             break;
        }
        if (line.match(/^Ending:\s*$/i) || line.match(/^--- THE END ---$/i) || line.toLowerCase().includes("the end.")) {
            contentEndIndex = i;
            isEnding = true;
            break;
        }
    }

    narrativeContent = contentProcessingLines.slice(0, contentEndIndex).join('\n').trim();

    if (isEnding) {
        let endingStartIndex = contentProcessingLines.findIndex(line => line.trim().match(/^Ending:\s*$/i) || line.trim().match(/^--- THE END ---$/i));
        if (endingStartIndex !== -1) {
            endingText = contentProcessingLines.slice(endingStartIndex + 1).join('\n').trim();
        }
        if (!endingText && narrativeContent) { // If marker found but no text after, or implicit end
            endingText = narrativeContent;
        } else if (!endingText) {
             endingText = "The story concludes here.";
        }
        narrativeContent = ""; // Clear narrative if it became ending text
    } else {
        for (let i = contentEndIndex; i < contentProcessingLines.length; i++) {
            const line = contentProcessingLines[i].trim();
            const decisionMatch = line.match(/^(?:\d+\.|-)\s*(.+?)\.?\s*(?:Go to page|Go to|->)\s+([a-zA-Z0-9_]+)\.?$/i);
            if (decisionMatch && decisionMatch[1] && decisionMatch[2]) {
                decisions.push({
                    text: decisionMatch[1].trim(),
                    nextNodeId: decisionMatch[2].trim(),
                });
            }
        }
        if (decisions.length === 0 && contentProcessingLines.length > 0 && contentEndIndex === contentProcessingLines.length) {
             // Implicit ending if no decisions and no explicit ending marker
            isEnding = true;
            endingText = narrativeContent;
            narrativeContent = "";
        }
    }

    return {
      id,
      title,
      rawContent: narrativeContent,
      decisions,
      isEnding,
      endingText,
    };
}

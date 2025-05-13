// @ts-nocheck
// TODO: Fix types
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
                    // Use generated content, or a specific placeholder if content indicates failure
                    let generatedNarrative = fullStoryContent[nodeStruct.id];
                    if (generatedNarrative === undefined || generatedNarrative === null) {
                        generatedNarrative = `[Content missing for node ${nodeStruct.id}. Original summary: ${nodeStruct.summary}]`;
                    }
                    
                    const isFailedNode = generatedNarrative.startsWith("[Content generation failed") || generatedNarrative.startsWith("[Content generation critically failed");

                    const nodeData: StoryNodeData = {
                        id: nodeStruct.id,
                        title: nodeStruct.title,
                        rawContent: nodeStruct.isEnding || isFailedNode ? "" : generatedNarrative, 
                        decisions: (nodeStruct.isEnding || isFailedNode) ? [] : nodeStruct.decisions || [],
                        isEnding: nodeStruct.isEnding || isFailedNode, // Treat failed nodes as dead ends
                        endingText: nodeStruct.isEnding ? generatedNarrative : (isFailedNode ? generatedNarrative : undefined),
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
        }
    }

    // Fallback to legacy text parsing
    console.log("Attempting legacy text parsing for story content.");
    if (!legacyStoryText || typeof legacyStoryText !== 'string' || legacyStoryText.trim() === "") {
        console.error("No valid story content provided for parsing (legacy or new).");
        return { storyMap, startNodeId };
    }
    
    try {
        const parsedJson = JSON.parse(legacyStoryText);
        if (typeof parsedJson === 'object' && parsedJson !== null && !Array.isArray(parsedJson)) {
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
            startNodeId = sessionStorage.getItem("tieDyedTales_startNodeId") || firstNodeIdInJson;
            if (startNodeId && !storyMap.has(startNodeId) && firstNodeIdInJson) {
                startNodeId = firstNodeIdInJson; 
            }
            if (storyMap.size > 0) return { storyMap, startNodeId };
        }
    } catch (e) {
        console.log("Legacy story text is not a JSON map, attempting plain text node splitting.");
    }

    let normalizedText = legacyStoryText.trim();
    const nodeIdMarker = "Node ID:";
    if (normalizedText && !normalizedText.startsWith(nodeIdMarker) && !normalizedText.startsWith("\n" + nodeIdMarker)) {
        const firstNodeIdOccurrence = normalizedText.indexOf(nodeIdMarker);
        if (firstNodeIdOccurrence > 0) {
            normalizedText = normalizedText.substring(firstNodeIdOccurrence);
        } else if (firstNodeIdOccurrence === -1) {
            console.error(`No '${nodeIdMarker}' found in the story text.`);
            return { storyMap, startNodeId };
        }
    }

    // Ensure consistent splitting by adding a newline if it starts directly with "Node ID:"
    if (normalizedText.startsWith(nodeIdMarker)) {
        normalizedText = `\n${normalizedText}`;
    }

    const segments = normalizedText.split(new RegExp(`\\n${nodeIdMarker}\\s*`)).filter(segment => segment.trim() !== "");

    if (segments.length === 0 && normalizedText.startsWith(nodeIdMarker.substring(1))) { // handles case where split might remove first entry if no leading newline
        segments.push(normalizedText.substring(nodeIdMarker.length).trim());
    }
    
    if (segments.length === 0) {
        console.error(`No segments found after splitting by '${nodeIdMarker}' in legacy text.`);
        return { storyMap, startNodeId };
    }

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const lines = segment.split('\n');
        const idLine = lines.shift();

        if (!idLine || idLine.trim().length === 0 ) {
            console.warn(`Skipping legacy segment ${i + 1}, ID line malformed or empty: "${idLine}"`);
            continue;
        }
        const id = idLine.trim();
         if (!/^[a-zA-Z0-9_]+$/.test(id)) { // Basic validation for node ID format
            console.warn(`Skipping legacy segment ${i + 1}, ID "${id}" contains invalid characters.`);
            continue;
        }
        const contentString = lines.join('\n');
        const nodeData = parseSingleNodeRawText(id, contentString);
        storyMap.set(id, nodeData);
        if (!startNodeId) startNodeId = id; // Set first parsed ID as potential start node
    }
    
    // Validate startNodeId from session storage or fall back
    const storedStartNodeId = sessionStorage.getItem("tieDyedTales_startNodeId");
    if (storedStartNodeId && storyMap.has(storedStartNodeId)) {
        startNodeId = storedStartNodeId;
    } else if (!startNodeId || !storyMap.has(startNodeId)) { // If current startNodeId is invalid or not set
        const firstKey = storyMap.keys().next().value;
        startNodeId = firstKey || null; // Fallback to the first node in the map
    }


    return { storyMap, startNodeId };
}


function parseSingleNodeRawText(id: string, rawNodeText: string): StoryNodeData {
    const lines = rawNodeText.split('\n');
    let title: string | undefined;
    let narrativeContent = "";
    const decisions: StoryDecision[] = [];
    let isEnding = false;
    let endingText: string | undefined = undefined;

    let titleLineIndex = lines.findIndex(line => line.trim().match(/^(Brief Title:|Title:)/i));
    if (titleLineIndex !== -1) {
        title = lines[titleLineIndex].replace(/^(Brief Title:|Title:)/i, "").trim();
    } else {
        // Default title from ID if not found
        title = id.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    }

    // Filter out metadata lines for content processing
    const contentProcessingLines = lines.filter((line, index) => {
        if (index === titleLineIndex) return false; // Skip already processed title line
        const trimmedLine = line.trim();
        // Skip common metadata/structural lines that might appear in raw text
        return !trimmedLine.match(/^(Node ID:|Brief Title:|Title:|Segment Summary:|Content:)/i);
    });

    let contentEndIndex = contentProcessingLines.length;
    for (let i = 0; i < contentProcessingLines.length; i++) {
        const line = contentProcessingLines[i].trim();
        // Regex for decisions: "1. Text (Go to|->) next_node_id" or "- Text (Go to|->) next_node_id"
        const decisionMatch = line.match(/^(?:\d+\.|\-)\s*(.+?)\s*(?:\(Go to page|\(Go to|\(->|Go to page|Go to|->)\s+([a-zA-Z0-9_]+)\)?\.?$/i);

        if (decisionMatch) {
            contentEndIndex = i; // Narrative ends where decisions start
            break;
        }
        // Check for explicit decision section markers
        if (line.match(/^Decision(s?):/i) || line.match(/^(What do you do\?|Choose one:)/i)) {
             contentEndIndex = i;
             break;
        }
        // Check for ending markers
        if (line.match(/^Ending:\s*$/i) || line.match(/^--- THE END ---$/i) || line.toLowerCase().includes("the end.")) {
            contentEndIndex = i;
            isEnding = true;
            break;
        }
    }

    narrativeContent = contentProcessingLines.slice(0, contentEndIndex).join('\n').trim();

    if (isEnding) {
        // Try to find text after an "Ending:" marker
        let endingStartIndex = contentProcessingLines.findIndex(line => line.trim().match(/^Ending:\s*$/i) || line.trim().match(/^--- THE END ---$/i));
        if (endingStartIndex !== -1 && endingStartIndex < contentEndIndex) { // ensure ending marker is within narrative part
             endingText = contentProcessingLines.slice(endingStartIndex + 1, contentEndIndex).join('\n').trim();
        }
        if (!endingText && narrativeContent) { // If marker found but no specific text after, use the narrative content as ending text.
            endingText = narrativeContent;
        } else if (!endingText) { // Default ending text if none found
             endingText = "The story concludes here.";
        }
        narrativeContent = ""; // Clear narrative if it became ending text or if it's an ending.
    } else {
        // Parse decisions if not an ending
        for (let i = contentEndIndex; i < contentProcessingLines.length; i++) {
            const line = contentProcessingLines[i].trim();
             const decisionMatch = line.match(/^(?:\d+\.|\-)\s*(.+?)\s*(?:\(Go to page|\(Go to|\(->|Go to page|Go to|->)\s+([a-zA-Z0-9_]+)\)?\.?$/i);
            if (decisionMatch && decisionMatch[1] && decisionMatch[2]) {
                decisions.push({
                    text: decisionMatch[1].trim().replace(/\.$/,''), // Remove trailing period from decision text
                    nextNodeId: decisionMatch[2].trim(),
                });
            }
        }
        // If no decisions found and no explicit ending marker, it might be an implicit ending.
        if (decisions.length === 0 && contentProcessingLines.length > 0 && contentEndIndex === contentProcessingLines.length) {
            isEnding = true;
            endingText = narrativeContent || "The story concludes here."; // Use narrative or a default
            narrativeContent = "";
        }
    }
    
    // If for some reason title is still undefined, generate a default
    if (!title) {
      title = `Chapter ${id}`;
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

```
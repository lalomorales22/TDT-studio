"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StoryNodeDisplay } from '@/components/story-node-display';
import { parseStory } from '@/lib/story-parser';
import type { ParsedStory, StoryNodeData } from '@/types/story';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.nodeId as string;

  const [storyMap, setStoryMap] = useState<ParsedStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for the fully generated content first
    let storyDataText = sessionStorage.getItem("tieDyedTales_fullStoryContent");
    let startNodeIdFromStorage: string | null = null;

    // If full content isn't found, fall back to the original structure (less likely now)
    if (!storyDataText) {
      console.warn("Full story content not found, falling back to original story key.");
      storyDataText = sessionStorage.getItem("tieDyedTales_currentStory"); // Original key
    } else {
        // If full content was found, also try to get its specific start node ID
        startNodeIdFromStorage = sessionStorage.getItem("tieDyedTales_startNodeId");
    }


    if (!storyDataText) {
      setError("No story data found in this session. Please start a new story from the homepage.");
      setIsLoading(false);
      // Optionally redirect: router.replace("/");
      return;
    }

    try {
      // Use the updated parser which handles both formats
      const { storyMap: parsedMap, startNodeId: parsedStartNodeId } = parseStory(storyDataText);

      if (!parsedMap || parsedMap.size === 0) {
        setError("Failed to parse the story content. The story data might be corrupted or empty. Please try generating it again.");
      } else {
        // Determine the effective start node ID
        const effectiveStartNodeId = startNodeIdFromStorage || parsedStartNodeId;

        // Check if the current nodeId exists in the map
        if (!parsedMap.has(nodeId)) {
             console.warn(`Current node ID "${nodeId}" not found in parsed map.`);
             // If the current node is invalid, but we have a valid start node, maybe redirect?
             if (effectiveStartNodeId && parsedMap.has(effectiveStartNodeId)) {
                 setError(`The requested story page ('${nodeId}') was not found. Redirecting to the start.`);
                 router.replace(`/story/${effectiveStartNodeId}`);
                 // Keep loading true until redirect happens
                 return;
             } else {
                 // No valid start node either, serious parsing issue
                 setError(`The requested story page ('${nodeId}') was not found, and a valid start node could not be determined.`);
             }
        }
        setStoryMap(parsedMap);
      }
    } catch (e) {
      console.error("Error parsing story:", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(`An unexpected error occurred while parsing the story: ${message}. Please try generating it again.`);
    } finally {
      setIsLoading(false);
    }
    // Intentionally re-run *only* if the raw story text changes in storage,
    // not just the nodeId param. The nodeId change is handled by useMemo below.
  }, []);

  const currentNodeData = useMemo(() => {
    if (!storyMap || !nodeId) return null;
    return storyMap.get(nodeId);
  }, [storyMap, nodeId]);

  const handleRestart = () => {
    sessionStorage.removeItem("tieDyedTales_storyStructure");
    sessionStorage.removeItem("tieDyedTales_fullStoryContent");
    sessionStorage.removeItem("tieDyedTales_startNodeId");
    sessionStorage.removeItem("tieDyedTales_currentStory"); // Clear old key too
    router.push("/");
  };

  if (isLoading) {
    return <Loader message="Loading your adventure..." />;
  }

  if (error) {
    return (
      <div className="text-center py-10">
         <Card className="w-full max-w-2xl mx-auto text-center shadow-xl border-destructive">
          <CardHeader>
              <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
                  <AlertTriangle className="h-6 w-6" /> Error Loading Story
              </CardTitle>
          </CardHeader>
          <CardContent>
              <p className="mb-6">{error}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
              <Button onClick={handleRestart} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" /> Start New Story
              </Button>
          </CardFooter>
         </Card>
      </div>
    );
  }

  // StoryNodeDisplay handles the case where currentNodeData is null/undefined
  // after successful parsing but the specific nodeId is invalid.
  return <StoryNodeDisplay node={currentNodeData} onRestart={handleRestart} />;
}
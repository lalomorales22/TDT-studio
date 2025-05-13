"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StoryNodeDisplay } from '@/components/story-node-display';
import { parseStory } from '@/lib/story-parser';
import type { ParsedStory } from '@/types/story'; // StoryNodeData is implicitly used by ParsedStory
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.nodeId as string;

  const [storyMap, setStoryMap] = useState<ParsedStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [effectiveStartNodeId, setEffectiveStartNodeId] = useState<string | null>(null);


  useEffect(() => {
    const fullStoryContentJsonString = sessionStorage.getItem("tieDyedTales_fullStoryContent"); // Record<string, string>
    const storyStructureJsonString = sessionStorage.getItem("tieDyedTales_richStoryStructure"); // StoryStructureOutput
    const legacyStoryText = sessionStorage.getItem("tieDyedTales_currentStory"); // Fallback for very old format
    const storedStartNodeId = sessionStorage.getItem("tieDyedTales_startNodeId");

    if (!fullStoryContentJsonString || !storyStructureJsonString) {
        // Try legacy if new format isn't fully present
        if (legacyStoryText) {
            console.warn("Modern story data not found, attempting to parse legacy story text.");
        } else {
            setError("No story data found in this session. Please start a new story from the homepage.");
            setIsLoading(false);
            return;
        }
    }

    try {
      // parseStory now handles primary (new format) and fallback (legacy)
      const { storyMap: parsedMap, startNodeId: parsedStartNodeIdFromParser } = parseStory(
        fullStoryContentJsonString,
        storyStructureJsonString,
        legacyStoryText
      );
      
      setEffectiveStartNodeId(storedStartNodeId || parsedStartNodeIdFromParser);

      if (!parsedMap || parsedMap.size === 0) {
        setError("Failed to parse the story content. The story data might be corrupted or empty. Please try generating it again.");
      } else {
        if (!parsedMap.has(nodeId)) {
             console.warn(`Current node ID "${nodeId}" not found in parsed map.`);
             if (storedStartNodeId && parsedMap.has(storedStartNodeId)) {
                 setError(`The requested story page ('${nodeId}') was not found. Redirecting to the start.`);
                 router.replace(`/story/${storedStartNodeId}`);
                 return; // Keep loading true until redirect completes
             } else if (parsedStartNodeIdFromParser && parsedMap.has(parsedStartNodeIdFromParser)) {
                 setError(`The requested story page ('${nodeId}') was not found. Redirecting to the determined start ('${parsedStartNodeIdFromParser}').`);
                 router.replace(`/story/${parsedStartNodeIdFromParser}`);
                 return; 
             }
             else {
                 setError(`The requested story page ('${nodeId}') was not found, and a valid start node could not be determined.`);
             }
        }
        setStoryMap(parsedMap);
      }
    } catch (e) {
      console.error("Error during story processing:", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(`An unexpected error occurred: ${message}. Please try starting a new story.`);
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, router]); // Rerun if nodeId changes to handle navigation, or router for replace

  const currentNodeData = useMemo(() => {
    if (!storyMap || !nodeId) return null;
    return storyMap.get(nodeId);
  }, [storyMap, nodeId]);

  const handleRestart = () => {
    sessionStorage.removeItem("tieDyedTales_storyStructure");
    sessionStorage.removeItem("tieDyedTales_originalStoryInput");
    sessionStorage.removeItem("tieDyedTales_fullStoryContent");
    sessionStorage.removeItem("tieDyedTales_startNodeId");
    sessionStorage.removeItem("tieDyedTales_richStoryStructure");
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
  
  if (!currentNodeData && !isLoading) {
    // This case implies storyMap was populated but current nodeId is not in it AFTER initial load/redirect checks.
    // This could happen if there's a bad link but the map itself is fine.
     return (
      <div className="text-center py-10">
         <Card className="w-full max-w-2xl mx-auto text-center shadow-xl border-destructive">
          <CardHeader>
              <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
                  <AlertTriangle className="h-6 w-6" /> Story Section Not Found
              </CardTitle>
          </CardHeader>
          <CardContent>
              <p className="mb-6">The specific story section you're looking for (`{nodeId}`) doesn't exist in the loaded adventure.</p>
              {effectiveStartNodeId && (
                <p className="mb-2">You could try <Link href={`/story/${effectiveStartNodeId}`} className="underline hover:text-primary">going to the start of the story</Link>.</p>
              )}
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


  return <StoryNodeDisplay node={currentNodeData} onRestart={handleRestart} />;
}

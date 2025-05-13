"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StoryNodeDisplay } from '@/components/story-node-display';
import { parseStory } from '@/lib/story-parser';
import type { ParsedStory, StoryNodeData } from '@/types/story';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = params.nodeId as string;

  const [storyMap, setStoryMap] = useState<ParsedStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fullStoryText = sessionStorage.getItem("tieDyedTales_currentStory");
    if (!fullStoryText) {
      setError("No story data found. Please start a new story.");
      setIsLoading(false);
      // Optionally redirect: router.replace("/");
      return;
    }

    try {
      const { storyMap: parsedMap, startNodeId } = parseStory(fullStoryText);
      if (!parsedMap || parsedMap.size === 0) {
        setError("Failed to parse the story. The story data might be corrupted.");
      } else {
        setStoryMap(parsedMap);
        // If current nodeId is not in map (e.g. bad URL) but we have a startNodeId, consider redirecting.
        // For now, StoryNodeDisplay will handle if node is not found.
      }
    } catch (e) {
      console.error("Error parsing story:", e);
      setError("An error occurred while trying to load the story.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Parse only once on component mount

  const currentNodeData = useMemo(() => {
    if (!storyMap || !nodeId) return null;
    return storyMap.get(nodeId);
  }, [storyMap, nodeId]);

  const handleRestart = () => {
    sessionStorage.removeItem("tieDyedTales_currentStory");
    router.push("/");
  };

  if (isLoading) {
    return <Loader message="Loading your adventure..." />;
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold text-destructive mb-4">Error</h2>
        <p className="mb-6">{error}</p>
        <Button onClick={handleRestart} variant="outline">
           <RotateCcw className="mr-2 h-4 w-4" /> Start New Story
        </Button>
      </div>
    );
  }
  
  return <StoryNodeDisplay node={currentNodeData} onRestart={handleRestart} />;
}
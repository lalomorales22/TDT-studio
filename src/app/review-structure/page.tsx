'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StoryStructureOutput } from '@/ai/flows/generate-story-structure';
import { StoryStructureDisplay } from '@/components/story-structure-display';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateFullStoryAction } from '@/app/actions'; // Action to trigger full generation
import { ThumbsUp, RefreshCw, AlertTriangle } from 'lucide-react';


export default function ReviewStructurePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [structure, setStructure] = useState<StoryStructureOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false); // State for final generation step
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedStructure = sessionStorage.getItem("tieDyedTales_storyStructure");
    if (!storedStructure) {
      setError("No story structure found in session storage. Please go back and generate one.");
      setIsLoading(false);
      return;
    }

    try {
      const parsedStructure: StoryStructureOutput = JSON.parse(storedStructure);
      // Basic validation of parsed structure
      if (!parsedStructure || !parsedStructure.nodes || !parsedStructure.startNodeId || parsedStructure.nodes.length === 0) {
         throw new Error("Stored structure is invalid or empty.");
      }
      setStructure(parsedStructure);
    } catch (e) {
      console.error("Error parsing story structure from sessionStorage:", e);
      setError("Failed to load story structure. It might be corrupted. Please go back and regenerate.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleApproveAndGenerate = async () => {
    if (!structure) {
      toast({ variant: "destructive", title: "Error", description: "Cannot generate story without a valid structure." });
      return;
    }
    setIsGenerating(true); // Show generating loader

    // Call the action to generate the full story content
    const result = await generateFullStoryAction(structure);

    setIsGenerating(false); // Hide generating loader

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Failed to Generate Full Story",
        description: result.error,
      });
    } else if (result.success && result.story) {
       // Note: generateFullStoryAction's placeholder stores content in sessionStorage
       // We can rely on that for now until proper storage/state management is added.
       toast({
        title: "Story Generation Complete!",
        description: "Your full adventure is ready.",
       });
       // Navigate to the first page of the generated story
       router.push(`/story/${structure.startNodeId}`);
    } else {
       toast({
        variant: "destructive",
        title: "Generation Issue",
        description: "Something went wrong during full story generation. Please try again.",
       });
    }
  };

  const handleGoBack = () => {
    router.push('/'); // Navigate back to the setup form
  };

  if (isLoading) {
    return <Loader message="Loading story structure..." />;
  }

  if (isGenerating) {
    return <Loader message="Generating your full adventure... This may take some time!" />;
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto text-center shadow-xl border-destructive">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6" /> Error Loading Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-6">{error}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleGoBack} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Go Back to Setup
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!structure) {
    // Should be covered by error state, but as a fallback
    return <div className="text-center py-10">Could not load structure.</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">Review Your Story Outline</CardTitle>
        <CardDescription className="text-center">
          Here's the blueprint for your adventure! Review the nodes and decisions. If it looks good, approve it to generate the full story content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StoryStructureDisplay structure={structure} />
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6 border-t mt-6">
        <Button onClick={handleGoBack} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Go Back & Modify
        </Button>
        <Button onClick={handleApproveAndGenerate} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <ThumbsUp className="mr-2 h-4 w-4" /> Approve & Generate Full Story
        </Button>
      </CardFooter>
    </Card>
  );
}
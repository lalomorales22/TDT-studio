'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StoryStructureOutput, StoryStructureInput } from '@/ai/flows/generate-story-structure';
import { StoryStructureDisplay } from '@/components/story-structure-display';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateFullStoryAction, type FullStoryGenerationInput } from '@/app/actions';
import { ThumbsUp, RefreshCw, AlertTriangle } from 'lucide-react';


export default function ReviewStructurePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [structure, setStructure] = useState<StoryStructureOutput | null>(null);
  const [originalStoryInput, setOriginalStoryInput] = useState<StoryStructureInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedStructureStr = sessionStorage.getItem("tieDyedTales_storyStructure");
    const storedOriginalInputStr = sessionStorage.getItem("tieDyedTales_originalStoryInput");

    if (!storedStructureStr) {
      setError("No story structure found. Please go back and generate one.");
      setIsLoading(false);
      return;
    }
    if (!storedOriginalInputStr) {
      setError("Original story input not found. Please go back and re-submit the form.");
      setIsLoading(false);
      return;
    }

    try {
      const parsedStructure: StoryStructureOutput = JSON.parse(storedStructureStr);
      if (!parsedStructure || !parsedStructure.nodes || !parsedStructure.startNodeId || parsedStructure.nodes.length === 0) {
         throw new Error("Stored structure is invalid or empty.");
      }
      setStructure(parsedStructure);

      const parsedOriginalInput: StoryStructureInput = JSON.parse(storedOriginalInputStr);
      // Add basic validation for original input if necessary
      if (!parsedOriginalInput || !parsedOriginalInput.storyTitle) {
          throw new Error("Stored original input is invalid.");
      }
      setOriginalStoryInput(parsedOriginalInput);

    } catch (e) {
      console.error("Error parsing data from sessionStorage:", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(`Failed to load story data: ${message}. It might be corrupted. Please go back and regenerate.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleApproveAndGenerate = async () => {
    if (!structure || !originalStoryInput) {
      toast({ variant: "destructive", title: "Error", description: "Cannot generate story without valid structure and original input." });
      return;
    }
    setIsGenerating(true);

    const fullStoryInput: FullStoryGenerationInput = {
      structure,
      originalStoryInput
    };
    
    const result = await generateFullStoryAction(fullStoryInput);

    setIsGenerating(false);

    if (result.error && !result.success) { // Hard failure
      toast({
        variant: "destructive",
        title: "Failed to Generate Full Story",
        description: result.error,
      });
    } else if (result.success && result.fullStoryContent) {
       try {
        sessionStorage.setItem("tieDyedTales_fullStoryContent", JSON.stringify(result.fullStoryContent));
        sessionStorage.setItem("tieDyedTales_startNodeId", structure.startNodeId);
        // Also save the structure itself again, as the parser will need it alongside the full content
        sessionStorage.setItem("tieDyedTales_richStoryStructure", JSON.stringify(structure));


        let toastMessage = "Your full adventure is ready.";
        if (result.error) { // Partial success
            toastMessage = "Story generated with some issues. Some parts might be incomplete.";
             toast({
                variant: "default", // Not destructive for partial success
                title: "Story Generation Partially Complete",
                description: toastMessage,
             });
        } else {
            toast({
                title: "Story Generation Complete!",
                description: toastMessage,
            });
        }
        router.push(`/story/${structure.startNodeId}`);

       } catch (e) {
         console.error("Error saving full story to sessionStorage:", e);
         const message = e instanceof Error ? e.message : "Unknown error";
         toast({
            variant: "destructive",
            title: "Storage Error",
            description: `Failed to save the generated story: ${message}`,
         });
       }
    } else {
       toast({
        variant: "destructive",
        title: "Generation Issue",
        description: "Something went wrong during full story generation. No content returned. Please try again.",
       });
    }
  };

  const handleGoBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return <Loader message="Loading story data..." />;
  }

  if (isGenerating) {
    return <Loader message="Crafting your full adventure... This may take some time!" />;
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto text-center shadow-xl border-destructive">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6" /> Error Loading Data
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

  if (!structure || !originalStoryInput) {
    return <div className="text-center py-10">Could not load necessary story data.</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">Review Your Story Outline</CardTitle>
        <CardDescription className="text-center">
          This is the blueprint. If it looks good, approve it to generate the full narrative!
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

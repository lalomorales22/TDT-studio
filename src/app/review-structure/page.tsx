// @ts-nocheck
// TODO: Fix types
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StoryStructureOutput, StoryStructureInput, StoryNodeStructure } from '@/ai/flows/generate-story-structure';
import { StoryStructureDisplay } from '@/components/story-structure-display';
import Loader from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateNodesBatchAction } from '@/app/actions'; // Changed from generateFullStoryAction
import { ThumbsUp, RefreshCw, AlertTriangle } from 'lucide-react';

const BATCH_SIZE = 2; // Number of nodes to process per API call. Adjust based on performance/timeout limits.

export default function ReviewStructurePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [structure, setStructure] = useState<StoryStructureOutput | null>(null);
  const [originalStoryInput, setOriginalStoryInput] = useState<StoryStructureInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null); // For initial load errors
  const [generationError, setGenerationError] = useState<string | null>(null); // For errors during content generation
  const [currentProgress, setCurrentProgress] = useState(0);
  // const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({});


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
    // setGeneratedContent({}); // Clear previous content if any
    setCurrentProgress(0);
    setGenerationError(null);

    const totalNodes = structure.nodes.length;
    let allGeneratedContent: Record<string, string> = {};
    let nodesProcessedSuccessfullyCount = 0;
    let accumulatedBatchErrors: string[] = [];

    for (let i = 0; i < totalNodes; i += BATCH_SIZE) {
      const batchNodes = structure.nodes.slice(i, i + BATCH_SIZE);
      if (batchNodes.length === 0) continue;

      console.log(`Processing batch starting at index ${i}, size ${batchNodes.length}. Node IDs: ${batchNodes.map(n=>n.id).join(', ')}`);

      try {
        const batchResult = await generateNodesBatchAction(batchNodes, originalStoryInput);

        if (batchResult.batchContent) {
            allGeneratedContent = { ...allGeneratedContent, ...batchResult.batchContent };
            // A more precise count of "successful" nodes within this batch could be done
            // if batchResult.batchContent only includes successfully generated nodes.
            // Assuming for now all nodes in batchContent were at least attempted.
            const successfullyGeneratedInBatch = batchNodes.filter(node => 
                batchResult.batchContent?.[node.id] && !batchResult.batchContent[node.id].startsWith("[Content generation failed") && !batchResult.batchContent[node.id].startsWith("[Content generation critically failed")
            ).length;
            nodesProcessedSuccessfullyCount += successfullyGeneratedInBatch;
        }
        
        if (batchResult.error) {
            console.warn(`Error in batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchResult.error}`);
            accumulatedBatchErrors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchResult.error}`);
            // Placeholders for failed nodes in the batch are already in allGeneratedContent by generateNodesBatchAction
        }
      
        setCurrentProgress(Math.min(100, ((i + batchNodes.length) / totalNodes) * 100));

      } catch (e) { // Catch errors from the action call itself (network, unexpected server crash)
        const errorMsg = e instanceof Error ? e.message : "Unknown critical error processing batch";
        console.error(`Critical error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, e);
        accumulatedBatchErrors.push(`Critical error in Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMsg}`);
        // Add placeholders for all nodes in this failed batch
        batchNodes.forEach(node => {
          if (!allGeneratedContent[node.id]) { // Don't overwrite if it was already processed somehow (should not happen)
            allGeneratedContent[node.id] = `[Content generation critically failed for this section due to batch processing error. Original summary: ${node.summary}]`;
          }
        });
        setCurrentProgress(Math.min(100, ((i + batchNodes.length) / totalNodes) * 100)); // Update progress even on critical batch failure
        // Optionally, decide to break the loop on critical errors, for now, it continues.
      }
    }
    
    // setGeneratedContent(allGeneratedContent); // Store final accumulated content in state if needed for display before navigation
    const finalOverallError = accumulatedBatchErrors.join(' | ');
    if(finalOverallError) setGenerationError(finalOverallError);

    setIsGenerating(false);
    setCurrentProgress(100); // Ensure progress shows 100% at the end

    if (Object.keys(allGeneratedContent).length === 0 && finalOverallError) {
        toast({ variant: "destructive", title: "Full Story Generation Failed", description: `No content could be generated. Error: ${finalOverallError}`, duration: 9000 });
        return;
    }
    
    try {
      sessionStorage.setItem("tieDyedTales_fullStoryContent", JSON.stringify(allGeneratedContent));
      sessionStorage.setItem("tieDyedTales_startNodeId", structure.startNodeId);
      sessionStorage.setItem("tieDyedTales_richStoryStructure", JSON.stringify(structure)); // Save full structure for parser

      let toastMessage = "Your full adventure is ready to explore!";
      let toastTitle = "Story Generation Complete!";
      let toastVariant: "default" | "destructive" = "default";
      let duration = 5000;

      if (nodesProcessedSuccessfullyCount < totalNodes || finalOverallError) {
          toastTitle = "Story Generation Issues";
          toastMessage = `Story generated, but with some issues. ${nodesProcessedSuccessfullyCount}/${totalNodes} sections fully complete.`;
          if (finalOverallError) {
            toastMessage += ` Errors: ${finalOverallError.substring(0, 200)}${finalOverallError.length > 200 ? '...' : ''}`;
          }
          toastMessage += " Some parts might be missing or incomplete. Please review carefully.";
          // variant remains "default" for partial success, could be "warning" if we had one
          duration = 10000; // Longer toast for issues
      }

      toast({
          variant: toastVariant,
          title: toastTitle,
          description: toastMessage,
          duration: duration,
      });
      router.push(`/story/${structure.startNodeId}`);

    } catch (e) {
       console.error("Error saving full story to sessionStorage:", e);
       const message = e instanceof Error ? e.message : "Unknown error";
       toast({
          variant: "destructive",
          title: "Storage Error",
          description: `Failed to save the generated story: ${message}. The story might be lost.`,
          duration: 9000,
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
    return <Loader message="Crafting your full adventure..." progress={currentProgress} />;
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
    // This case should ideally be caught by the error state from useEffect if data is missing.
    return (
        <Card className="w-full max-w-2xl mx-auto text-center shadow-xl border-destructive">
            <CardHeader><CardTitle className="text-destructive">Missing Data</CardTitle></CardHeader>
            <CardContent><p>Could not load necessary story data. Please try returning to the setup page.</p></CardContent>
            <CardFooter className="flex justify-center">
                 <Button onClick={handleGoBack} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" /> Go Back to Setup
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">Review Your Story Outline</CardTitle>
        <CardDescription className="text-center">
          This is the blueprint. If it looks good, approve it to generate the full narrative!
          Story will be generated in batches of {BATCH_SIZE} nodes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StoryStructureDisplay structure={structure} />
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6 border-t mt-6">
        <Button onClick={handleGoBack} variant="outline" disabled={isGenerating}>
          <RefreshCw className="mr-2 h-4 w-4" /> Go Back & Modify
        </Button>
        <Button 
            onClick={handleApproveAndGenerate} 
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={isGenerating}
        >
          <ThumbsUp className="mr-2 h-4 w-4" /> 
          {isGenerating ? `Generating (${Math.round(currentProgress)}%)...` : "Approve & Generate Full Story"}
        </Button>
      </CardFooter>
    </Card>
  );
}

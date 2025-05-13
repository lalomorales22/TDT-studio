"use client";

import Link from 'next/link';
import type { StoryNodeData } from '@/types/story';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, RotateCcw } from 'lucide-react';

interface StoryNodeDisplayProps {
  node: StoryNodeData | null | undefined;
  onRestart: () => void;
}

export function StoryNodeDisplay({ node, onRestart }: StoryNodeDisplayProps) {
  if (!node) {
    return (
      <Card className="w-full max-w-2xl mx-auto text-center shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive">Error: Story Node Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>We couldn't find this part of the story. It might be a broken link or an issue with the story generation.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onRestart} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" /> Start New Story
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">{node.title || `Chapter: ${node.id}`}</CardTitle>
        {node.isEnding && (
           <CardDescription className="text-lg font-semibold text-accent pt-2">This is an Ending!</CardDescription>
        )}
      </CardHeader>
      <CardContent className="prose prose-lg dark:prose-invert max-w-none text-foreground/90 whitespace-pre-line">
        <p>{node.isEnding ? node.endingText || node.rawContent : node.rawContent}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 pt-6">
        {!node.isEnding && node.decisions.length > 0 && (
          <div className="w-full space-y-3">
            <h3 className="text-xl font-semibold text-center text-primary mb-3">What do you do?</h3>
            {node.decisions.map((decision, index) => (
              <Button key={index} asChild variant="default" size="lg" className="w-full justify-between group hover:bg-primary/90 transition-all duration-300 ease-in-out transform hover:scale-105">
                <Link href={`/story/${decision.nextNodeId}`} className="flex items-center">
                  <span>{decision.text}</span>
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            ))}
          </div>
        )}
        {(node.isEnding || node.decisions.length === 0) && (
           <Button onClick={onRestart} variant="outline" className="mt-4 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
             <RotateCcw className="mr-2 h-4 w-4" /> Start a New Adventure
           </Button>
        )}
      </CardFooter>
    </Card>
  );
}
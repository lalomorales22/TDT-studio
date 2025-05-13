import type { StoryStructureOutput, StoryNodeStructure } from '@/ai/flows/generate-story-structure';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, Circle, BookOpen } from 'lucide-react';

interface StoryStructureDisplayProps {
  structure: StoryStructureOutput;
}

export function StoryStructureDisplay({ structure }: StoryStructureDisplayProps) {
  const { nodes, startNodeId } = structure;

  const renderNode = (node: StoryNodeStructure) => (
    <AccordionItem key={node.id} value={node.id} className="border-b border-border/50 last:border-b-0">
      <AccordionTrigger className="text-left hover:no-underline px-4 py-3 hover:bg-muted/50 rounded-t-md">
        <div className="flex items-center gap-3 flex-grow w-full overflow-hidden">
          {node.id === startNodeId ? (
             <Badge variant="secondary" className="bg-primary/20 text-primary shrink-0">Start</Badge>
          ) : node.isEnding ? (
             <Badge variant="destructive" className="bg-accent/20 text-accent shrink-0">Ending</Badge>
          ) : (
            <Badge variant="outline" className="shrink-0">{node.decisions?.length ?? 0} Choice{node.decisions?.length !== 1 ? 's' : ''}</Badge>
          )}
          <span className="font-semibold text-lg text-foreground truncate">{node.title}</span>
          <span className="text-sm text-muted-foreground ml-2 mr-4 truncate">(ID: {node.id})</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pt-2 pb-4 bg-muted/20 rounded-b-md">
        <p className="text-sm text-foreground/90 mb-4 italic">{node.summary}</p>
        {!node.isEnding && node.decisions && node.decisions.length > 0 && (
          <div>
            <h4 className="text-md font-semibold mb-2 text-primary">Decisions:</h4>
            <ul className="space-y-2 pl-4">
              {node.decisions.map((decision, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="h-4 w-4 text-primary/80 shrink-0" />
                  <span>{decision.text}</span>
                  <span className="text-muted-foreground text-xs">(To: {decision.nextNodeId})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
         {node.isEnding && (
            <p className="text-sm font-medium text-accent flex items-center gap-1"><CheckCircle className="h-4 w-4"/> This is an ending node.</p>
         )}
         {!node.isEnding && (!node.decisions || node.decisions.length === 0) && (
             <p className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Circle className="h-4 w-4"/> This node leads directly to the next (no choices here).</p> // Or could be an implicit end? Logic depends on generator.
         )}
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <div className="space-y-4">
       <h3 className="text-xl font-semibold text-primary flex items-center gap-2 mb-4"><BookOpen className="h-5 w-5"/> Story Nodes</h3>
      <Accordion type="multiple" className="w-full border border-border rounded-lg shadow-inner bg-card">
        {nodes.map(renderNode)}
      </Accordion>
    </div>
  );
}
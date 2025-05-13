"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateStoryAction } from "@/app/actions";
import Loader from "@/components/loader";
import type { StoryInput } from "@/ai/flows/story-and-structure-generation";
import { parseStory } from "@/lib/story-parser"; // Added import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


// Define Zod schema based on StoryInput, making optional fields truly optional for the form
const formSchema = z.object({
  storyTitle: z.string().min(3, { message: "Story title must be at least 3 characters." }),
  genre: z.string().min(3, { message: "Genre must be at least 3 characters." }),
  targetAudience: z.string().min(3, { message: "Target audience must be at least 3 characters." }),
  protagonistName: z.string().min(2, { message: "Protagonist name must be at least 2 characters." }),
  protagonistDescription: z.string().min(10, { message: "Protagonist description is too short." }),
  keyMotivation: z.string().min(5, { message: "Key motivation is too short." }),
  primaryLocation: z.string().min(5, { message: "Primary location is too short." }),
  atmosphereMood: z.string().min(5, { message: "Atmosphere/mood is too short." }),
  keyFeatures: z.string().min(5, { message: "Key features are too short." }),
  supportingCharacterName: z.string().optional(),
  supportingCharacterRole: z.string().optional(),
  supportingCharacterDescription: z.string().optional(),
  keyItemName: z.string().optional(),
  keyItemSignificance: z.string().optional(),
  coreConflict: z.string().min(10, { message: "Core conflict is too short." }),
  desiredStoryLength: z.enum(['Short', 'Medium', 'Long']),
  desiredEndings: z.string().min(1, { message: "Please specify desired number of endings (e.g., '2', '3+')." }),
  writingStyle: z.string().min(5, { message: "Writing style description is too short." }),
});

type FormValues = z.infer<typeof formSchema>;

export function StorySetupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      storyTitle: "",
      genre: "Fantasy",
      targetAudience: "Teens (13-18)",
      protagonistName: "",
      protagonistDescription: "",
      keyMotivation: "",
      primaryLocation: "",
      atmosphereMood: "Mysterious",
      keyFeatures: "",
      supportingCharacterName: "",
      supportingCharacterRole: "",
      supportingCharacterDescription: "",
      keyItemName: "",
      keyItemSignificance: "",
      coreConflict: "",
      desiredStoryLength: "Medium",
      desiredEndings: "3",
      writingStyle: "Descriptive and immersive",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    const result = await generateStoryAction(data as StoryInput);
    setIsLoading(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Failed to generate story",
        description: result.error,
      });
    } else if (result.story) {
      try {
        sessionStorage.setItem("tieDyedTales_currentStory", result.story);
        
        const { storyMap: parsedMap, startNodeId: actualStartNodeId } = parseStory(result.story);

        if (!actualStartNodeId || parsedMap.size === 0) {
          console.error("Failed to parse story or find a start node. StoryMap size:", parsedMap.size, "StartNodeId:", actualStartNodeId);
          toast({
            variant: "destructive",
            title: "Parsing Error",
            description: "Story generated, but could not be parsed correctly. The content might be malformed, empty, or no start node found. Please try again.",
          });
          return; 
        }
        
        // If actualStartNodeId is non-null and parsedMap is not empty, 
        // actualStartNodeId IS a key in parsedMap by definition of parseStory.
        toast({
          title: "Story Generated!",
          description: "Your adventure awaits!",
        });
        router.push(`/story/${actualStartNodeId}`);

      } catch (e) {
        console.error("Error processing story result:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        toast({
          variant: "destructive",
          title: "Error Processing Story",
          description: `An error occurred while trying to display the story: ${errorMessage}. Please try again.`,
        });
      }
    }
  };

  if (isLoading) {
    return <Loader message="Crafting your unique adventure..." />;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">Create Your Tale</CardTitle>
        <CardDescription className="text-center">Fill in the details below to generate your unique choose your own adventure story!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="storyTitle" render={({ field }) => (
              <FormItem>
                <FormLabel>Story Title</FormLabel>
                <FormControl><Input placeholder="The Mystery of the Whispering Woods" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <div className="grid md:grid-cols-2 gap-8">
              <FormField control={form.control} name="genre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Genre</FormLabel>
                  <FormControl><Input placeholder="Fantasy, Sci-Fi, Mystery" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="targetAudience" render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <FormControl><Input placeholder="Kids (8-12), Teens, Adults" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="protagonistName" render={({ field }) => (
              <FormItem>
                <FormLabel>Protagonist Name</FormLabel>
                <FormControl><Input placeholder="Elara" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="protagonistDescription" render={({ field }) => (
              <FormItem>
                <FormLabel>Protagonist Description</FormLabel>
                <FormControl><Textarea placeholder="A brave but naive young adventurer..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="keyMotivation" render={({ field }) => (
              <FormItem>
                <FormLabel>Key Motivation</FormLabel>
                <FormControl><Input placeholder="To save their village, find treasure..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <h3 className="text-xl font-semibold text-primary pt-4 border-t mt-6">Setting Details</h3>
            <FormField control={form.control} name="primaryLocation" render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Location(s)</FormLabel>
                <FormControl><Input placeholder="An ancient forest, a futuristic city..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="atmosphereMood" render={({ field }) => (
              <FormItem>
                <FormLabel>Atmosphere/Mood</FormLabel>
                <FormControl><Input placeholder="Mysterious, exciting, eerie..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="keyFeatures" render={({ field }) => (
              <FormItem>
                <FormLabel>Key Features of Setting</FormLabel>
                <FormControl><Textarea placeholder="A hidden temple, secret passages..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <h3 className="text-xl font-semibold text-primary pt-4 border-t mt-6">Optional Details</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <FormField control={form.control} name="supportingCharacterName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Supporting Character Name (Optional)</FormLabel>
                  <FormControl><Input placeholder="Zaltar" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supportingCharacterRole" render={({ field }) => (
                <FormItem>
                  <FormLabel>Supporting Character Role (Optional)</FormLabel>
                  <FormControl><Input placeholder="Wise old mentor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="supportingCharacterDescription" render={({ field }) => (
              <FormItem>
                <FormLabel>Supporting Character Description (Optional)</FormLabel>
                <FormControl><Textarea placeholder="Possesses ancient knowledge..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
             <div className="grid md:grid-cols-2 gap-8">
                <FormField control={form.control} name="keyItemName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Key Item Name (Optional)</FormLabel>
                    <FormControl><Input placeholder="The Sunstone Amulet" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="keyItemSignificance" render={({ field }) => (
                <FormItem>
                    <FormLabel>Key Item Significance (Optional)</FormLabel>
                    <FormControl><Input placeholder="Glows near danger, unlocks doors" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>


            <h3 className="text-xl font-semibold text-primary pt-4 border-t mt-6">Story Structure</h3>
            <FormField control={form.control} name="coreConflict" render={({ field }) => (
              <FormItem>
                <FormLabel>Core Conflict/Inciting Incident</FormLabel>
                <FormControl><Textarea placeholder="A dark shadow falls, a strange signal received..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid md:grid-cols-2 gap-8">
              <FormField control={form.control} name="desiredStoryLength" render={({ field }) => (
                <FormItem>
                  <FormLabel>Desired Story Length</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select length" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Short">Short (approx. 5-10 pages)</SelectItem>
                      <SelectItem value="Medium">Medium (approx. 15-25 pages)</SelectItem>
                      <SelectItem value="Long">Long (approx. 30+ pages)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="desiredEndings" render={({ field }) => (
                <FormItem>
                  <FormLabel>Desired Number of Endings</FormLabel>
                  <FormControl><Input placeholder="e.g., 2, 3, 4+" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="writingStyle" render={({ field }) => (
              <FormItem>
                <FormLabel>Writing Style</FormLabel>
                <FormControl><Input placeholder="Descriptive and immersive, fast-paced..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 mt-8" disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate My Tie-Dyed Tale!"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

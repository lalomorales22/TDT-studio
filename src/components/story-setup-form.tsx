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
import { generateStoryStructureAction } from "@/app/actions";
import Loader from "@/components/loader";
import type { StoryStructureInput } from "@/ai/flows/generate-story-structure";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Define Zod schema based on StoryStructureInput
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
      storyTitle: "The Quest for the Sunstone",
      genre: "Fantasy Adventure",
      targetAudience: "Teens (13-18)",
      protagonistName: "Elara",
      protagonistDescription: "A curious and nimble rogue with a mysterious past, seeking answers.",
      keyMotivation: "To find the legendary Sunstone to heal her ailing sibling.",
      primaryLocation: "The enchanted Whispering Woods and the treacherous Sky Peaks.",
      atmosphereMood: "Mysterious and adventurous",
      keyFeatures: "A hidden Elven city, ancient ruins guarded by riddles, a grumpy talking squirrel guide.",
      supportingCharacterName: "Borin",
      supportingCharacterRole: "Grumpy dwarf warrior, indebted to Elara",
      supportingCharacterDescription: "Gruff exterior, loyal heart, skilled axe-wielder.",
      keyItemName: "Map Fragment",
      keyItemSignificance: "Shows a partial route to the Sunstone's last known location.",
      coreConflict: "A shadowy cult also seeks the Sunstone for nefarious purposes, racing against Elara.",
      desiredStoryLength: "Medium",
      desiredEndings: "3",
      writingStyle: "Descriptive and immersive with moments of humor.",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    const result = await generateStoryStructureAction(data as StoryStructureInput);
    setIsLoading(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Failed to generate story structure",
        description: result.error,
      });
    } else if (result.structure) {
      try {
        // Store the generated structure for the review page
        sessionStorage.setItem("tieDyedTales_storyStructure", JSON.stringify(result.structure));
        // Store the original form input for the full content generation step
        sessionStorage.setItem("tieDyedTales_originalStoryInput", JSON.stringify(data));

        toast({
          title: "Story Structure Generated!",
          description: "Review the outline for your adventure.",
        });
        router.push(`/review-structure`);

      } catch (e) {
        console.error("Error processing story structure result:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        toast({
          variant: "destructive",
          title: "Error Processing Structure",
          description: `An error occurred: ${errorMessage}. Please try again.`,
        });
      }
    } else {
       toast({
        variant: "destructive",
        title: "Structure Generation Failed",
        description: "The AI response was received but did not contain a valid structure. Please try again.",
      });
    }
  };

  if (isLoading) {
    return <Loader message="Designing your story's blueprint..." />;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center text-primary">Create Your Tale</CardTitle>
        <CardDescription className="text-center">Fill in the details below to generate the structural outline for your unique choose your own adventure story!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Info */}
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

             {/* Protagonist */}
             <h3 className="text-xl font-semibold text-primary pt-4 border-t mt-6">Protagonist</h3>
             <FormField control={form.control} name="protagonistName" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Elara" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="protagonistDescription" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
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

            {/* Setting */}
            <h3 className="text-xl font-semibold text-primary pt-4 border-t mt-6">Setting</h3>
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
                <FormLabel>Key Features</FormLabel>
                <FormControl><Textarea placeholder="A hidden temple, secret passages..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Optional Details */}
            <h3 className="text-xl font-semibold text-primary pt-4 border-t mt-6">Optional Details</h3>
             {/* Supporting Character */}
            <h4 className="text-lg font-medium text-primary/90">Supporting Character</h4>
            <div className="grid md:grid-cols-2 gap-8">
              <FormField control={form.control} name="supportingCharacterName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input placeholder="Zaltar" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supportingCharacterRole" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl><Input placeholder="Wise old mentor" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="supportingCharacterDescription" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Possesses ancient knowledge..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

             {/* Key Item */}
            <h4 className="text-lg font-medium text-primary/90 pt-4">Key Item</h4>
             <div className="grid md:grid-cols-2 gap-8">
                <FormField control={form.control} name="keyItemName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="The Sunstone Amulet" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
                <FormField control={form.control} name="keyItemSignificance" render={({ field }) => (
                <FormItem>
                    <FormLabel>Significance/Powers</FormLabel>
                    <FormControl><Input placeholder="Glows near danger, unlocks doors" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )} />
            </div>


            {/* Story Structure */}
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
                  <FormLabel>Desired Outline Length</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select length" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Short">Short (~5-10 nodes)</SelectItem>
                      <SelectItem value="Medium">Medium (~15-25 nodes)</SelectItem>
                      <SelectItem value="Long">Long (~30+ nodes)</SelectItem>
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
                <FormLabel>Writing Style (for final story)</FormLabel>
                 <FormDescription>This guides the tone when the full story is generated later.</FormDescription>
                <FormControl><Input placeholder="Descriptive and immersive, fast-paced..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 mt-8" disabled={isLoading}>
              {isLoading ? "Generating Outline..." : "Generate Story Outline"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

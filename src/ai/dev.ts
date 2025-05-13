import { config } from 'dotenv';
config();

// Register your flows and tools for development inspection.
import '@/ai/flows/generate-story-structure.ts';
import '@/ai/flows/generate-node-content.ts';

console.log("Registered flows for development inspection.");

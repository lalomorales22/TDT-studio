import { config } from 'dotenv';
config();

// Register your flows and tools for development inspection.
import '@/ai/flows/generate-story-structure.ts';
// import '@/ai/flows/generate-node-content.ts'; // Add when created

console.log("Registered flows for development inspection.");
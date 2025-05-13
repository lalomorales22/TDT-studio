# Tie-Dyed Tales

Tie-Dyed Tales is a Next.js web application that empowers users to create their own "Choose Your Own Adventure" style stories with the help of AI. Leveraging Google's Genkit, users can define story parameters, generate a branching narrative structure, and then produce the full story content for an interactive reading experience.

## Core Features

*   **Story Setup Form**: A comprehensive form allowing users to input details such as story title, genre, target audience, protagonist information, setting, mood, and other key elements to shape their narrative.
*   **AI-Powered Story Structure Generation**: Utilizes Genkit to process user inputs and generate a complete "Choose Your Own Adventure" story outline. This includes defining story nodes (chapters/segments), their titles, brief summaries, decision points, and potential outcomes/endings.
*   **AI-Powered Full Story Generation**: Once the structure is approved, the application uses Genkit to generate the full narrative content for each node in the story, taking into account the overall context and user-defined writing style.
*   **Interactive Story Display**: Presents the generated story to the user one segment at a time, offering choices that lead to different branches of the narrative.
*   **Branching Navigation**: A system that allows users to navigate through the story based on the decisions they make, experiencing different paths and endings.
*   **State Saving**: Uses browser `sessionStorage` to save the user's current story setup, generated structure, and full story content, allowing them to review, generate, and read their story within a single session. Story progress (current node) is managed via URL parameters.

## Tech Stack

*   **Framework**: Next.js (App Router)
*   **Language**: TypeScript
*   **AI Integration**: Genkit (with Google AI models like Gemini)
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS
*   **Form Handling**: React Hook Form with Zod for validation

## Getting Started

### Prerequisites

*   Node.js (version specified in `.nvmrc` or a recent LTS version)
*   npm or yarn

### Environment Variables
Create a `.env` file in the root of the project and add your Google AI API Key:
```
GOOGLE_API_KEY=your_google_ai_api_key_here
```

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/lalomorales22/Tie-Dyed-Tales.git
    cd Tie-Dyed-Tales
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    # yarn install
    ```

### Running the Development Server

1.  **Start the Genkit development server (in a separate terminal):**
    This server allows Genkit flows to be called by the Next.js application.
    ```bash
    npm run genkit:dev
    # or for auto-reloading on changes
    # npm run genkit:watch
    ```
2.  **Start the Next.js development server (in another terminal):**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    The application will typically be available at `http://localhost:9002`.

## Project Structure

*   `src/app/`: Contains the main application pages and layouts (using Next.js App Router).
    *   `page.tsx`: The main story setup form page.
    *   `review-structure/page.tsx`: Page for users to review the AI-generated story outline.
    *   `story/[nodeId]/page.tsx`: Page for interactively reading the generated story.
    *   `actions.ts`: Server Actions for handling AI generation requests.
*   `src/components/`: Reusable React components.
    *   `ui/`: ShadCN UI components.
    *   Other custom components like `story-setup-form.tsx`, `story-structure-display.tsx`, `story-node-display.tsx`, `loader.tsx`, `header.tsx`.
*   `src/ai/`: Genkit related files.
    *   `genkit.ts`: Genkit initialization and configuration.
    *   `flows/`: Contains the Genkit flows for generating story structure and node content.
        *   `generate-story-structure.ts`: Flow for creating the story outline.
        *   `generate-node-content.ts`: Flow for writing the narrative for individual story nodes.
*   `src/lib/`: Utility functions and type definitions.
    *   `story-parser.ts`: Logic for parsing the generated story data for display.
    *   `utils.ts`: General utility functions (e.g., `cn` for classnames).
*   `src/types/`: TypeScript type definitions, e.g., `story.ts`.
*   `public/`: Static assets.

## How It Works

1.  **User Input**: The user fills out the `StorySetupForm` with their story ideas.
2.  **Structure Generation**: On submission, the `generateStoryStructureAction` Server Action calls the `generateStoryStructure` Genkit flow. This flow prompts an AI model to create a branching outline (nodes, titles, summaries, decisions) based on the input.
3.  **Review Structure**: The generated structure is displayed on the `review-structure` page using `StoryStructureDisplay`.
4.  **Full Story Generation**: If the user approves the structure, the `generateNodesBatchAction` Server Action is called repeatedly. This action invokes the `generateNodeContent` Genkit flow for batches of nodes to write the detailed narrative for each part of the story.
5.  **Interactive Reading**: The complete story (structure and content) is stored in `sessionStorage`. The `story/[nodeId]` page uses `StoryNodeDisplay` and `story-parser` to render the current story segment and navigation options. User choices update the URL, leading to the next part of the adventure.

This project demonstrates how to integrate AI text generation into a web application to create dynamic and personalized content.

import { GoogleGenAI } from "@google/genai";
import { Coordinates } from "../types";

// FIX: Switched from `process.env.API_KEY` to `import.meta.env.VITE_API_KEY`
// to correctly access client-side environment variables in a Vite-based setup,
// resolving the "API Key must be set" error.
const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_API_KEY! });

/**
 * Generates a creative icebreaker message to start a conversation.
 * @param userName The name of the user to start a conversation with.
 * @returns A promise that resolves to the generated message string.
 */
export const generateIcebreaker = async (userName: string): Promise<string> => {
  try {
    const prompt = `Crie uma mensagem curta, amigável e criativa para iniciar uma conversa com ${userName} em um aplicativo de conhecer pessoas. Seja casual e divertido. Retorne apenas o texto da mensagem.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating icebreaker with Gemini:", error);
    // Provide a fallback message in case of an API error
    return "Oi! Tudo bem?";
  }
};

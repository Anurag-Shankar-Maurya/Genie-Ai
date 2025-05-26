
import { GoogleGenAI, Chat, Part, GenerateContentResponse } from "@google/genai";
import { MessageRole } from '../types'; // Ensure MessageRole is imported if used here, though it's mainly for App state

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY for Gemini is not set. Please set the process.env.API_KEY environment variable.");
  // Potentially throw an error or handle this state in the UI
}

const ai = new GoogleGenAI({ apiKey: API_KEY! }); // Non-null assertion as we check above / assume it's set

// The 'model' variable below was unused and followed an incorrect pattern for model access.
// It has been removed. Model strings are specified directly in API calls like createChatSession or generateContent.

export const createChatSession = (history: { role: 'user' | 'model'; parts: Part[] }[] = []): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash-preview-04-17', // Use the correct model string here
    history: history,
    // config: { systemInstruction: "You are Genie, a helpful AI assistant." } // Optional system instruction
  });
};

export const sendMessageStream = async (
  chat: Chat,
  message: string
): Promise<AsyncIterable<GenerateContentResponse>> => {
  try {
    const result = await chat.sendMessageStream({ message: message });
    return result;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    // Create a mock stream with an error message
    // This is a bit tricky, as GenerateContentStreamResult is an async iterator
    // A simpler approach might be to throw and let the caller handle it by updating UI state
    throw error; 
  }
};

// For single, non-streamed messages if needed in future, or for specific tasks like titling.
export const generateContent = async (prompt: string): Promise<GenerateContentResponse> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
    });
    return response;
  } catch (error) {
    console.error("Error generating content from Gemini:", error);
    throw error;
  }
}

export default {
  createChatSession,
  sendMessageStream,
  generateContent,
};

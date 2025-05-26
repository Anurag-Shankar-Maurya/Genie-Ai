
import { GoogleGenAI, Chat, Part, GenerateContentResponse, Content, SendMessageParameters } from "@google/genai";
// MessageRole is not directly used in this service, it's for App state.

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY for Gemini is not set. Please set the process.env.API_KEY environment variable.");
  // This error should be handled more gracefully in the UI, perhaps by App.tsx checking and showing a global error.
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const createChatSession = (modelId: string, history: Content[] = []): Chat => {
  return ai.chats.create({
    model: modelId,
    history: history,
  });
};

export const sendMessageStream = async (
  chat: Chat,
  parts: Part[] // Accept an array of Parts for text and/or image
): Promise<AsyncIterable<GenerateContentResponse>> => {
  try {
    // The sendMessageStream method of a Chat instance accepts SendMessageParameters
    // which has a `message` property that can be a string or Part[]
    const params: SendMessageParameters = { message: parts };
    const result = await chat.sendMessageStream(params);
    return result;
  } catch (error) {
    console.error("Error sending message stream to Gemini:", error);
    throw error;
  }
};

export const generateContent = async (modelId: string, prompt: string | Part[]): Promise<GenerateContentResponse> => {
  try {
    const response = await ai.models.generateContent({
        model: modelId,
        contents: typeof prompt === 'string' ? [{ parts: [{text: prompt}] }] : [{ parts: prompt }],
    });
    return response;
  } catch (error) {
    console.error("Error generating content from Gemini:", error);
    throw error;
  }
};

export default {
  createChatSession,
  sendMessageStream,
  generateContent,
};
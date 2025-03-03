import { createOpenAI } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { fireworks } from '@ai-sdk/fireworks';
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';

const openai = createOpenAI({
   'baseURL': 'http://localhost:11434/v1',
   'apiKey': 'dontcare'
})


export const DEFAULT_CHAT_MODEL: string = 'chat-model-small';

export const myProvider = customProvider({
  languageModels: {
    'chat-model-small': openai('llama3.1_cwin'),
    'gemini': google('gemini-2.0-flash-exp'),
    'title-model': google('gemini-2.0-flash-exp'),
    'artifact-model' : google('gemini-2.0-flash-exp')
  }
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model-small',
    name: 'llama3.1_cwin',
    description: 'Small model for fast, lightweight tasks',
  },
  {
    id: 'gemini',
    name: 'gemini-2.0-flash-exp',
    description: 'Gemini flash 2.0',
  },

];


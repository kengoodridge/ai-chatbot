import { z } from 'zod';
import { streamObject } from 'ai';
import { myProvider } from '@/lib/ai/models';
import { projectsPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';

export const projectsDocumentHandler = createDocumentHandler<'projects'>({
  kind: 'projects',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: projectsPrompt,
      prompt: title,
      schema: z.object({
        content: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { content } = object;

        if (content) {
          dataStream.writeData({
            type: 'text-delta',
            content: content ?? '',
          });

          draftContent = content;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'projects'),
      prompt: description,
      schema: z.object({
        content: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { content } = object;

        if (content) {
          dataStream.writeData({
            type: 'text-delta',
            content: content ?? '',
          });

          draftContent = content;
        }
      }
    }

    return draftContent;
  },
});
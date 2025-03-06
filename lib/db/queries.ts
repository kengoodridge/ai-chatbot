import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { createId } from '@paralleldrive/cuid2';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
  project,
  type Project,
  page,
  type Page,
  endpoint,
  type Endpoint,
} from './schema';
import { ArtifactKind } from '@/components/artifact';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = createClient({
  url: process.env.DATABASE_URL || 'file:./local.db',
});
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    if (!messages || messages.length === 0) {
      console.log('No messages to save');
      return { success: true };
    }
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}): Promise<any> {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    if (!suggestions || suggestions.length === 0) {
      console.log('No suggestions to save');
      return { success: true };
    }
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function createProject({
  name,
  description,
  userId,
}: {
  name: string;
  description?: string;
  userId: string;
}): Promise<Project> {
  try {
    // Generate a new ID for the project
    const id = createId();
    
    const newProject: Project = {
      id,
      name,
      description: description || '',
      userId,
      createdAt: new Date(),
    };
    await db.insert(project).values(newProject);
    return newProject;
  } catch (error) {
    console.error('Failed to create project in database');
    throw error;
  }
}

export async function getProjectById({ id }: { id: string }): Promise<Project | undefined> {
  try {
    const [result] = await db
      .select({
        id: project.id,
        name: project.name,
        description: project.description,
        userId: project.userId,
        createdAt: project.createdAt,
        userEmail: user.email
      })
      .from(project)
      .leftJoin(user, eq(project.userId, user.id))
      .where(eq(project.id, id));
    
    // Convert null to undefined for userEmail
    const selectedProject: Project = {
      id: result.id,
      name: result.name,
      description: result.description,
      userId: result.userId,
      createdAt: result.createdAt,
      userEmail: result.userEmail ?? undefined
    };
    
    return selectedProject;
  } catch (error) {
    console.error('Failed to get project by id from database');
    throw error;
  }
}

export async function getProjectsByUserId({ id }: { id: string }): Promise<Project[]> {
  try {
    const results = await db
      .select({
        id: project.id,
        name: project.name,
        description: project.description,
        userId: project.userId,
        createdAt: project.createdAt,
        userEmail: user.email
      })
      .from(project)
      .leftJoin(user, eq(project.userId, user.id))
      .where(eq(project.userId, id))
      .orderBy(desc(project.createdAt));
      
    // Convert null to undefined for userEmail in each result
    return results.map(result => ({
      id: result.id,
      name: result.name,
      description: result.description,
      userId: result.userId,
      createdAt: result.createdAt,
      userEmail: result.userEmail ?? undefined
    }));
  } catch (error) {
    console.error('Failed to get projects by user from database');
    throw error;
  }
}

export async function updateProject({
  id,
  name,
  description,
  userId,
}: {
  id: string;
  name?: string;
  description?: string;
  userId: string;
}): Promise<boolean> {
  try {
    const updateData: Partial<Project> = {};
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    if (Object.keys(updateData).length === 0) {
      return false;
    }
    
    // Only update if the project belongs to the user
    const result = await db
      .update(project)
      .set(updateData)
      .where(and(eq(project.id, id), eq(project.userId, userId)));
    
    // Check if any rows were affected (returns 0 if no rows matched the condition)
    return result.rowsAffected > 0;
  } catch (error) {
    console.error('Failed to update project in database');
    throw error;
  }
}

export async function deleteProject({ id, userId }: { id: string, userId: string }): Promise<boolean> {
  try {
    // Only delete if the project belongs to the user
    const result = await db
      .delete(project)
      .where(and(eq(project.id, id), eq(project.userId, userId)));
    
    // Check if any rows were affected (returns 0 if no rows matched the condition)
    return result.rowsAffected > 0;
  } catch (error) {
    console.error('Failed to delete project from database');
    throw error;
  }
}

// Page API functions

export async function createPage({
  path,
  htmlContent,
  projectId,
  userId,
}: {
  path: string;
  htmlContent: string;
  projectId: string;
  userId: string;
}): Promise<Page> {
  try {
    // Generate a new ID for the page
    const id = createId();
    
    const newPage = {
      id,
      path,
      htmlContent,
      projectId,
      userId,
      createdAt: new Date(),
    };
    await db.insert(page).values(newPage);
    return newPage;
  } catch (error) {
    console.error('Failed to create page in database');
    throw error;
  }
}

// Endpoint API functions

export async function createEndpoint({
  path,
  parameters,
  code,
  httpMethod,
  language = 'javascript',
  projectId,
  userId,
}: {
  path: string;
  parameters: string[];
  code: string;
  httpMethod: string;
  language?: 'javascript' | 'python';
  projectId: string;
  userId: string;
}): Promise<Endpoint> {
  try {
    // Generate a new ID for the endpoint
    const id = createId();
    
    const newEndpoint = {
      id,
      path,
      parameters: parameters.join(','),
      code,
      httpMethod,
      language,
      projectId,
      userId,
      createdAt: new Date(),
    };
    await db.insert(endpoint).values(newEndpoint);
    return newEndpoint;
  } catch (error) {
    console.error('Failed to create endpoint in database');
    throw error;
  }
}

export async function getPageById({ id }: { id: string }): Promise<Page | undefined> {
  try {
    const [result] = await db
      .select({
        id: page.id,
        path: page.path,
        htmlContent: page.htmlContent,
        projectId: page.projectId,
        userId: page.userId,
        createdAt: page.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(page)
      .leftJoin(project, eq(page.projectId, project.id))
      .leftJoin(user, eq(page.userId, user.id))
      .where(eq(page.id, id));
    
    if (!result) return undefined;
    
    // Convert result to correct type
    const selectedPage: Page = {
      id: result.id,
      path: result.path,
      htmlContent: result.htmlContent,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    };
    return selectedPage;
  } catch (error) {
    console.error('Failed to get page by id from database');
    throw error;
  }
}

export async function getPageByPath({ path }: { path: string }): Promise<Page | undefined> {
  try {
    const [result] = await db
      .select({
        id: page.id,
        path: page.path,
        htmlContent: page.htmlContent,
        projectId: page.projectId,
        userId: page.userId,
        createdAt: page.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(page)
      .leftJoin(project, eq(page.projectId, project.id))
      .leftJoin(user, eq(page.userId, user.id))
      .where(eq(page.path, path));
    
    if (!result) return undefined;
    
    // Convert result to correct type
    const selectedPage: Page = {
      id: result.id,
      path: result.path,
      htmlContent: result.htmlContent,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    };
    return selectedPage;
  } catch (error) {
    console.error('Failed to get page by path from database');
    throw error;
  }
}

export async function getPagesByProjectId({ projectId }: { projectId: string }): Promise<Page[]> {
  try {
    const results = await db
      .select({
        id: page.id,
        path: page.path,
        htmlContent: page.htmlContent,
        projectId: page.projectId,
        userId: page.userId,
        createdAt: page.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(page)
      .leftJoin(project, eq(page.projectId, project.id))
      .leftJoin(user, eq(page.userId, user.id))
      .where(eq(page.projectId, projectId))
      .orderBy(desc(page.createdAt));
      
    // Convert results to correct type
    return results.map(result => ({
      id: result.id,
      path: result.path,
      htmlContent: result.htmlContent,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    }));
  } catch (error) {
    console.error('Failed to get pages by project from database');
    throw error;
  }
}

export async function getPagesByUserId({ userId }: { userId: string }): Promise<Page[]> {
  try {
    const results = await db
      .select({
        id: page.id,
        path: page.path,
        htmlContent: page.htmlContent,
        projectId: page.projectId,
        userId: page.userId,
        createdAt: page.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(page)
      .leftJoin(project, eq(page.projectId, project.id))
      .leftJoin(user, eq(page.userId, user.id))
      .where(eq(page.userId, userId))
      .orderBy(desc(page.createdAt));
      
    // Convert results to correct type
    return results.map(result => ({
      id: result.id,
      path: result.path,
      htmlContent: result.htmlContent,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    }));
  } catch (error) {
    console.error('Failed to get pages by user from database');
    throw error;
  }
}

export async function getAllPages(): Promise<Page[]> {
  try {
    const results = await db
      .select({
        id: page.id,
        path: page.path,
        htmlContent: page.htmlContent,
        projectId: page.projectId,
        userId: page.userId,
        createdAt: page.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(page)
      .leftJoin(project, eq(page.projectId, project.id))
      .leftJoin(user, eq(page.userId, user.id))
      .orderBy(desc(page.createdAt));
      
    // Convert results to correct type
    return results.map(result => ({
      id: result.id,
      path: result.path,
      htmlContent: result.htmlContent,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    }));
  } catch (error) {
    console.error('Failed to get all pages from database');
    throw error;
  }
}

export async function updatePage({
  id,
  path,
  htmlContent,
  userId,
}: {
  id: string;
  path?: string;
  htmlContent?: string;
  userId: string;
}): Promise<boolean> {
  try {
    const updateData: Partial<Page> = {};
    
    if (path) updateData.path = path;
    if (htmlContent !== undefined) updateData.htmlContent = htmlContent;
    
    if (Object.keys(updateData).length === 0) {
      return false;
    }
    
    // Only update if the page belongs to the user
    const result = await db
      .update(page)
      .set(updateData)
      .where(and(eq(page.id, id), eq(page.userId, userId)));
    
    // Check if any rows were affected (returns 0 if no rows matched the condition)
    return result.rowsAffected > 0;
  } catch (error) {
    console.error('Failed to update page in database');
    throw error;
  }
}

export async function deletePage({ id, userId }: { id: string, userId: string }): Promise<boolean> {
  try {
    // Only delete if the page belongs to the user
    const result = await db
      .delete(page)
      .where(and(eq(page.id, id), eq(page.userId, userId)));
    
    // Check if any rows were affected (returns 0 if no rows matched the condition)
    return result.rowsAffected > 0;
  } catch (error) {
    console.error('Failed to delete page from database');
    throw error;
  }
}

export async function getEndpointById({ id }: { id: string }): Promise<Endpoint | undefined> {
  try {
    const [result] = await db
      .select({
        id: endpoint.id,
        path: endpoint.path,
        parameters: endpoint.parameters,
        code: endpoint.code,
        httpMethod: endpoint.httpMethod,
        projectId: endpoint.projectId,
        userId: endpoint.userId,
        createdAt: endpoint.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(endpoint)
      .leftJoin(project, eq(endpoint.projectId, project.id))
      .leftJoin(user, eq(endpoint.userId, user.id))
      .where(eq(endpoint.id, id));
      
    if (!result) return undefined;
    
    // Convert result to correct type
    const selectedEndpoint: Endpoint = {
      id: result.id,
      path: result.path,
      parameters: result.parameters,
      code: result.code,
      httpMethod: result.httpMethod,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    };
    return selectedEndpoint;
  } catch (error) {
    console.error('Failed to get endpoint by id from database');
    throw error;
  }
}

export async function getEndpointByPath({ path }: { path: string }): Promise<Endpoint | undefined> {
  try {
    const [result] = await db
      .select({
        id: endpoint.id,
        path: endpoint.path,
        parameters: endpoint.parameters,
        code: endpoint.code,
        httpMethod: endpoint.httpMethod,
        projectId: endpoint.projectId,
        userId: endpoint.userId,
        createdAt: endpoint.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(endpoint)
      .leftJoin(project, eq(endpoint.projectId, project.id))
      .leftJoin(user, eq(endpoint.userId, user.id))
      .where(eq(endpoint.path, path));
      
    if (!result) return undefined;
    
    // Convert result to correct type
    const selectedEndpoint: Endpoint = {
      id: result.id,
      path: result.path,
      parameters: result.parameters,
      code: result.code,
      httpMethod: result.httpMethod,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    };
    return selectedEndpoint;
  } catch (error) {
    console.error('Failed to get endpoint by path from database');
    throw error;
  }
}

export async function getEndpointsByProjectId({ projectId }: { projectId: string }): Promise<Endpoint[]> {
  try {
    const results = await db
      .select({
        id: endpoint.id,
        path: endpoint.path,
        parameters: endpoint.parameters,
        code: endpoint.code,
        httpMethod: endpoint.httpMethod,
        projectId: endpoint.projectId,
        userId: endpoint.userId,
        createdAt: endpoint.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(endpoint)
      .leftJoin(project, eq(endpoint.projectId, project.id))
      .leftJoin(user, eq(endpoint.userId, user.id))
      .where(eq(endpoint.projectId, projectId))
      .orderBy(desc(endpoint.createdAt));
      
    // Convert results to correct type
    return results.map(result => ({
      id: result.id,
      path: result.path,
      parameters: result.parameters,
      code: result.code,
      httpMethod: result.httpMethod,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    }));
  } catch (error) {
    console.error('Failed to get endpoints by project from database');
    throw error;
  }
}

export async function getEndpointsByUserId({ userId }: { userId: string }): Promise<Endpoint[]> {
  try {
    const results = await db
      .select({
        id: endpoint.id,
        path: endpoint.path,
        parameters: endpoint.parameters,
        code: endpoint.code,
        httpMethod: endpoint.httpMethod,
        projectId: endpoint.projectId,
        userId: endpoint.userId,
        createdAt: endpoint.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(endpoint)
      .leftJoin(project, eq(endpoint.projectId, project.id))
      .leftJoin(user, eq(endpoint.userId, user.id))
      .where(eq(endpoint.userId, userId))
      .orderBy(desc(endpoint.createdAt));
      
    // Convert results to correct type
    return results.map(result => ({
      id: result.id,
      path: result.path,
      parameters: result.parameters,
      code: result.code,
      httpMethod: result.httpMethod,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    }));
  } catch (error) {
    console.error('Failed to get endpoints by user from database');
    throw error;
  }
}

export async function getAllEndpoints(): Promise<Endpoint[]> {
  try {
    const results = await db
      .select({
        id: endpoint.id,
        path: endpoint.path,
        parameters: endpoint.parameters,
        code: endpoint.code,
        httpMethod: endpoint.httpMethod,
        projectId: endpoint.projectId,
        userId: endpoint.userId,
        createdAt: endpoint.createdAt,
        projectName: project.name,
        userEmail: user.email
      })
      .from(endpoint)
      .leftJoin(project, eq(endpoint.projectId, project.id))
      .leftJoin(user, eq(endpoint.userId, user.id))
      .orderBy(desc(endpoint.createdAt));
      
    // Convert results to correct type
    return results.map(result => ({
      id: result.id,
      path: result.path,
      parameters: result.parameters,
      code: result.code,
      httpMethod: result.httpMethod,
      projectId: result.projectId,
      userId: result.userId,
      createdAt: result.createdAt,
      projectName: result.projectName ?? undefined,
      userEmail: result.userEmail ?? undefined
    }));
  } catch (error) {
    console.error('Failed to get all endpoints from database');
    throw error;
  }
}

export async function updateEndpoint({
  id,
  path,
  parameters,
  code,
  httpMethod,
  language,
  userId,
}: {
  id: string;
  path?: string;
  parameters?: string[];
  code?: string;
  httpMethod?: string;
  language?: 'javascript' | 'python';
  userId: string;
}): Promise<boolean> {
  try {
    const updateData: Partial<Endpoint> = {};
    
    if (path !== undefined) updateData.path = path;
    if (parameters !== undefined) updateData.parameters = parameters.join(',');
    if (code !== undefined) updateData.code = code;
    if (httpMethod !== undefined) updateData.httpMethod = httpMethod;
    if (language !== undefined) updateData.language = language;
    
    if (Object.keys(updateData).length === 0) {
      return false;
    }
    
    // Only update if the endpoint belongs to the user
    const result = await db
      .update(endpoint)
      .set(updateData)
      .where(and(eq(endpoint.id, id), eq(endpoint.userId, userId)));
    
    // Check if any rows were affected
    return result.rowsAffected > 0;
  } catch (error) {
    console.error('Failed to update endpoint in database');
    throw error;
  }
}

export async function deleteEndpoint({ id, userId }: { id: string, userId: string }): Promise<boolean> {
  try {
    // Only delete if the endpoint belongs to the user
    const result = await db
      .delete(endpoint)
      .where(and(eq(endpoint.id, id), eq(endpoint.userId, userId)));
    
    // Check if any rows were affected
    return result.rowsAffected > 0;
  } catch (error) {
    console.error('Failed to delete endpoint from database');
    throw error;
  }
}

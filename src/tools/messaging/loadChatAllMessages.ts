import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { makeApiRequest } from '../../utils/helpers.js';

export const loadChatAllMessagesTool: Tool = {
  name: 'load_chat_messages',
  description: 'Retrieve all messages from a specific chat or conversation using WaPulse API',
  annotations: {
    title: 'Load WhatsApp Chat Messages',
    streamingHint: true,
    readOnlyHint: true,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: "The ID of the chat (e.g., '353871234567@c.us' for user or 'groupid@g.us' for group)"
      },
      type: {
        type: 'string',
        description: 'The type of the chat',
        enum: ['user', 'group']
      },
      until: {
        type: 'string',
        description: 'The timestamp of the last message to load. If not provided, all messages will be loaded'
      },
      customToken: {
        type: 'string',
        description: 'Override default token for this request'
      },
      customInstanceID: {
        type: 'string',
        description: 'Override default instance ID for this request'
      }
    },
    required: ['id', 'type'],
    additionalProperties: false
  }
};

export async function handleLoadChatAllMessages(args: any, context?: any) {
  const schema = z.object({
    id: z.string(),
    type: z.enum(['user', 'group']),
    until: z.string().optional(),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { id, type, until, customToken, customInstanceID } = schema.parse(args);
  const { log, streamContent, reportProgress } = context || {};

  try {
    if (log) {
      log.info("Loading chat messages", { chatId: id, type, until });
    }

    const requestBody: any = { id, type };
    if (until) {
      requestBody.until = until;
    }

    // Stream initial status
    if (streamContent) {
      const chatTypeEmoji = type === 'group' ? '👥' : '👤';
      await streamContent({ 
        type: 'text', 
        text: `${chatTypeEmoji} Loading messages from ${type} chat: ${id}\n\n` 
      });
    }

    const response = await makeApiRequest('/api/loadChatAllMessages', requestBody, customToken, customInstanceID);

    const chatTypeEmoji = type === 'group' ? '👥' : '👤';
    const messages = Array.isArray(response.messages) ? response.messages : [];
    const messageCount = messages.length;

    if (log) {
      log.info("Chat messages loaded", { chatId: id, messageCount });
    }

    // Stream messages progressively
    if (streamContent && messages.length > 0) {
      await streamContent({ 
        type: 'text', 
        text: `📱 Found ${messageCount} messages:\n\n` 
      });

      for (let i = 0; i < Math.min(messages.length, 10); i++) {
        const msg = messages[i];
        if (reportProgress) {
          await reportProgress({ progress: i + 1, total: Math.min(messages.length, 10) });
        }
        
        const timestamp = msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleString() : 'Unknown time';
        const from = msg.from || 'Unknown sender';
        const body = msg.body || '[No text content]';
        
        // Handle different message types
        if (msg.type === 'image' && msg.mediaUrl) {
          await streamContent({ 
            type: 'text', 
            text: `📷 [${timestamp}] ${from}: Image message\n` 
          });
          try {
            await streamContent({ 
              type: 'text', 
              text: `   🖼️ Image URL: ${msg.mediaUrl}\n` 
            });
          } catch (error) {
            await streamContent({ 
              type: 'text', 
              text: `   ⚠️ Could not load image: ${msg.mediaUrl}\n` 
            });
          }
        } else if (msg.type === 'document' && msg.mediaUrl) {
          await streamContent({ 
            type: 'text', 
            text: `📎 [${timestamp}] ${from}: Document - ${msg.filename || 'Unknown file'}\n   📄 ${msg.mediaUrl}\n` 
          });
        } else if (msg.type === 'audio' && msg.mediaUrl) {
          await streamContent({ 
            type: 'text', 
            text: `🎵 [${timestamp}] ${from}: Audio message\n   🔊 ${msg.mediaUrl}\n` 
          });
        } else {
          // Regular text message
          await streamContent({ 
            type: 'text', 
            text: `💬 [${timestamp}] ${from}: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}\n` 
          });
        }
      }

      if (messages.length > 10) {
        await streamContent({ 
          type: 'text', 
          text: `\n... and ${messages.length - 10} more messages\n` 
        });
      }
    }
    
    return {
      content: [{
        type: 'text',
        text: `\n✅ Chat messages loaded successfully!\n\n${chatTypeEmoji} Chat ID: ${id}\n📊 Type: ${type}\n💬 Messages found: ${messageCount}\n${until ? `⏰ Until: ${until}\n` : ''}📋 Full Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to load chat messages", { error: error.message, chatId: id, type });
    }
    throw new McpError(ErrorCode.InternalError, `Failed to load messages from ${type} chat ${id}: ${error.message}`);
  }
} 
import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { makeApiRequest, formatPhoneNumber } from '../../utils/helpers.js';

interface Chat {
  id: string;
  name?: string;
  isGroup?: boolean;
  lastMessage?: {
    body?: string;
    timestamp?: number;
  };
  unreadCount?: number;
  participants?: string[];
  archived?: boolean;
  pinned?: boolean;
}

interface FormattedChat {
  id: string;
  name: string;
  type: 'user' | 'group';
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  participants: string[];
  archived: boolean;
  pinned: boolean;
}

export const getAllChatsTool: Tool = {
  name: 'get_all_chats',
  description: 'Get all WhatsApp chats (individual and group conversations) for an instance using WaPulse API',
  annotations: {
    title: 'Get All WhatsApp Chats',
    readOnlyHint: true,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      customToken: {
        type: 'string',
        description: 'Override default token for this request'
      },
      customInstanceID: {
        type: 'string',
        description: 'Override default instance ID for this request'
      }
    },
    required: [],
    additionalProperties: false
  }
};

export async function handleGetAllChats(args: any, context?: any) {
  const schema = z.object({
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    if (log) {
      log.info("Getting all WhatsApp chats");
    }

    const response = await makeApiRequest('/api/getAllChats', {}, customToken, customInstanceID);

    const chats: Chat[] = response.chats || [];
    const formattedChats: FormattedChat[] = chats.map((chat: Chat) => ({
      id: chat.id,
      name: chat.name || (chat.isGroup ? 'Unnamed Group' : formatPhoneNumber(chat.id)),
      type: chat.isGroup ? 'group' : 'user',
      isGroup: chat.isGroup || false,
      lastMessage: chat.lastMessage?.body || 'No messages',
      lastMessageTime: chat.lastMessage?.timestamp ? 
        new Date(chat.lastMessage.timestamp * 1000).toLocaleString() : 'Unknown',
      unreadCount: chat.unreadCount || 0,
      participants: chat.participants || [],
      archived: chat.archived || false,
      pinned: chat.pinned || false
    }));

    const totalChats = formattedChats.length;
    const userChats = formattedChats.filter((chat: FormattedChat) => chat.type === 'user').length;
    const groupChats = formattedChats.filter((chat: FormattedChat) => chat.type === 'group').length;
    const unreadChats = formattedChats.filter((chat: FormattedChat) => chat.unreadCount > 0).length;

    if (log) {
      log.info("All chats retrieved successfully", { 
        totalChats, 
        userChats, 
        groupChats, 
        unreadChats 
      });
    }

    // Format the response with emojis and structure
    let chatList = `📱 WhatsApp Chats Overview\n\n`;
    chatList += `📊 Summary:\n`;
    chatList += `• Total Chats: ${totalChats}\n`;
    chatList += `• 👤 Individual Chats: ${userChats}\n`;
    chatList += `• 👥 Group Chats: ${groupChats}\n`;
    chatList += `• 🔔 Unread Chats: ${unreadChats}\n\n`;
    chatList += "=".repeat(50) + "\n\n";

    if (formattedChats.length > 0) {
      chatList += `📋 Chat List:\n\n`;
      
      formattedChats.slice(0, 20).forEach((chat: FormattedChat, index: number) => {
        const typeEmoji = chat.type === 'group' ? '👥' : '👤';
        const unreadBadge = chat.unreadCount > 0 ? ` (${chat.unreadCount} unread)` : '';
        const pinnedBadge = chat.pinned ? ' 📌' : '';
        const archivedBadge = chat.archived ? ' 📦' : '';
        
        chatList += `${index + 1}. ${typeEmoji} ${chat.name}${pinnedBadge}${archivedBadge}\n`;
        chatList += `   💬 ID: ${chat.id}\n`;
        chatList += `   📝 Last: ${chat.lastMessage.substring(0, 50)}${chat.lastMessage.length > 50 ? '...' : ''}\n`;
        chatList += `   ⏰ Time: ${chat.lastMessageTime}${unreadBadge}\n\n`;
      });

      if (formattedChats.length > 20) {
        chatList += `... and ${formattedChats.length - 20} more chats\n\n`;
      }
    } else {
      chatList += `📭 No chats found\n\n`;
    }

    chatList += `📋 Full Response: ${JSON.stringify(response, null, 2)}`;
    
    return {
      content: [{
        type: 'text',
        text: chatList
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to get all chats", { error: error.message });
    }
    throw new McpError(ErrorCode.InternalError, `Failed to get all WhatsApp chats: ${error.message}`);
  }
} 
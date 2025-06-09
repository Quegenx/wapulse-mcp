import { FastMCP } from "fastmcp";
import { z } from "zod";
import { UserError, imageContent } from "fastmcp";
import { makeApiRequest, validatePhoneNumber, formatPhoneNumber } from "./utils/helpers.js";
import { globalConfig, parseConfigFromEnv, getEffectiveConfig } from "./utils/config.js";
import { handleGetAllChats, handleGetWapulseDoc } from "./tools/general/index.js";
import {
  handleCreateGroup,
  handleAddParticipants,
  handleRemoveParticipants,
  handlePromoteParticipants,
  handleDemoteParticipants,
  handleLeaveGroup,
  handleGetGroupInviteLink,
  handleChangeGroupInviteCode,
  handleGetGroupRequests,
  handleRejectGroupRequest,
  handleApproveGroupRequest,
  handleGetAllGroups
} from "./tools/group/index.js";
import {
  handleCreateInstance,
  handleGetQrCode,
  handleStartInstance,
  handleStopInstance,
  handleDeleteInstance
} from "./tools/instance/index.js";

// Initialize configuration from environment variables
parseConfigFromEnv();

// Create FastMCP server following the official pattern
const server = new FastMCP({
  name: "WaPulse WhatsApp MCP Server",
  version: "2.0.0",
  instructions: `This server provides comprehensive WhatsApp management capabilities through the WaPulse API.

Features:
- Send messages, files, and audio to individuals or groups
- Load chat history with streaming support
- Validate phone numbers and check ID existence
- Rich content support (images, documents, audio with voice note support)
- Progress reporting and structured logging
- Complete group management (create, manage members, admin controls)
- Group invite link management and join request handling
- Audio format support: MP3, WAV, OGG, M4A, AAC, OPUS, FLAC

Usage:
- All tools include proper error handling with UserError
- File uploads show progress reporting
- Chat loading streams messages in real-time
- Phone number validation with helpful error messages`,

  // Health check configuration for HTTP mode
  health: {
    enabled: true,
    message: "WaPulse MCP Server is healthy",
    path: "/health",
    status: 200
  },

  // Ping configuration
  ping: {
    enabled: true,
    intervalMs: 30000, // 30 seconds
    logLevel: "debug"
  }
});

// Add WhatsApp messaging tools using FastMCP pattern
server.addTool({
  name: "send_whatsapp_message",
  description: "Send a WhatsApp message to a specific phone number or group using WaPulse API",
  parameters: z.object({
    to: z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format'),
    message: z.string().min(1).max(4096),
    type: z.enum(['user', 'group']).default('user'),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Send WhatsApp Message',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const { to, message, type, customToken, customInstanceID } = args;

    // Get effective configuration (validates automatically)
    const { token, instanceID } = getEffectiveConfig(customToken, customInstanceID);

    // Validate phone number format
    const isValid = validatePhoneNumber(to);
    if (!isValid) {
      throw new UserError(`Invalid phone number format: ${to}. Use format: country code + number (e.g., 972512345678) - no + sign, no spaces`);
    }

    if (log) {
      log.info("Sending WhatsApp message", { 
        to: formatPhoneNumber(to), 
        messageLength: message.length,
        type 
      });
    }

    const response = await makeApiRequest('/api/sendMessage', {
      to,
      message,
      type
    }, token, instanceID);

    const formattedPhone = formatPhoneNumber(to);
    
    if (log) {
      log.info("Message sent successfully", { to: formattedPhone });
    }
    
    return `✅ Message sent successfully to ${formattedPhone}!\n\n📱 Recipient: ${formattedPhone}\n💬 Message: "${message}"\n📊 Response: ${JSON.stringify(response, null, 2)}`;
  }
});

server.addTool({
  name: "send_whatsapp_files",
  description: "Send files (images, documents, etc.) to a specific phone number or group using WaPulse API",
  parameters: z.object({
    to: z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format'),
    files: z.array(z.object({
      file: z.string(),
      filename: z.string(),
      caption: z.string().optional()
    })).min(1).max(10),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Send WhatsApp Files',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log, reportProgress }) => {
    const { to, files, customToken, customInstanceID } = args;

    // Validate phone number format
    const isValid = validatePhoneNumber(to);
    if (!isValid) {
      throw new UserError(`Invalid phone number format: ${to}. Use format: country code + number (e.g., 972512345678) - no + sign, no spaces`);
    }

    // Validate file data format
    for (const file of files) {
      if (!file.file.startsWith('data:')) {
        throw new UserError(`Invalid file format for "${file.filename}". File must be base64 encoded with data URI prefix (e.g., 'data:image/jpeg;base64,...')`);
      }
    }

    if (log) {
      log.info("Sending WhatsApp files", { 
        to: formatPhoneNumber(to), 
        fileCount: files.length,
        filenames: files.map(f => f.filename)
      });
    }

    // Report initial progress
    if (reportProgress) {
      await reportProgress({ progress: 0, total: files.length });
    }

    const response = await makeApiRequest('/api/sendFiles', {
      to,
      files
    }, customToken, customInstanceID);

    // Report completion
    if (reportProgress) {
      await reportProgress({ progress: files.length, total: files.length });
    }

    const formattedPhone = formatPhoneNumber(to);
    const fileList = files.map(f => `📎 ${f.filename}${f.caption ? ` (${f.caption})` : ''}`).join('\n');
    
    if (log) {
      log.info("Files sent successfully", { to: formattedPhone, fileCount: files.length });
    }
    
    return `✅ Files sent successfully to ${formattedPhone}!\n\n📱 Recipient: ${formattedPhone}\n📁 Files sent:\n${fileList}\n📊 Response: ${JSON.stringify(response, null, 2)}`;
  }
});

server.addTool({
  name: "send_whatsapp_audio",
  description: "Send audio messages (voice notes, music, etc.) to a specific phone number or group using WaPulse API",
  parameters: z.object({
    to: z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format'),
    audio: z.object({
      file: z.string(),
      filename: z.string(),
      caption: z.string().optional(),
      isVoiceNote: z.boolean().default(false)
    }),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Send WhatsApp Audio',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log, reportProgress }) => {
    const { to, audio, customToken, customInstanceID } = args;

    // Validate phone number format
    const isValid = validatePhoneNumber(to);
    if (!isValid) {
      throw new UserError(`Invalid phone number format: ${to}. Use format: country code + number (e.g., 972512345678) - no + sign, no spaces`);
    }

    // Validate audio file format
    if (!audio.file.startsWith('data:audio/')) {
      throw new UserError(`Invalid audio format for "${audio.filename}". File must be base64 encoded audio with data URI prefix (e.g., 'data:audio/mpeg;base64,...')`);
    }

    // Validate audio file extensions
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.flac'];
    const hasValidExtension = audioExtensions.some(ext => 
      audio.filename.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      throw new UserError(`Invalid audio file extension for "${audio.filename}". Supported formats: ${audioExtensions.join(', ')}`);
    }

    if (log) {
      log.info("Sending WhatsApp audio", { 
        to: formatPhoneNumber(to), 
        filename: audio.filename,
        isVoiceNote: audio.isVoiceNote,
        hasCaption: !!audio.caption
      });
    }

    // Report initial progress
    if (reportProgress) {
      await reportProgress({ progress: 0, total: 1 });
    }

    // Prepare the request payload
    const payload = {
      to,
      files: [{
        file: audio.file,
        filename: audio.filename,
        caption: audio.caption,
        type: audio.isVoiceNote ? 'voice' : 'audio'
      }]
    };

    const response = await makeApiRequest('/api/sendFiles', payload, customToken, customInstanceID);

    // Report completion
    if (reportProgress) {
      await reportProgress({ progress: 1, total: 1 });
    }

    const formattedPhone = formatPhoneNumber(to);
    const audioType = audio.isVoiceNote ? '🎤 Voice Note' : '🎵 Audio File';
    const captionText = audio.caption ? `\n💬 Caption: ${audio.caption}` : '';
    
    if (log) {
      log.info("Audio sent successfully", { 
        to: formattedPhone, 
        filename: audio.filename,
        type: audio.isVoiceNote ? 'voice' : 'audio'
      });
    }
    
    return `✅ Audio sent successfully to ${formattedPhone}!\n\n📱 Recipient: ${formattedPhone}\n${audioType}: ${audio.filename}${captionText}\n📊 Response: ${JSON.stringify(response, null, 2)}`;
  }
});

server.addTool({
  name: "load_chat_messages",
  description: "Retrieve all messages from a specific chat or conversation using WaPulse API",
  parameters: z.object({
    id: z.string(),
    type: z.enum(['user', 'group']),
    until: z.string().optional(),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Load WhatsApp Chat Messages',
    streamingHint: true,
    readOnlyHint: true,
    openWorldHint: true
  },
  execute: async (args, { log, streamContent, reportProgress }) => {
    const { id, type, until, customToken, customInstanceID } = args;

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
            const imgContent = await imageContent({ url: msg.mediaUrl });
            await streamContent(imgContent);
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
    
    return `\n✅ Chat messages loaded successfully!\n\n${chatTypeEmoji} Chat ID: ${id}\n📊 Type: ${type}\n💬 Messages found: ${messageCount}\n${until ? `⏰ Until: ${until}\n` : ''}📋 Full Response: ${JSON.stringify(response, null, 2)}`;
  }
});

server.addTool({
  name: "check_id_exists",
  description: "Check if a specific user or group ID exists in WhatsApp using WaPulse API",
  parameters: z.object({
    value: z.string(),
    type: z.enum(['user', 'group']),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Check WhatsApp ID Exists',
    readOnlyHint: true,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const { value, type, customToken, customInstanceID } = args;

    if (log) {
      log.info("Checking ID existence", { value, type });
    }

    const response = await makeApiRequest('/api/isExists', {
      value,
      type
    }, customToken, customInstanceID);

    const typeEmoji = type === 'group' ? '👥' : '👤';
    const existsEmoji = response.exists ? '✅' : '❌';
    const statusText = response.exists ? 'EXISTS' : 'DOES NOT EXIST';
    
    if (log) {
      log.info("ID existence check completed", { value, type, exists: response.exists });
    }
    
    return `${existsEmoji} ID Check Result\n\n${typeEmoji} Type: ${type}\n🔍 Value: ${value}\n📊 Status: ${statusText}\n📋 Response: ${JSON.stringify(response, null, 2)}`;
  }
});

server.addTool({
  name: "validate_phone_number",
  description: "Validate if a phone number is in the correct format for WaPulse API",
  parameters: z.object({
    phoneNumber: z.string()
  }),
  annotations: {
    title: 'Validate Phone Number',
    readOnlyHint: true,
    idempotentHint: true
  },
  execute: async (args) => {
    const { phoneNumber } = args;

    const isValid = validatePhoneNumber(phoneNumber);
    
    if (isValid) {
      const formatted = formatPhoneNumber(phoneNumber);
      // Extract country code (first 1-4 digits)
      const countryCode = phoneNumber.match(/^(\d{1,4})/)?.[1] || '';
      
      return `✅ Phone number is valid!\n\n📱 Original: ${phoneNumber}\n📞 Formatted: ${formatted}\n🌍 Country Code: ${countryCode}\n📊 Status: VALID`;
    } else {
      return `❌ Phone number is invalid!\n\n📱 Number: ${phoneNumber}\n🚫 Error: Must be 7-19 digits with country code\n📊 Status: INVALID\n\n💡 Tip: Phone numbers should include country code (e.g., 972512345678 for Israel)`;
    }
  }
});

server.addTool({
  name: "get_all_chats",
  description: "Get all WhatsApp chats (individual and group conversations) for an instance using WaPulse API",
  parameters: z.object({
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Get All WhatsApp Chats',
    readOnlyHint: true,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleGetAllChats(args, { log });
    
    // Extract text from MCP SDK format for FastMCP
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "get_wapulse_documentation",
  description: "Fetch and search WaPulse API documentation from the official website",
  parameters: z.object({
    section: z.enum([
      'overview',
      'authentication',
      'messaging', 
      'groups',
      'instances',
      'webhooks',
      'errors',
      'rate-limits',
      'examples'
    ]).optional(),
    search: z.string().min(2).max(100).optional()
  }),
  annotations: {
    title: 'Get WaPulse Documentation',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    // Adapt FastMCP logger to our expected interface
    const logAdapter = log ? (level: string, message: string, meta?: any) => {
      switch (level) {
        case 'info':
          log.info(message, meta);
          break;
        case 'error':
          log.error(message, meta);
          break;
        case 'warn':
          log.warn(message, meta);
          break;
        case 'debug':
          log.debug(message, meta);
          break;
        default:
          log.info(message, meta);
      }
    } : undefined;

    const result = await handleGetWapulseDoc(args, { log: logAdapter });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});



// Group Management Tools
server.addTool({
  name: "create_whatsapp_group",
  description: "Create a new WhatsApp group with specified participants",
  parameters: z.object({
    name: z.string().min(1).max(100),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(256),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Create WhatsApp Group',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleCreateGroup(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "add_group_participants",
  description: "Add new participants to an existing WhatsApp group",
  parameters: z.object({
    id: z.string().min(1),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(50),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Add Group Participants',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleAddParticipants(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "remove_group_participants",
  description: "Remove participants from an existing WhatsApp group",
  parameters: z.object({
    id: z.string().min(1),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(50),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Remove Group Participants',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleRemoveParticipants(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "promote_group_participants",
  description: "Promote participants to admin status in a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(20),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Promote Group Participants',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handlePromoteParticipants(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "demote_group_participants",
  description: "Demote participants from admin status in a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(20),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Demote Group Participants',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleDemoteParticipants(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "leave_whatsapp_group",
  description: "Leave a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Leave WhatsApp Group',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleLeaveGroup(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "get_group_invite_link",
  description: "Get the invite link for a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Get Group Invite Link',
    readOnlyHint: true,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleGetGroupInviteLink(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "change_group_invite_code",
  description: "Change the invite code for a WhatsApp group, generating a new invite link",
  parameters: z.object({
    id: z.string().min(1),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Change Group Invite Code',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleChangeGroupInviteCode(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "get_group_requests",
  description: "Get pending join requests for a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Get Group Requests',
    readOnlyHint: true,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleGetGroupRequests(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "reject_group_request",
  description: "Reject pending join requests for a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1),
    numbers: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(20),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Reject Group Request',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleRejectGroupRequest(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "approve_group_request",
  description: "Approve pending join requests for a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1),
    numbers: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(20),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Approve Group Request',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleApproveGroupRequest(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "get_all_groups",
  description: "Get all WhatsApp groups for an instance",
  parameters: z.object({
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  }),
  annotations: {
    title: 'Get All Groups',
    readOnlyHint: true,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    const result = await handleGetAllGroups(args, { log });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

// Instance Management Tools
server.addTool({
  name: "create_instance",
  description: "Create a new WhatsApp instance for your account",
  parameters: z.object({
    token: z.string().min(1)
  }),
  annotations: {
    title: 'Create WhatsApp Instance',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    // Adapt FastMCP logger to our expected interface
    const logAdapter = log ? (level: string, message: string, meta?: any) => {
      switch (level) {
        case 'info':
          log.info(message, meta);
          break;
        case 'error':
          log.error(message, meta);
          break;
        case 'warn':
          log.warn(message, meta);
          break;
        case 'debug':
          log.debug(message, meta);
          break;
        default:
          log.info(message, meta);
      }
    } : undefined;

    const result = await handleCreateInstance(args, { log: logAdapter });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "get_qr_code",
  description: "Get the QR code needed to connect WhatsApp Web to an instance",
  parameters: z.object({
    token: z.string().min(1),
    instanceID: z.string().min(1)
  }),
  annotations: {
    title: 'Get WhatsApp QR Code',
    readOnlyHint: true,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    // Adapt FastMCP logger to our expected interface
    const logAdapter = log ? (level: string, message: string, meta?: any) => {
      switch (level) {
        case 'info':
          log.info(message, meta);
          break;
        case 'error':
          log.error(message, meta);
          break;
        case 'warn':
          log.warn(message, meta);
          break;
        case 'debug':
          log.debug(message, meta);
          break;
        default:
          log.info(message, meta);
      }
    } : undefined;

    const result = await handleGetQrCode(args, { log: logAdapter });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "start_instance",
  description: "Start a WhatsApp instance to begin receiving and sending messages",
  parameters: z.object({
    token: z.string().min(1),
    instanceID: z.string().min(1)
  }),
  annotations: {
    title: 'Start WhatsApp Instance',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    // Adapt FastMCP logger to our expected interface
    const logAdapter = log ? (level: string, message: string, meta?: any) => {
      switch (level) {
        case 'info':
          log.info(message, meta);
          break;
        case 'error':
          log.error(message, meta);
          break;
        case 'warn':
          log.warn(message, meta);
          break;
        case 'debug':
          log.debug(message, meta);
          break;
        default:
          log.info(message, meta);
      }
    } : undefined;

    const result = await handleStartInstance(args, { log: logAdapter });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "stop_instance",
  description: "Stop a running WhatsApp instance",
  parameters: z.object({
    token: z.string().min(1),
    instanceID: z.string().min(1)
  }),
  annotations: {
    title: 'Stop WhatsApp Instance',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    // Adapt FastMCP logger to our expected interface
    const logAdapter = log ? (level: string, message: string, meta?: any) => {
      switch (level) {
        case 'info':
          log.info(message, meta);
          break;
        case 'error':
          log.error(message, meta);
          break;
        case 'warn':
          log.warn(message, meta);
          break;
        case 'debug':
          log.debug(message, meta);
          break;
        default:
          log.info(message, meta);
      }
    } : undefined;

    const result = await handleStopInstance(args, { log: logAdapter });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});

server.addTool({
  name: "delete_instance",
  description: "Permanently delete a WhatsApp instance",
  parameters: z.object({
    token: z.string().min(1),
    instanceID: z.string().min(1)
  }),
  annotations: {
    title: 'Delete WhatsApp Instance',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true
  },
  execute: async (args, { log }) => {
    // Adapt FastMCP logger to our expected interface
    const logAdapter = log ? (level: string, message: string, meta?: any) => {
      switch (level) {
        case 'info':
          log.info(message, meta);
          break;
        case 'error':
          log.error(message, meta);
          break;
        case 'warn':
          log.warn(message, meta);
          break;
        case 'debug':
          log.debug(message, meta);
          break;
        default:
          log.info(message, meta);
      }
    } : undefined;

    const result = await handleDeleteInstance(args, { log: logAdapter });
    
    if (result && result.content && Array.isArray(result.content)) {
      return result.content
        .map((item: any) => item.text || item.data || JSON.stringify(item))
        .join('\n');
    }
    
    return JSON.stringify(result);
  }
});





// Server event handlers
server.on("connect", (event) => {
  console.log(`🔗 Client connected to WaPulse MCP Server`);
});

server.on("disconnect", (event) => {
  console.log(`🔌 Client disconnected from WaPulse MCP Server`);
});

// Export server
export { server };



// Start server based on environment
const port = parseInt(process.env.PORT || "3000");
const isProduction = process.env.NODE_ENV === "production";

// For Smithery deployment, always use HTTP
if (isProduction || process.env.TRANSPORT_TYPE === "httpStream") {
  console.log(`🚀 Starting WaPulse MCP Server on HTTP port ${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`📡 SSE endpoint: http://localhost:${port}/sse`);
  console.log(`\n📊 Available Tools (25 total):`);
  console.log(`   📱 Messaging (6): send_message, validate_phone, send_files, send_audio, load_chats, check_exists`);
  console.log(`   💬 General (2): get_all_chats, get_wapulse_documentation`);
  console.log(`   👥 Group Management (12): create_group, add/remove/promote/demote participants, leave_group, invite_links, join_requests, get_all_groups`);
  console.log(`   🏗️ Instance Management (5): create_instance, get_qr_code, start_instance, stop_instance, delete_instance`);
  
  server.start({
    transportType: "httpStream",
    httpStream: { port }
  });
} else {
  console.log("🚀 Starting WaPulse MCP Server on stdio transport");
  console.log(`\n📊 Available Tools (25 total):`);
  console.log(`   📱 Messaging (6): send_message, validate_phone, send_files, send_audio, load_chats, check_exists`);
  console.log(`   💬 General (2): get_all_chats, get_wapulse_documentation`);
  console.log(`   👥 Group Management (12): create_group, add/remove/promote/demote participants, leave_group, invite_links, join_requests, get_all_groups`);
  console.log(`   🏗️ Instance Management (5): create_instance, get_qr_code, start_instance, stop_instance, delete_instance`);
  
  server.start({
    transportType: "stdio"
  });
} 
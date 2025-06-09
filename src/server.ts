import { FastMCP } from "fastmcp";
import { z } from "zod";
import { UserError } from "fastmcp";
import { globalConfig, parseConfigFromEnv, getEffectiveConfig } from "./utils/config.js";

// Import all tool handlers
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
import {
  handleSendMessage,
  handleSendFiles,
  handleSendAudio,
  handleLoadChatAllMessages,
  handleIsExists,
  handleValidatePhoneNumber
} from "./tools/messaging/index.js";

// Initialize configuration from environment variables
parseConfigFromEnv();

// Create FastMCP server
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



  health: {
    enabled: true,
    message: "WaPulse MCP Server is healthy",
    path: "/health",
    status: 200
  },

  ping: {
    enabled: true,
    intervalMs: 30000,
    logLevel: "debug"
  }
});

// Helper function to adapt context for tool handlers
function adaptContext(context: any) {
  return {
    log: context?.log ? (level: string, message: string, meta?: any) => {
      switch (level) {
        case 'info': context.log.info(message, meta); break;
        case 'error': context.log.error(message, meta); break;
        case 'warn': context.log.warn(message, meta); break;
        case 'debug': context.log.debug(message, meta); break;
        default: context.log.info(message, meta);
      }
    } : undefined,
    streamContent: context?.streamContent,
    reportProgress: context?.reportProgress
  };
}

// Helper function to convert tool response to FastMCP format
function convertResponse(result: any): string {
  if (result && result.content && Array.isArray(result.content)) {
    return result.content
      .map((item: any) => item.text || item.data || JSON.stringify(item))
      .join('\n');
  }
  return JSON.stringify(result);
}

// Messaging Tools
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
  execute: async (args, context) => {
    const { customToken, customInstanceID, ...restArgs } = args;
    const { token, instanceID } = getEffectiveConfig(customToken, customInstanceID);
    const result = await handleSendMessage({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext(context));
    return convertResponse(result);
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
  execute: async (args, context) => {
    const { customToken, customInstanceID, ...restArgs } = args;
    const { token, instanceID } = getEffectiveConfig(customToken, customInstanceID);
    const result = await handleSendFiles({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext(context));
    return convertResponse(result);
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
  execute: async (args, context) => {
    const { customToken, customInstanceID, ...restArgs } = args;
    const { token, instanceID } = getEffectiveConfig(customToken, customInstanceID);
    const result = await handleSendAudio({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext(context));
    return convertResponse(result);
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
  execute: async (args, context) => {
    const { customToken, customInstanceID, ...restArgs } = args;
    const { token, instanceID } = getEffectiveConfig(customToken, customInstanceID);
    const result = await handleLoadChatAllMessages({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext(context));
    return convertResponse(result);
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
  execute: async (args, context) => {
    const { customToken, customInstanceID, ...restArgs } = args;
    const { token, instanceID } = getEffectiveConfig(customToken, customInstanceID);
    const result = await handleIsExists({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext(context));
    return convertResponse(result);
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
  execute: async (args, context) => {
    const result = await handleValidatePhoneNumber(args);
    return convertResponse(result);
  }
});

// General Tools
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
  execute: async (args, context) => {
    const { customToken, customInstanceID } = args;
    const { token, instanceID } = getEffectiveConfig(customToken, customInstanceID);
    const result = await handleGetAllChats({ customToken: token, customInstanceID: instanceID }, adaptContext(context));
    return convertResponse(result);
  }
});

server.addTool({
  name: "get_wapulse_documentation",
  description: "Fetch and search WaPulse API documentation from the official website",
  parameters: z.object({
    section: z.enum(['overview', 'authentication', 'messaging', 'groups', 'instances', 'webhooks', 'errors', 'rate-limits', 'examples']).optional(),
    search: z.string().min(2).max(100).optional()
  }),
  annotations: {
    title: 'Get WaPulse Documentation',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  execute: async (args, context) => {
    const result = await handleGetWapulseDoc(args, adaptContext(context));
    return convertResponse(result);
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
  execute: async (args, context) => {
    const { customToken, customInstanceID, ...restArgs } = args;
    const { token, instanceID } = getEffectiveConfig(customToken, customInstanceID);
    const result = await handleCreateGroup({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext(context));
    return convertResponse(result);
  }
});

// Add all other group tools with similar pattern...
const groupTools = [
  { name: "add_group_participants", handler: handleAddParticipants, description: "Add new participants to an existing WhatsApp group" },
  { name: "remove_group_participants", handler: handleRemoveParticipants, description: "Remove participants from an existing WhatsApp group", destructive: true },
  { name: "promote_group_participants", handler: handlePromoteParticipants, description: "Promote participants to admin status in a WhatsApp group" },
  { name: "demote_group_participants", handler: handleDemoteParticipants, description: "Demote participants from admin status in a WhatsApp group" },
  { name: "leave_whatsapp_group", handler: handleLeaveGroup, description: "Leave a WhatsApp group", destructive: true },
  { name: "get_group_invite_link", handler: handleGetGroupInviteLink, description: "Get the invite link for a WhatsApp group", readOnly: true },
  { name: "change_group_invite_code", handler: handleChangeGroupInviteCode, description: "Change the invite code for a WhatsApp group, generating a new invite link", destructive: true },
  { name: "get_group_requests", handler: handleGetGroupRequests, description: "Get pending join requests for a WhatsApp group", readOnly: true },
  { name: "reject_group_request", handler: handleRejectGroupRequest, description: "Reject pending join requests for a WhatsApp group", destructive: true },
  { name: "approve_group_request", handler: handleApproveGroupRequest, description: "Approve pending join requests for a WhatsApp group" },
  { name: "get_all_groups", handler: handleGetAllGroups, description: "Get all WhatsApp groups for an instance", readOnly: true }
];

groupTools.forEach(({ name, handler, description, destructive = false, readOnly = false }) => {
  const isParticipantTool = name.includes('participants') || name.includes('request');
  const maxItems = name.includes('promote') || name.includes('demote') || name.includes('request') ? 20 : 50;
  
  server.addTool({
    name,
    description,
    parameters: z.object({
      id: z.string().min(1),
      ...(isParticipantTool ? {
        [name.includes('request') ? 'numbers' : 'participants']: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(maxItems)
      } : {}),
      customToken: z.string().optional(),
      customInstanceID: z.string().optional()
    }),
    annotations: {
      title: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      readOnlyHint: readOnly,
      destructiveHint: destructive,
      idempotentHint: false,
      openWorldHint: true
    },
    execute: async (args, context) => {
      const { customToken, customInstanceID, ...restArgs } = args;
      const { token, instanceID } = getEffectiveConfig(customToken, customInstanceID);
      const result = await handler({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext(context));
      return convertResponse(result);
    }
  });
});

// Instance Management Tools
const instanceTools = [
  { name: "create_instance", handler: handleCreateInstance, params: z.object({ token: z.string().min(1) }), description: "Create a new WhatsApp instance" },
  { name: "get_qr_code", handler: handleGetQrCode, params: z.object({ token: z.string().min(1), instanceID: z.string().min(1) }), description: "Get QR code for WhatsApp Web connection", readOnly: true },
  { name: "start_instance", handler: handleStartInstance, params: z.object({ token: z.string().min(1), instanceID: z.string().min(1) }), description: "Start a WhatsApp instance to begin receiving and sending messages" },
  { name: "stop_instance", handler: handleStopInstance, params: z.object({ token: z.string().min(1), instanceID: z.string().min(1) }), description: "Stop a running WhatsApp instance" },
  { name: "delete_instance", handler: handleDeleteInstance, params: z.object({ token: z.string().min(1), instanceID: z.string().min(1) }), description: "Permanently delete a WhatsApp instance", destructive: true }
];

instanceTools.forEach(({ name, handler, params, description, destructive = false, readOnly = false }) => {
  server.addTool({
    name,
    description,
    parameters: params,
    annotations: {
      title: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      readOnlyHint: readOnly,
      destructiveHint: destructive,
      idempotentHint: false,
      openWorldHint: true
    },
    execute: async (args, context) => {
      const result = await handler(args as any, adaptContext(context));
      return convertResponse(result);
    }
  });
});

// Server event handlers
server.on("connect", (event) => {
  console.log(`🔗 Client connected to WaPulse MCP Server`);
});

server.on("disconnect", (event) => {
  console.log(`🔌 Client disconnected from WaPulse MCP Server`);
});

// Export server for use by index.ts
export { server }; 
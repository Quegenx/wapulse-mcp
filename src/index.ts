import { FastMCP } from "fastmcp";
import { z } from "zod";
import {
  handleSendMessage,
  handleSendFiles,
  handleSendAudio,
  handleLoadChatAllMessages,
  handleIsExists,
  handleValidatePhoneNumber
} from "./tools/messaging/index.js";
import {
  handleGetAllChats,
  handleGetWapulseDoc
} from "./tools/general/index.js";
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

const server = new FastMCP({
  name: "WaPulse WhatsApp MCP",
  version: "2.0.0",
  instructions: `This server provides comprehensive WhatsApp management capabilities through the WaPulse API.

🔧 SETUP WORKFLOW:
1. First, create a WhatsApp instance using 'create_instance' with your token
2. Get QR code using 'get_qr_code' and scan it with WhatsApp mobile app
3. Start the instance using 'start_instance' to begin messaging
4. Now you can use all messaging and group management tools

📱 MESSAGING TOOLS:
- Use 'send_whatsapp_message' for text messages to individuals or groups
- Use 'send_whatsapp_files' for images, documents, and general files
- Use 'send_whatsapp_audio' for voice notes and audio files (supports MP3, WAV, OGG, M4A, AAC, OPUS, FLAC)
- Use 'load_chat_messages' to read conversation history
- Use 'validate_phone_number' to check phone number format
- Use 'check_id_exists' to verify if contacts/groups exist

💬 GENERAL TOOLS:
- Use 'get_all_chats' to retrieve all WhatsApp conversations
- Use 'get_wapulse_documentation' to access API documentation and examples

👥 GROUP MANAGEMENT:
- Create groups with 'create_whatsapp_group' (up to 256 participants)
- Manage members with add/remove/promote/demote tools
- Handle group settings like invite links and join requests
- Use 'get_all_groups' for overview of all groups

🏗️ INSTANCE MANAGEMENT:
- Manage multiple WhatsApp instances for different accounts
- Start/stop instances as needed
- Delete instances when no longer needed (destructive action)

⚠️ IMPORTANT NOTES:
- Phone numbers must include country code (e.g., 972512345678)
- Some operations are destructive (removing members, deleting instances)
- Always validate phone numbers before sending messages
- Group operations require admin permissions
- Audio files support: MP3, WAV, OGG, M4A, AAC, OPUS, FLAC formats`
});

// Helper function to convert MCP SDK format to FastMCP format
function convertMCPResponse(response: any): string {
  if (typeof response === 'string') {
    return response;
  }
  
  if (response && response.content && Array.isArray(response.content)) {
    return response.content
      .map((item: any) => item.text || item.data || JSON.stringify(item))
      .join('\n');
  }
  
  return JSON.stringify(response);
}

// Add messaging tools using existing codebase
server.addTool({
  name: "send_whatsapp_message",
  description: "Send a WhatsApp message to a specific phone number or group using WaPulse API",
  parameters: z.object({
    to: z.string()
      .min(6, "Phone number must be at least 6 digits")
      .max(20, "Phone number must be at most 20 digits")
      .regex(/^\d{1,4}\d{6,15}$/, "Phone number must be in format: country code + number (e.g., 353871234567) - no + sign, no spaces"),
    message: z.string()
      .min(1, "Message cannot be empty")
      .max(4096, "Message must be less than 4096 characters"),
    type: z.enum(["user", "group"])
      .default("user")
      .describe("Type of recipient: 'user' for individual contact, 'group' for WhatsApp group"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleSendMessage(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "validate_phone_number",
  description: "Validate if a phone number is in the correct format for WaPulse API",
  parameters: z.object({
    phoneNumber: z.string().describe("Phone number to validate"),
  }),
  execute: async (args) => {
    const result = await handleValidatePhoneNumber(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "send_whatsapp_files",
  description: "Send files (images, documents, etc.) to a specific phone number or group using WaPulse API",
  parameters: z.object({
    to: z.string()
      .min(6, "Phone number must be at least 6 digits")
      .max(20, "Phone number must be at most 20 digits")
      .regex(/^\d{1,4}\d{6,15}$/, "Phone number must be in format: country code + number (e.g., 353871234567) - no + sign, no spaces"),
    files: z.array(z.object({
      file: z.string().describe("Base64 encoded file data with data URI prefix (e.g., 'data:image/jpeg;base64,/9j/4AAQ...')"),
      filename: z.string().describe("Name of the file including extension"),
      caption: z.string().optional().describe("Optional caption for the file")
    })).min(1, "At least one file must be provided").max(10, "Maximum 10 files allowed"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleSendFiles(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "send_whatsapp_audio",
  description: "Send audio messages (voice notes, music, etc.) to a specific phone number or group using WaPulse API",
  parameters: z.object({
    to: z.string()
      .min(6, "Phone number must be at least 6 digits")
      .max(20, "Phone number must be at most 20 digits")
      .regex(/^\d{1,4}\d{6,15}$/, "Phone number must be in format: country code + number (e.g., 353871234567) - no + sign, no spaces"),
    audio: z.object({
      file: z.string().describe("Base64 encoded audio data with data URI prefix (e.g., 'data:audio/mpeg;base64,/9j/4AAQ...')"),
      filename: z.string().describe("Name of the audio file including extension (e.g., voice_note.mp3, song.wav)"),
      caption: z.string().optional().describe("Optional caption for the audio message"),
      isVoiceNote: z.boolean().default(false).describe("Whether this should be sent as a voice note (true) or regular audio file (false)")
    }),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleSendAudio(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "load_chat_messages",
  description: "Retrieve all messages from a specific chat or conversation using WaPulse API",
  parameters: z.object({
    id: z.string().describe("The ID of the chat (e.g., '353871234567@c.us' for user or 'groupid@g.us' for group)"),
    type: z.enum(["user", "group"]).describe("The type of the chat"),
    until: z.string().optional().describe("The timestamp of the last message to load. If not provided, all messages will be loaded"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleLoadChatAllMessages(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "check_id_exists",
  description: "Check if a specific user or group ID exists in WhatsApp using WaPulse API",
  parameters: z.object({
    value: z.string().describe("The ID you want to check (phone number for user or group ID for group)"),
    type: z.enum(["user", "group"]).describe("Type of ID to check"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleIsExists(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "get_all_chats",
  description: "Get all WhatsApp chats (individual and group conversations) for an instance using WaPulse API",
  parameters: z.object({
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleGetAllChats(args);
    return convertMCPResponse(result);
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
    ]).optional().describe("Specific documentation section to fetch"),
    search: z.string().min(2).max(100).optional().describe("Search term to find specific information in the documentation"),
  }),
  execute: async (args) => {
    const result = await handleGetWapulseDoc(args);
    return convertMCPResponse(result);
  }
});


// Group Management Tools
server.addTool({
  name: "create_whatsapp_group",
  description: "Create a new WhatsApp group with specified participants",
  parameters: z.object({
    name: z.string().min(1, "Group name cannot be empty").max(100, "Group name too long").describe("The name of the group"),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, "Invalid phone number format")).min(1, "At least one participant required").max(256, "Too many participants").describe("Array of phone numbers to add to the group"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleCreateGroup(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "add_group_participants",
  description: "Add new participants to an existing WhatsApp group",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to add participants to"),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, "Invalid phone number format")).min(1).max(50).describe("Array of phone numbers to add to the group"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleAddParticipants(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "remove_group_participants",
  description: "Remove participants from an existing WhatsApp group",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to remove participants from"),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, "Invalid phone number format")).min(1).max(50).describe("Array of phone numbers to remove from the group"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleRemoveParticipants(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "promote_group_participants",
  description: "Promote participants to admin status in a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to promote participants in"),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, "Invalid phone number format")).min(1).max(20).describe("Array of phone numbers to promote to admin status"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handlePromoteParticipants(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "demote_group_participants",
  description: "Demote participants from admin status in a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to demote participants in"),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, "Invalid phone number format")).min(1).max(20).describe("Array of phone numbers to demote from admin status"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleDemoteParticipants(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "leave_whatsapp_group",
  description: "Leave a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to leave"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleLeaveGroup(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "get_group_invite_link",
  description: "Get the invite link for a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to get the invite link for"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleGetGroupInviteLink(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "change_group_invite_code",
  description: "Change the invite code for a WhatsApp group, generating a new invite link",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to change the invite code for"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleChangeGroupInviteCode(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "get_group_requests",
  description: "Get pending join requests for a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to get requests for"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleGetGroupRequests(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "reject_group_request",
  description: "Reject pending join requests for a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to reject requests for"),
    numbers: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, "Invalid phone number format")).min(1).max(20).describe("Array of phone numbers to reject requests for"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleRejectGroupRequest(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "approve_group_request",
  description: "Approve pending join requests for a WhatsApp group",
  parameters: z.object({
    id: z.string().min(1, "Group ID cannot be empty").describe("The ID of the group to approve requests for"),
    numbers: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, "Invalid phone number format")).min(1).max(20).describe("Array of phone numbers to approve requests for"),
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleApproveGroupRequest(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "get_all_groups",
  description: "Get all WhatsApp groups for an instance",
  parameters: z.object({
    customToken: z.string().optional().describe("Override default token for this request"),
    customInstanceID: z.string().optional().describe("Override default instance ID for this request"),
  }),
  execute: async (args) => {
    const result = await handleGetAllGroups(args);
    return convertMCPResponse(result);
  }
});

// Instance Management Tools
server.addTool({
  name: "create_instance",
  description: "Create a new WhatsApp instance for your account",
  parameters: z.object({
    token: z.string().min(1, "Token is required").describe("The unique userid"),
  }),
  execute: async (args) => {
    const result = await handleCreateInstance(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "get_qr_code",
  description: "Get the QR code needed to connect WhatsApp Web to an instance",
  parameters: z.object({
    token: z.string().min(1, "Token is required").describe("Your unique userid"),
    instanceID: z.string().min(1, "Instance ID is required").describe("The ID of the instance you want to connect"),
  }),
  execute: async (args) => {
    const result = await handleGetQrCode(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "start_instance",
  description: "Start a WhatsApp instance to begin receiving and sending messages",
  parameters: z.object({
    token: z.string().min(1, "Token is required").describe("Your unique userid"),
    instanceID: z.string().min(1, "Instance ID is required").describe("The ID of the instance you want to start"),
  }),
  execute: async (args) => {
    const result = await handleStartInstance(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "stop_instance",
  description: "Stop a running WhatsApp instance",
  parameters: z.object({
    token: z.string().min(1, "Token is required").describe("Your unique userid"),
    instanceID: z.string().min(1, "Instance ID is required").describe("The ID of the instance you want to stop"),
  }),
  execute: async (args) => {
    const result = await handleStopInstance(args);
    return convertMCPResponse(result);
  }
});

server.addTool({
  name: "delete_instance",
  description: "Permanently delete a WhatsApp instance",
  parameters: z.object({
    token: z.string().min(1, "Token is required").describe("Your unique userid"),
    instanceID: z.string().min(1, "Instance ID is required").describe("The ID of the instance you want to delete"),
  }),
  execute: async (args) => {
    const result = await handleDeleteInstance(args);
    return convertMCPResponse(result);
  }
});

// Start the server
server.start({
  transportType: "stdio"
});

console.log("WaPulse WhatsApp MCP server started");
console.log("Available tools:");
console.log("📱 Messaging:");
console.log("• send_whatsapp_message - Send WhatsApp messages");
console.log("• validate_phone_number - Validate phone number format");
console.log("• send_whatsapp_files - Send files to WhatsApp contacts");
console.log("• load_chat_messages - Load chat message history");
console.log("• check_id_exists - Check if user/group ID exists");
console.log("📊 General:");
console.log("• get_all_chats - Get all WhatsApp chats overview");
console.log("👥 Group Management:");
console.log("• create_whatsapp_group - Create new groups");
console.log("• add_group_participants - Add members to groups");
console.log("• remove_group_participants - Remove members from groups");
console.log("• promote_group_participants - Promote members to admin");
console.log("• demote_group_participants - Demote admins to members");
console.log("• leave_whatsapp_group - Leave groups");
console.log("• get_group_invite_link - Get group invite links");
console.log("• change_group_invite_code - Change group invite codes");
console.log("• get_group_requests - Get pending join requests");
console.log("• reject_group_request - Reject join requests");
console.log("• approve_group_request - Approve join requests");
console.log("• get_all_groups - Get all groups overview");
console.log("🏗️ Instance Management:");
console.log("• create_instance - Create new WhatsApp instances");
console.log("• get_qr_code - Get QR code for WhatsApp Web connection");
console.log("• start_instance - Start instances for messaging");
console.log("• stop_instance - Stop running instances");
console.log("• delete_instance - Permanently delete instances");

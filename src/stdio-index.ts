import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Import all tool definitions and handlers
import { sendMessageTool, handleSendMessage } from "./tools/messaging/sendMessage.js";
import { sendFilesTool, handleSendFiles } from "./tools/messaging/sendFiles.js";
import { sendAudioTool, handleSendAudio } from "./tools/messaging/sendAudio.js";
import { loadChatAllMessagesTool, handleLoadChatAllMessages } from "./tools/messaging/loadChatAllMessages.js";
import { isExistsTool, handleIsExists } from "./tools/messaging/isExists.js";
import { validatePhoneNumberTool, handleValidatePhoneNumber } from "./tools/messaging/validatePhoneNumber.js";

import { getAllChatsTool, handleGetAllChats } from "./tools/general/getAllChats.js";
import { wapulseDocTool, handleGetWapulseDoc } from "./tools/general/wapulseDoc.js";

import { createGroupTool, handleCreateGroup } from "./tools/group/createGroup.js";
import { addParticipantsTool, handleAddParticipants } from "./tools/group/addParticipants.js";
import { removeParticipantsTool, handleRemoveParticipants } from "./tools/group/removeParticipants.js";
import { promoteParticipantsTool, handlePromoteParticipants } from "./tools/group/promoteParticipants.js";
import { demoteParticipantsTool, handleDemoteParticipants } from "./tools/group/demoteParticipants.js";
import { leaveGroupTool, handleLeaveGroup } from "./tools/group/leaveGroup.js";
import { getGroupInviteLinkTool, handleGetGroupInviteLink } from "./tools/group/getGroupInviteLink.js";
import { changeGroupInviteCodeTool, handleChangeGroupInviteCode } from "./tools/group/changeGroupInviteCode.js";
import { getGroupRequestsTool, handleGetGroupRequests } from "./tools/group/getGroupRequests.js";
import { rejectGroupRequestTool, handleRejectGroupRequest } from "./tools/group/rejectGroupRequest.js";
import { approveGroupRequestTool, handleApproveGroupRequest } from "./tools/group/approveGroupRequest.js";
import { getAllGroupsTool, handleGetAllGroups } from "./tools/group/getAllGroups.js";

import { handleCreateInstance } from "./tools/instance/createInstance.js";
import { handleGetQrCode } from "./tools/instance/getQrCode.js";
import { handleStartInstance } from "./tools/instance/startInstance.js";
import { handleStopInstance } from "./tools/instance/stopInstance.js";
import { handleDeleteInstance } from "./tools/instance/deleteInstance.js";

// Configuration from environment variables
const config = {
  wapulseToken: process.env.WAPULSE_TOKEN || "",
  wapulseInstanceID: process.env.WAPULSE_INSTANCE_ID || "",
  wapulseBaseUrl: process.env.WAPULSE_BASE_URL || "https://wapulseserver.com:3003"
};

// Validate required configuration
if (!config.wapulseToken) {
  console.error("❌ Error: WAPULSE_TOKEN environment variable is required");
  console.error("Please set your WaPulse API token:");
  console.error("export WAPULSE_TOKEN='your-token-here'");
  process.exit(1);
}

if (!config.wapulseInstanceID) {
  console.error("❌ Error: WAPULSE_INSTANCE_ID environment variable is required");
  console.error("Please set your WaPulse instance ID:");
  console.error("export WAPULSE_INSTANCE_ID='your-instance-id-here'");
  process.exit(1);
}

// Set base URL for API requests
process.env.WAPULSE_BASE_URL = config.wapulseBaseUrl;

console.log("🚀 Starting WaPulse MCP Server (STDIO mode) with all 25 tools...");

const server = new Server(
  {
    name: "WaPulse WhatsApp MCP Server",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to adapt context
function adaptContext() {
  const logFunction = (level: string, message: string, meta?: any) => {
    const logLevel = level.toUpperCase();
    if (level === 'error') {
      console.error(`[${logLevel}] ${message}`, meta || '');
    } else if (level === 'warn') {
      console.warn(`[${logLevel}] ${message}`, meta || '');
    } else {
      console.log(`[${logLevel}] ${message}`, meta || '');
    }
  };

  // Create a function that can be called both ways
  const log = Object.assign(logFunction, {
    info: (message: string, meta?: any) => {
      console.log(`[INFO] ${message}`, meta || '');
    },
    error: (message: string, meta?: any) => {
      console.error(`[ERROR] ${message}`, meta || '');
    },
    warn: (message: string, meta?: any) => {
      console.warn(`[WARN] ${message}`, meta || '');
    },
    debug: (message: string, meta?: any) => {
      console.log(`[DEBUG] ${message}`, meta || '');
    }
  });

  return { log };
}

// Helper function to convert tool response to MCP format
function convertResponse(result: any) {
  if (result && result.content && Array.isArray(result.content)) {
    return {
      content: result.content.map((item: any) => ({
        type: item.type || "text",
        text: item.text || item.data || JSON.stringify(item)
      }))
    };
  }
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(result, null, 2)
    }]
  };
}

// All available tools
const allTools = [
  // Messaging tools (6)
  sendMessageTool,
  sendFilesTool,
  sendAudioTool,
  loadChatAllMessagesTool,
  isExistsTool,
  validatePhoneNumberTool,
  
  // General tools (2)
  getAllChatsTool,
  wapulseDocTool,
  
  // Group tools (12)
  createGroupTool,
  addParticipantsTool,
  removeParticipantsTool,
  promoteParticipantsTool,
  demoteParticipantsTool,
  leaveGroupTool,
  getGroupInviteLinkTool,
  changeGroupInviteCodeTool,
  getGroupRequestsTool,
  rejectGroupRequestTool,
  approveGroupRequestTool,
  getAllGroupsTool,
  
  // Instance tools (5) - manually defined since they don't have tool objects
  {
    name: 'create_instance',
    description: 'Create a new WhatsApp instance',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'WaPulse API token' }
      },
      required: ['token'],
      additionalProperties: false
    }
  },
  {
    name: 'get_qr_code',
    description: 'Get QR code for WhatsApp Web connection',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'WaPulse API token' },
        instanceID: { type: 'string', description: 'WhatsApp instance ID' }
      },
      required: ['token', 'instanceID'],
      additionalProperties: false
    }
  },
  {
    name: 'start_instance',
    description: 'Start a WhatsApp instance to begin receiving and sending messages',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'WaPulse API token' },
        instanceID: { type: 'string', description: 'WhatsApp instance ID' }
      },
      required: ['token', 'instanceID'],
      additionalProperties: false
    }
  },
  {
    name: 'stop_instance',
    description: 'Stop a running WhatsApp instance',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'WaPulse API token' },
        instanceID: { type: 'string', description: 'WhatsApp instance ID' }
      },
      required: ['token', 'instanceID'],
      additionalProperties: false
    }
  },
  {
    name: 'delete_instance',
    description: 'Permanently delete a WhatsApp instance',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'WaPulse API token' },
        instanceID: { type: 'string', description: 'WhatsApp instance ID' }
      },
      required: ['token', 'instanceID'],
      additionalProperties: false
    }
  }
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map(tool => ({
      name: tool.name!,
      description: tool.description!,
      inputSchema: tool.inputSchema!
    }))
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    
    switch (name) {
      // Messaging tools
      case "send_whatsapp_message":
        result = await handleSendMessage({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "send_whatsapp_files":
        result = await handleSendFiles({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "send_whatsapp_audio":
        result = await handleSendAudio({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "load_chat_messages":
        result = await handleLoadChatAllMessages({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "check_id_exists":
        result = await handleIsExists({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "validate_phone_number":
        result = await handleValidatePhoneNumber(args);
        break;
        
      // General tools
      case "get_all_chats":
        result = await handleGetAllChats({ customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "get_wapulse_documentation":
        result = await handleGetWapulseDoc(args || {}, adaptContext());
        break;
        
      // Group tools
      case "create_whatsapp_group":
        result = await handleCreateGroup({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "add_group_participants":
        result = await handleAddParticipants({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "remove_group_participants":
        result = await handleRemoveParticipants({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "promote_group_participants":
        result = await handlePromoteParticipants({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "demote_group_participants":
        result = await handleDemoteParticipants({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "leave_whatsapp_group":
        result = await handleLeaveGroup({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "get_group_invite_link":
        result = await handleGetGroupInviteLink({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "change_group_invite_code":
        result = await handleChangeGroupInviteCode({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "get_group_requests":
        result = await handleGetGroupRequests({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "reject_group_request":
        result = await handleRejectGroupRequest({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "approve_group_request":
        result = await handleApproveGroupRequest({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
      case "get_all_groups":
        result = await handleGetAllGroups({ ...args, customToken: config.wapulseToken, customInstanceID: config.wapulseInstanceID }, adaptContext());
        break;
        
      // Instance tools
      case "create_instance":
        result = await handleCreateInstance({ token: config.wapulseToken });
        break;
      case "get_qr_code":
        result = await handleGetQrCode({ token: config.wapulseToken, instanceID: config.wapulseInstanceID });
        break;
      case "start_instance":
        result = await handleStartInstance({ token: config.wapulseToken, instanceID: config.wapulseInstanceID });
        break;
      case "stop_instance":
        result = await handleStopInstance({ token: config.wapulseToken, instanceID: config.wapulseInstanceID });
        break;
      case "delete_instance":
        result = await handleDeleteInstance({ token: config.wapulseToken, instanceID: config.wapulseInstanceID });
        break;
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return convertResponse(result);
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("✅ WaPulse MCP Server running on STDIO");
}

main().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
}); 
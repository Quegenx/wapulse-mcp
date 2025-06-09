import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { makeApiRequest } from '../../utils/helpers.js';

interface GroupInfo {
  id: string;
  name?: string;
  description?: string;
  participantCount?: number;
  participants?: string[];
  admins?: string[];
  isAdmin?: boolean;
  createdAt?: number;
  lastActivity?: number;
}

export const getAllGroupsTool: Tool = {
  name: 'get_all_groups',
  description: 'Get all WhatsApp groups for an instance',
  annotations: {
    title: 'Get All Groups',
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

export async function handleGetAllGroups(args: any, context?: any) {
  const schema = z.object({
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    if (log) {
      log.info("Getting all WhatsApp groups");
    }

    const response = await makeApiRequest('/api/getAllGroups', {}, customToken, customInstanceID);

    const groups: GroupInfo[] = response.groups || [];
    const totalGroups = groups.length;
    const adminGroups = groups.filter((group: GroupInfo) => group.isAdmin).length;
    const memberGroups = totalGroups - adminGroups;

    if (log) {
      log.info("All groups retrieved successfully", { 
        totalGroups, 
        adminGroups, 
        memberGroups 
      });
    }

    // Format the response with emojis and structure
    let groupList = `👥 WhatsApp Groups Overview\n\n`;
    groupList += `📊 Summary:\n`;
    groupList += `• Total Groups: ${totalGroups}\n`;
    groupList += `• 👑 Admin Groups: ${adminGroups}\n`;
    groupList += `• 👤 Member Groups: ${memberGroups}\n\n`;
    groupList += "=".repeat(50) + "\n\n";

    if (groups.length > 0) {
      groupList += `📋 Group List:\n\n`;
      
      groups.slice(0, 20).forEach((group: GroupInfo, index: number) => {
        const adminBadge = group.isAdmin ? ' 👑' : '';
        const participantCount = group.participantCount || group.participants?.length || 0;
        const createdDate = group.createdAt ? 
          new Date(group.createdAt * 1000).toLocaleDateString() : 'Unknown';
        
        groupList += `${index + 1}. 👥 ${group.name || 'Unnamed Group'}${adminBadge}\n`;
        groupList += `   🆔 ID: ${group.id}\n`;
        groupList += `   👤 Members: ${participantCount}\n`;
        groupList += `   📅 Created: ${createdDate}\n`;
        if (group.description) {
          groupList += `   📝 Description: ${group.description.substring(0, 50)}${group.description.length > 50 ? '...' : ''}\n`;
        }
        groupList += `\n`;
      });

      if (groups.length > 20) {
        groupList += `... and ${groups.length - 20} more groups\n\n`;
      }
    } else {
      groupList += `📭 No groups found\n\n`;
    }

    groupList += `📋 Full Response: ${JSON.stringify(response, null, 2)}`;
    
    return {
      content: [{
        type: 'text',
        text: groupList
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to get all groups", { error: error.message });
    }
    throw new McpError(ErrorCode.InternalError, `Failed to get all WhatsApp groups: ${error.message}`);
  }
} 
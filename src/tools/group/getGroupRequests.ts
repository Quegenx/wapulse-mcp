import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { makeApiRequest, formatPhoneNumber } from '../../utils/helpers.js';

interface GroupRequest {
  id?: string;
  number?: string;
  phone?: string;
  name?: string;
  timestamp?: number;
}

export const getGroupRequestsTool: Tool = {
  name: 'get_group_requests',
  description: 'Get pending join requests for a WhatsApp group',
  annotations: {
    title: 'Get Group Requests',
    readOnlyHint: true,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the group to get requests for'
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
    required: ['id'],
    additionalProperties: false
  }
};

export async function handleGetGroupRequests(args: any, context?: any) {
  const schema = z.object({
    id: z.string().min(1, 'Group ID cannot be empty'),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { id, customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    if (log) {
      log.info("Getting group requests", { groupId: id });
    }

    const response = await makeApiRequest('/api/getGroupRequests', {
      id
    }, customToken, customInstanceID);

    const requests: GroupRequest[] = response.requests || [];
    const requestCount = requests.length;
    
    if (log) {
      log.info("Group requests retrieved successfully", { groupId: id, requestCount });
    }

    let requestList = `📋 WhatsApp Group Join Requests\n\n`;
    requestList += `👥 Group ID: ${id}\n`;
    requestList += `📊 Pending Requests: ${requestCount}\n\n`;
    requestList += "=".repeat(50) + "\n\n";

    if (requests.length > 0) {
      requestList += `🙋 Pending Join Requests:\n\n`;
      
      requests.forEach((request: GroupRequest, index: number) => {
        const phoneNumber = request.number || request.phone || request.id || 'Unknown';
        const formattedPhone = phoneNumber.includes('@') ? phoneNumber : formatPhoneNumber(phoneNumber);
        const name = request.name || 'Unknown User';
        const timestamp = request.timestamp ? 
          new Date(request.timestamp * 1000).toLocaleString() : 'Unknown time';
        
        requestList += `${index + 1}. 👤 ${name}\n`;
        requestList += `   📱 Phone: ${formattedPhone}\n`;
        requestList += `   ⏰ Requested: ${timestamp}\n\n`;
      });

      requestList += `💡 Use approve_group_request or reject_group_request tools to manage these requests.\n\n`;
    } else {
      requestList += `✅ No pending join requests\n\n`;
    }

    requestList += `📋 Full Response: ${JSON.stringify(response, null, 2)}`;
    
    return {
      content: [{
        type: 'text',
        text: requestList
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to get group requests", { error: error.message, groupId: id });
    }
    throw new McpError(ErrorCode.InternalError, `Failed to get requests for group ${id}: ${error.message}`);
  }
} 
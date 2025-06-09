import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'fastmcp';
import { makeApiRequest } from '../../utils/helpers.js';

export const leaveGroupTool: Tool = {
  name: 'leave_whatsapp_group',
  description: 'Leave a WhatsApp group',
  annotations: {
    title: 'Leave WhatsApp Group',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the group to leave'
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

export async function handleLeaveGroup(args: any, context?: any) {
  const schema = z.object({
    id: z.string().min(1, 'Group ID cannot be empty'),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { id, customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    if (log) {
      log.info("Leaving WhatsApp group", { groupId: id });
    }

    const response = await makeApiRequest('/api/leaveGroup', {
      id
    }, customToken, customInstanceID);
    
    if (log) {
      log.info("Left group successfully", { groupId: id });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Successfully left WhatsApp group!\n\n👥 Group ID: ${id}\n🚪 Status: Left group\n\n⚠️ Note: You will no longer receive messages from this group and cannot send messages to it unless you are re-added.\n\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to leave group", { error: error.message, groupId: id });
    }
    throw new UserError(`Failed to leave WhatsApp group ${id}: ${error.message}`);
  }
} 
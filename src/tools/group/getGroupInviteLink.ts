import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'fastmcp';
import { makeApiRequest } from '../../utils/helpers.js';

export const getGroupInviteLinkTool: Tool = {
  name: 'get_group_invite_link',
  description: 'Get the invite link for a WhatsApp group',
  annotations: {
    title: 'Get Group Invite Link',
    readOnlyHint: true,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the group to get the invite link for'
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

export async function handleGetGroupInviteLink(args: any, context?: any) {
  const schema = z.object({
    id: z.string().min(1, 'Group ID cannot be empty'),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { id, customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    if (log) {
      log.info("Getting group invite link", { groupId: id });
    }

    const response = await makeApiRequest('/api/getGroupInviteLink', {
      id
    }, customToken, customInstanceID);

    const inviteLink = response.inviteLink || response.link || 'No invite link found';
    
    if (log) {
      log.info("Group invite link retrieved successfully", { groupId: id, hasLink: !!response.inviteLink });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Group invite link retrieved successfully!\n\n👥 Group ID: ${id}\n🔗 Invite Link: ${inviteLink}\n\n💡 Share this link to invite people to the group.\n⚠️ Anyone with this link can join the group.\n\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to get group invite link", { error: error.message, groupId: id });
    }
    throw new UserError(`Failed to get invite link for group ${id}: ${error.message}`);
  }
} 
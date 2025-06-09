import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'fastmcp';
import { makeApiRequest } from '../../utils/helpers.js';

export const changeGroupInviteCodeTool: Tool = {
  name: 'change_group_invite_code',
  description: 'Change the invite code for a WhatsApp group, generating a new invite link',
  annotations: {
    title: 'Change Group Invite Code',
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
        description: 'The ID of the group to change the invite code for'
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

export async function handleChangeGroupInviteCode(args: any, context?: any) {
  const schema = z.object({
    id: z.string().min(1, 'Group ID cannot be empty'),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { id, customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    if (log) {
      log.info("Changing group invite code", { groupId: id });
    }

    const response = await makeApiRequest('/api/changeGroupInviteCode', {
      id
    }, customToken, customInstanceID);

    const newLink = response.newLink || response.inviteLink || response.link || 'No new link found';
    
    if (log) {
      log.info("Group invite code changed successfully", { groupId: id, hasNewLink: !!response.newLink });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Group invite code changed successfully!\n\n👥 Group ID: ${id}\n🔗 New Invite Link: ${newLink}\n\n⚠️ Important: The old invite link is now invalid!\n💡 Share the new link to invite people to the group.\n🔄 This action invalidates all previous invite links.\n\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to change group invite code", { error: error.message, groupId: id });
    }
    throw new UserError(`Failed to change invite code for group ${id}: ${error.message}`);
  }
} 
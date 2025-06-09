import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { makeApiRequest, validateParticipants, formatPhoneNumber } from '../../utils/helpers.js';

export const removeParticipantsTool: Tool = {
  name: 'remove_group_participants',
  description: 'Remove participants from an existing WhatsApp group',
  annotations: {
    title: 'Remove Group Participants',
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
        description: 'The ID of the group to remove participants from'
      },
      participants: {
        type: 'array',
        description: 'Array of phone numbers to remove from the group (with country code, no + or spaces)',
        items: {
          type: 'string',
          pattern: '^\\d{1,4}\\d{6,15}$'
        },
        minItems: 1,
        maxItems: 50
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
    required: ['id', 'participants'],
    additionalProperties: false
  }
};

export async function handleRemoveParticipants(args: any, context?: any) {
  const schema = z.object({
    id: z.string().min(1, 'Group ID cannot be empty'),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format')).min(1).max(50),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { id, participants, customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    // Validate all participants
    validateParticipants(participants);

    if (log) {
      log.info("Removing participants from WhatsApp group", { 
        groupId: id, 
        participantCount: participants.length,
        participants: participants.map(p => formatPhoneNumber(p))
      });
    }

    const response = await makeApiRequest('/api/removeParticipants', {
      id,
      participants
    }, customToken, customInstanceID);

    const formattedParticipants = participants.map(p => `📱 ${formatPhoneNumber(p)}`).join('\n');
    
    if (log) {
      log.info("Participants removed successfully", { groupId: id, participantCount: participants.length });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Participants removed from WhatsApp group successfully!\n\n👥 Group ID: ${id}\n📊 Removed: ${participants.length} participants\n\n👤 Removed Members:\n${formattedParticipants}\n\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to remove participants", { error: error.message, groupId: id, participantCount: participants.length });
    }
    throw new McpError(ErrorCode.InternalError, `Failed to remove participants from group ${id}: ${error.message}`);
  }
} 
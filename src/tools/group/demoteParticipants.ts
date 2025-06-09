import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'fastmcp';
import { makeApiRequest, validateParticipants, formatPhoneNumber } from '../../utils/helpers.js';

export const demoteParticipantsTool: Tool = {
  name: 'demote_group_participants',
  description: 'Demote participants from admin status in a WhatsApp group',
  annotations: {
    title: 'Demote Group Participants',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the group to demote participants in'
      },
      participants: {
        type: 'array',
        description: 'Array of phone numbers to demote from admin status (with country code, no + or spaces)',
        items: {
          type: 'string',
          pattern: '^\\d{1,4}\\d{6,15}$'
        },
        minItems: 1,
        maxItems: 20
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

export async function handleDemoteParticipants(args: any, context?: any) {
  const schema = z.object({
    id: z.string().min(1, 'Group ID cannot be empty'),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format')).min(1).max(20),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { id, participants, customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    // Validate all participants
    validateParticipants(participants);

    if (log) {
      log.info("Demoting participants in WhatsApp group", { 
        groupId: id, 
        participantCount: participants.length,
        participants: participants.map(p => formatPhoneNumber(p))
      });
    }

    const response = await makeApiRequest('/api/demoteParticipants', {
      id,
      participants
    }, customToken, customInstanceID);

    const formattedParticipants = participants.map(p => `👤 ${formatPhoneNumber(p)}`).join('\n');
    
    if (log) {
      log.info("Participants demoted successfully", { groupId: id, participantCount: participants.length });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Participants demoted from admin status successfully!\n\n👥 Group ID: ${id}\n📊 Demoted: ${participants.length} participants\n\n👤 Demoted Members:\n${formattedParticipants}\n\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to demote participants", { error: error.message, groupId: id, participantCount: participants.length });
    }
    throw new UserError(`Failed to demote participants in group ${id}: ${error.message}`);
  }
} 
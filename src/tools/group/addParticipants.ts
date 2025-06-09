import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'fastmcp';
import { makeApiRequest, validateParticipants, formatPhoneNumber } from '../../utils/helpers.js';

export const addParticipantsTool: Tool = {
  name: 'add_group_participants',
  description: 'Add new participants to an existing WhatsApp group',
  annotations: {
    title: 'Add Group Participants',
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
        description: 'The ID of the group to add participants to'
      },
      participants: {
        type: 'array',
        description: 'Array of phone numbers to add to the group (with country code, no + or spaces)',
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

export async function handleAddParticipants(args: any, context?: any) {
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
      log.info("Adding participants to WhatsApp group", { 
        groupId: id, 
        participantCount: participants.length,
        participants: participants.map(p => formatPhoneNumber(p))
      });
    }

    const response = await makeApiRequest('/api/addParticipants', {
      id,
      participants
    }, customToken, customInstanceID);

    const formattedParticipants = participants.map(p => `📱 ${formatPhoneNumber(p)}`).join('\n');
    
    if (log) {
      log.info("Participants added successfully", { groupId: id, participantCount: participants.length });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Participants added to WhatsApp group successfully!\n\n👥 Group ID: ${id}\n📊 Added: ${participants.length} participants\n\n👤 New Members:\n${formattedParticipants}\n\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to add participants", { error: error.message, groupId: id, participantCount: participants.length });
    }
    throw new UserError(`Failed to add participants to group ${id}: ${error.message}`);
  }
} 
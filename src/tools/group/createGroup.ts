import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'fastmcp';
import { makeApiRequest, validateParticipants, formatPhoneNumber } from '../../utils/helpers.js';

export const createGroupTool: Tool = {
  name: 'create_whatsapp_group',
  description: 'Create a new WhatsApp group with specified participants',
  annotations: {
    title: 'Create WhatsApp Group',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the group',
        minLength: 1,
        maxLength: 100
      },
      participants: {
        type: 'array',
        description: 'Array of phone numbers to add to the group (with country code, no + or spaces)',
        items: {
          type: 'string',
          pattern: '^\\d{1,4}\\d{6,15}$'
        },
        minItems: 1,
        maxItems: 256
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
    required: ['name', 'participants'],
    additionalProperties: false
  }
};

export async function handleCreateGroup(args: any, context?: any) {
  const schema = z.object({
    name: z.string().min(1, 'Group name cannot be empty').max(100, 'Group name too long'),
    participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format')).min(1).max(256),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { name, participants, customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    // Validate all participants
    validateParticipants(participants);

    if (log) {
      log.info("Creating WhatsApp group", { 
        name, 
        participantCount: participants.length,
        participants: participants.map(p => formatPhoneNumber(p))
      });
    }

    const response = await makeApiRequest('/api/createGroup', {
      name,
      participants
    }, customToken, customInstanceID);

    const formattedParticipants = participants.map(p => `📱 ${formatPhoneNumber(p)}`).join('\n');
    
    if (log) {
      log.info("Group created successfully", { name, groupId: response.groupId || 'Unknown' });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ WhatsApp group created successfully!\n\n👥 Group Name: "${name}"\n📊 Participants: ${participants.length}\n\n👤 Members:\n${formattedParticipants}\n\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to create group", { error: error.message, name, participantCount: participants.length });
    }
    throw new UserError(`Failed to create WhatsApp group "${name}": ${error.message}`);
  }
} 
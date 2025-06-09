import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { makeApiRequest, validateParticipants, formatPhoneNumber } from '../../utils/helpers.js';

export const rejectGroupRequestTool: Tool = {
  name: 'reject_group_request',
  description: 'Reject pending join requests for a WhatsApp group',
  annotations: {
    title: 'Reject Group Request',
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
        description: 'The ID of the group to reject requests for'
      },
      numbers: {
        type: 'array',
        description: 'Array of phone numbers to reject requests for (with country code, no + or spaces)',
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
    required: ['id', 'numbers'],
    additionalProperties: false
  }
};

export async function handleRejectGroupRequest(args: any, context?: any) {
  const schema = z.object({
    id: z.string().min(1, 'Group ID cannot be empty'),
    numbers: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format')).min(1).max(20),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { id, numbers, customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    // Validate all phone numbers
    validateParticipants(numbers);

    if (log) {
      log.info("Rejecting group requests", { 
        groupId: id, 
        requestCount: numbers.length,
        numbers: numbers.map(n => formatPhoneNumber(n))
      });
    }

    const response = await makeApiRequest('/api/rejectGroupRequest', {
      id,
      numbers
    }, customToken, customInstanceID);

    const formattedNumbers = numbers.map(n => `❌ ${formatPhoneNumber(n)}`).join('\n');
    const success = response.success === 'true' || response.success === true;
    
    if (log) {
      log.info("Group requests rejected", { groupId: id, requestCount: numbers.length, success });
    }
    
    return {
      content: [{
        type: 'text',
        text: `${success ? '✅' : '⚠️'} Group join requests processed!\n\n👥 Group ID: ${id}\n📊 Rejected: ${numbers.length} requests\n🚫 Status: ${success ? 'SUCCESS' : 'PARTIAL/FAILED'}\n\n❌ Rejected Requests:\n${formattedNumbers}\n\n💡 These users will not be able to join the group and may need to request again.\n\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to reject group requests", { error: error.message, groupId: id, requestCount: numbers.length });
    }
    throw new McpError(ErrorCode.InternalError, `Failed to reject group requests for group ${id}: ${error.message}`);
  }
} 
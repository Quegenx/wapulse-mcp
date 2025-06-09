import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'fastmcp';
import { makeApiRequest, validateParticipants, formatPhoneNumber } from '../../utils/helpers.js';

export const approveGroupRequestTool: Tool = {
  name: 'approve_group_request',
  description: 'Approve pending join requests for a WhatsApp group',
  annotations: {
    title: 'Approve Group Request',
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
        description: 'The ID of the group to approve requests for'
      },
      numbers: {
        type: 'array',
        description: 'Array of phone numbers to approve requests for (with country code, no + or spaces)',
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

export async function handleApproveGroupRequest(args: any, context?: any) {
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
      log.info("Approving group requests", { 
        groupId: id, 
        requestCount: numbers.length,
        numbers: numbers.map(n => formatPhoneNumber(n))
      });
    }

    const response = await makeApiRequest('/api/approveGroupRequest', {
      id,
      numbers
    }, customToken, customInstanceID);

    const formattedNumbers = numbers.map(n => `✅ ${formatPhoneNumber(n)}`).join('\n');
    const success = response.success === 'true' || response.success === true;
    
    if (log) {
      log.info("Group requests approved", { groupId: id, requestCount: numbers.length, success });
    }
    
    return {
      content: [{
        type: 'text',
        text: `${success ? '✅' : '⚠️'} Group join requests processed!\n\n👥 Group ID: ${id}\n📊 Approved: ${numbers.length} requests\n🎉 Status: ${success ? 'SUCCESS' : 'PARTIAL/FAILED'}\n\n✅ Approved Requests:\n${formattedNumbers}\n\n🎉 These users can now participate in the group!\n💬 They will receive a notification that they've been added.\n\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to approve group requests", { error: error.message, groupId: id, requestCount: numbers.length });
    }
    throw new UserError(`Failed to approve group requests for group ${id}: ${error.message}`);
  }
} 
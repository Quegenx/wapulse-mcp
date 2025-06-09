import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { makeApiRequest } from '../../utils/helpers.js';

export const isExistsTool: Tool = {
  name: 'check_id_exists',
  description: 'Check if a specific user or group ID exists in WhatsApp using WaPulse API',
  annotations: {
    title: 'Check WhatsApp ID Exists',
    readOnlyHint: true,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      value: {
        type: 'string',
        description: 'The ID you want to check (phone number for user or group ID for group)'
      },
      type: {
        type: 'string',
        description: 'Type of ID to check',
        enum: ['user', 'group']
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
    required: ['value', 'type'],
    additionalProperties: false
  }
};

export async function handleIsExists(args: any, context?: any) {
  const schema = z.object({
    value: z.string(),
    type: z.enum(['user', 'group']),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { value, type, customToken, customInstanceID } = schema.parse(args);
  const { log } = context || {};

  try {
    if (log) {
      log.info("Checking ID existence", { value, type });
    }

    const response = await makeApiRequest('/api/isExists', {
      value,
      type
    }, customToken, customInstanceID);

    const typeEmoji = type === 'group' ? '👥' : '👤';
    const existsEmoji = response.exists ? '✅' : '❌';
    const statusText = response.exists ? 'EXISTS' : 'DOES NOT EXIST';
    
    if (log) {
      log.info("ID existence check completed", { value, type, exists: response.exists });
    }
    
    return {
      content: [{
        type: 'text',
        text: `${existsEmoji} ID Check Result\n\n${typeEmoji} Type: ${type}\n🔍 Value: ${value}\n📊 Status: ${statusText}\n📋 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to check ID existence", { error: error.message, value, type });
    }
    throw new McpError(ErrorCode.InternalError, `Failed to check if ${type} ID ${value} exists: ${error.message}`);
  }
} 
import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'fastmcp';
import { makeApiRequest, validatePhoneNumber, formatPhoneNumber } from '../../utils/helpers.js';

export const sendMessageTool: Tool = {
  name: 'send_whatsapp_message',
  description: 'Send a WhatsApp message to a specific phone number or group using WaPulse API',
  annotations: {
    title: 'Send WhatsApp Message',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Phone number (with country code, no + or spaces) or group ID',
        pattern: '^\\d{1,4}\\d{6,15}$',
        minLength: 6,
        maxLength: 20
      },
      message: {
        type: 'string',
        description: 'The message to send',
        minLength: 1,
        maxLength: 4096
      },
      type: {
        type: 'string',
        description: "Type of recipient: 'user' for individual contact, 'group' for WhatsApp group",
        enum: ['user', 'group'],
        default: 'user'
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
    required: ['to', 'message'],
    additionalProperties: false
  }
};

export async function handleSendMessage(args: any, context?: any) {
  const schema = z.object({
    to: z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format'),
    message: z.string().min(1).max(4096),
    type: z.enum(['user', 'group']).default('user'),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { to, message, type, customToken, customInstanceID } = schema.parse(args);

  // Validate phone number format
  const isValid = validatePhoneNumber(to);
  if (!isValid) {
    throw new UserError(`Invalid phone number format: ${to}. Use format: country code + number (e.g., 972512345678) - no + sign, no spaces`);
  }

  const { log } = context || {};
  
  try {
    if (log) {
      log.info("Sending WhatsApp message", { 
        to: formatPhoneNumber(to), 
        messageLength: message.length,
        type 
      });
    }

    const response = await makeApiRequest('/api/sendMessage', {
      to,
      message,
      type
    }, customToken, customInstanceID);

    const formattedPhone = formatPhoneNumber(to);
    
    if (log) {
      log.info("Message sent successfully", { to: formattedPhone });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Message sent successfully to ${formattedPhone}!\n\n📱 Recipient: ${formattedPhone}\n💬 Message: "${message}"\n📊 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to send message", { error: error.message, to });
    }
    throw new UserError(`Failed to send message to ${formatPhoneNumber(to)}: ${error.message}`);
  }
} 
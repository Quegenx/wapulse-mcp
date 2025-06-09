import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { makeApiRequest, validatePhoneNumber, formatPhoneNumber } from '../../utils/helpers.js';

export const sendFilesTool: Tool = {
  name: 'send_whatsapp_files',
  description: 'Send files (images, documents, etc.) to a specific phone number or group using WaPulse API',
  annotations: {
    title: 'Send WhatsApp Files',
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
        description: 'Phone number (with country code, no + or spaces)',
        pattern: '^\\d{1,4}\\d{6,15}$',
        minLength: 6,
        maxLength: 20
      },
      files: {
        type: 'array',
        description: 'Array of files to send',
        items: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              description: "Base64 encoded file data with data URI prefix (e.g., 'data:image/jpeg;base64,/9j/4AAQ...')"
            },
            filename: {
              type: 'string',
              description: 'Name of the file including extension'
            },
            caption: {
              type: 'string',
              description: 'Optional caption for the file'
            }
          },
          required: ['file', 'filename'],
          additionalProperties: false
        },
        minItems: 1,
        maxItems: 10
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
    required: ['to', 'files'],
    additionalProperties: false
  }
};

export async function handleSendFiles(args: any, context?: any) {
  const schema = z.object({
    to: z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format'),
    files: z.array(z.object({
      file: z.string(),
      filename: z.string(),
      caption: z.string().optional()
    })).min(1).max(10),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { to, files, customToken, customInstanceID } = schema.parse(args);

  // Validate phone number format
  const isValid = validatePhoneNumber(to);
  if (!isValid) {
          throw new McpError(ErrorCode.InvalidParams, `Invalid phone number format: ${to}. Use format: country code + number (e.g., 972512345678) - no + sign, no spaces`);
  }

  // Validate file data format
  for (const file of files) {
    if (!file.file.startsWith('data:')) {
              throw new McpError(ErrorCode.InvalidParams, `Invalid file format for "${file.filename}". File must be base64 encoded with data URI prefix (e.g., 'data:image/jpeg;base64,...')`);
    }
  }

  const { log, reportProgress } = context || {};

  try {
    if (log) {
      log.info("Sending WhatsApp files", { 
        to: formatPhoneNumber(to), 
        fileCount: files.length,
        filenames: files.map(f => f.filename)
      });
    }

    // Report initial progress
    if (reportProgress) {
      await reportProgress({ progress: 0, total: files.length });
    }

    const response = await makeApiRequest('/api/sendFiles', {
      to,
      files
    }, customToken, customInstanceID);

    // Report completion
    if (reportProgress) {
      await reportProgress({ progress: files.length, total: files.length });
    }

    const formattedPhone = formatPhoneNumber(to);
    const fileList = files.map(f => `📎 ${f.filename}${f.caption ? ` (${f.caption})` : ''}`).join('\n');
    
    if (log) {
      log.info("Files sent successfully", { to: formattedPhone, fileCount: files.length });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Files sent successfully to ${formattedPhone}!\n\n📱 Recipient: ${formattedPhone}\n📁 Files sent:\n${fileList}\n📊 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to send files", { error: error.message, to, fileCount: files.length });
    }
    throw new McpError(ErrorCode.InternalError, `Failed to send files to ${formatPhoneNumber(to)}: ${error.message}`);
  }
} 
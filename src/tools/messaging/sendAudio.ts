import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { UserError } from 'fastmcp';
import { makeApiRequest, validatePhoneNumber, formatPhoneNumber } from '../../utils/helpers.js';

export const sendAudioTool: Tool = {
  name: 'send_whatsapp_audio',
  description: 'Send audio messages (voice notes, music, etc.) to a specific phone number or group using WaPulse API',
  annotations: {
    title: 'Send WhatsApp Audio',
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
      audio: {
        type: 'object',
        description: 'Audio file to send',
        properties: {
          file: {
            type: 'string',
            description: "Base64 encoded audio data with data URI prefix (e.g., 'data:audio/mpeg;base64,/9j/4AAQ...')"
          },
          filename: {
            type: 'string',
            description: 'Name of the audio file including extension (e.g., voice_note.mp3, song.wav)'
          },
          caption: {
            type: 'string',
            description: 'Optional caption for the audio message'
          },
          isVoiceNote: {
            type: 'boolean',
            description: 'Whether this should be sent as a voice note (true) or regular audio file (false)',
            default: false
          }
        },
        required: ['file', 'filename'],
        additionalProperties: false
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
    required: ['to', 'audio'],
    additionalProperties: false
  }
};

export async function handleSendAudio(args: any, context?: any) {
  const schema = z.object({
    to: z.string().regex(/^\d{1,4}\d{6,15}$/, 'Invalid phone number format'),
    audio: z.object({
      file: z.string(),
      filename: z.string(),
      caption: z.string().optional(),
      isVoiceNote: z.boolean().default(false)
    }),
    customToken: z.string().optional(),
    customInstanceID: z.string().optional()
  });

  const { to, audio, customToken, customInstanceID } = schema.parse(args);

  // Validate phone number format
  const isValid = validatePhoneNumber(to);
  if (!isValid) {
    throw new UserError(`Invalid phone number format: ${to}. Use format: country code + number (e.g., 972512345678) - no + sign, no spaces`);
  }

  // Validate audio file format
  if (!audio.file.startsWith('data:audio/')) {
    throw new UserError(`Invalid audio format for "${audio.filename}". File must be base64 encoded audio with data URI prefix (e.g., 'data:audio/mpeg;base64,...')`);
  }

  // Validate audio file extensions
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.flac'];
  const hasValidExtension = audioExtensions.some(ext => 
    audio.filename.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    throw new UserError(`Invalid audio file extension for "${audio.filename}". Supported formats: ${audioExtensions.join(', ')}`);
  }

  const { log, reportProgress } = context || {};

  try {
    if (log) {
      log.info("Sending WhatsApp audio", { 
        to: formatPhoneNumber(to), 
        filename: audio.filename,
        isVoiceNote: audio.isVoiceNote,
        hasCaption: !!audio.caption
      });
    }

    // Report initial progress
    if (reportProgress) {
      await reportProgress({ progress: 0, total: 1 });
    }

    // Prepare the request payload
    const payload = {
      to,
      files: [{
        file: audio.file,
        filename: audio.filename,
        caption: audio.caption,
        type: audio.isVoiceNote ? 'voice' : 'audio'
      }]
    };

    const response = await makeApiRequest('/api/sendFiles', payload, customToken, customInstanceID);

    // Report completion
    if (reportProgress) {
      await reportProgress({ progress: 1, total: 1 });
    }

    const formattedPhone = formatPhoneNumber(to);
    const audioType = audio.isVoiceNote ? '🎤 Voice Note' : '🎵 Audio File';
    const captionText = audio.caption ? `\n💬 Caption: ${audio.caption}` : '';
    
    if (log) {
      log.info("Audio sent successfully", { 
        to: formattedPhone, 
        filename: audio.filename,
        type: audio.isVoiceNote ? 'voice' : 'audio'
      });
    }
    
    return {
      content: [{
        type: 'text',
        text: `✅ Audio sent successfully to ${formattedPhone}!\n\n📱 Recipient: ${formattedPhone}\n${audioType}: ${audio.filename}${captionText}\n📊 Response: ${JSON.stringify(response, null, 2)}`
      }]
    };
  } catch (error: any) {
    if (log) {
      log.error("Failed to send audio", { 
        error: error.message, 
        to, 
        filename: audio.filename 
      });
    }
    throw new UserError(`Failed to send audio to ${formatPhoneNumber(to)}: ${error.message}`);
  }
} 
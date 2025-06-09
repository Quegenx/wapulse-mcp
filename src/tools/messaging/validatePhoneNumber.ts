import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { validatePhoneNumber, formatPhoneNumber } from '../../utils/helpers.js';

export const validatePhoneNumberTool: Tool = {
  name: 'validate_phone_number',
  description: 'Validate if a phone number is in the correct format for WaPulse API',
  annotations: {
    title: 'Validate Phone Number',
    readOnlyHint: true,
    idempotentHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'Phone number to validate'
      }
    },
    required: ['phoneNumber'],
    additionalProperties: false
  }
};

export async function handleValidatePhoneNumber(args: any) {
  const schema = z.object({
    phoneNumber: z.string()
  });

  const { phoneNumber } = schema.parse(args);

  const isValid = validatePhoneNumber(phoneNumber);
  
  if (isValid) {
    const formatted = formatPhoneNumber(phoneNumber);
    // Extract country code (first 1-4 digits)
    const countryCode = phoneNumber.match(/^(\d{1,4})/)?.[1] || '';
    
    return {
      content: [{
        type: 'text',
        text: `✅ Phone number is valid!\n\n📱 Original: ${phoneNumber}\n📞 Formatted: ${formatted}\n🌍 Country Code: ${countryCode}\n📊 Status: VALID`
      }]
    };
  } else {
    return {
      content: [{
        type: 'text',
        text: `❌ Phone number is invalid!\n\n📱 Number: ${phoneNumber}\n🚫 Error: Must be 7-19 digits with country code\n📊 Status: INVALID\n\n💡 Tip: Phone numbers should include country code (e.g., 972512345678 for Israel)`
      }]
    };
  }
} 
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { InstanceConfig } from "../types/api.js";

// Phone number validation regex (country code + number, no + sign, no spaces)
export const phoneRegex = /^\d{1,4}\d{6,15}$/;

// Default configuration - can be overridden by environment variables
export const DEFAULT_CONFIG: InstanceConfig = {
  token: "***REMOVED***",
  instanceID: "d20dba45-852a-4bfc-ab43-8bfd2d28c2a4",
  baseUrl: "https://wapulseserver.com:3003"
};

// Helper function to get configuration
export function getConfig(): InstanceConfig {
  return {
    token: process.env.WAPULSE_TOKEN || DEFAULT_CONFIG.token,
    instanceID: process.env.WAPULSE_INSTANCE_ID || DEFAULT_CONFIG.instanceID,
    baseUrl: process.env.WAPULSE_BASE_URL || DEFAULT_CONFIG.baseUrl
  };
}

// Helper function to validate phone number format
export function validatePhoneNumber(phoneNumber: string): boolean {
  return phoneRegex.test(phoneNumber);
}

// Helper function to format phone number for display
export function formatPhoneNumber(phoneNumber: string): string {
  // Add some basic formatting for readability
  if (phoneNumber.length >= 10) {
    const countryCode = phoneNumber.slice(0, -9);
    const number = phoneNumber.slice(-9);
    return `+${countryCode} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }
  return phoneNumber;
}

// Helper function to validate participants array
export function validateParticipants(participants: string[]): void {
  if (participants.length === 0) {
    throw new McpError(ErrorCode.InvalidParams, "At least one participant must be provided.");
  }
  
  for (const participant of participants) {
    if (!validatePhoneNumber(participant)) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid phone number format: ${participant}. Use format: country code + number (e.g., 353871234567) - no + sign, no spaces`);
    }
  }
}

// Helper function to handle API errors
export function handleApiError(response: Response, errorText?: string): string {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  
  if (errorText) {
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.error) {
        errorMessage = errorData.error;
        if (errorData.details) {
          errorMessage += ` - ${errorData.details}`;
        }
      }
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }
  }
  
  return errorMessage;
}

// Helper function to make API requests
export async function makeApiRequest(
  endpoint: string, 
  data: any, 
  customToken?: string, 
  customInstanceID?: string
): Promise<any> {
  const config = getConfig();
  const token = customToken || config.token;
  const instanceID = customInstanceID || config.instanceID;
  
  if (!token) {
    throw new McpError(ErrorCode.InvalidParams, "WaPulse token not configured. Please set WAPULSE_TOKEN environment variable or provide customToken parameter.");
  }

  if (!instanceID) {
    throw new McpError(ErrorCode.InvalidParams, "WaPulse instance ID not configured. Please set WAPULSE_INSTANCE_ID environment variable or provide customInstanceID parameter.");
  }
  
  const url = `${config.baseUrl}${endpoint}`;
  
  // WaPulse API expects token and instanceID in the request body
  const requestBody = {
    token: token,
    instanceID: instanceID,
    ...data
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    const errorMessage = handleApiError(response, responseText);
    throw new McpError(ErrorCode.InternalError, errorMessage);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { success: true, data: responseText };
  }
} 
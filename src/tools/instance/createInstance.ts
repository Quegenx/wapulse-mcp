import { z } from "zod";
import { makeApiRequest } from "../../utils/helpers.js";
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { CreateInstanceRequest, CreateInstanceResponse } from "../../types/api.js";

export const createInstanceSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function handleCreateInstance(
  args: z.infer<typeof createInstanceSchema>,
  context?: { log?: (level: string, message: string, meta?: any) => void }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { token } = args;
  const { log } = context || {};

  try {
    if (log) {
      log("info", "Creating new WhatsApp instance", { token: token.substring(0, 8) + "..." });
    }

    const requestBody: CreateInstanceRequest = {
      token
    };

    const response = await makeApiRequest('/api/addInstance', requestBody) as CreateInstanceResponse;

    if (log) {
      log("info", "Instance created successfully", { 
        instanceID: response.instance?.instanceID,
        message: response.message 
      });
    }

    const instanceInfo = response.instance ? `
🆔 Instance ID: ${response.instance.instanceID}
📊 Instance Details: ${JSON.stringify(response.instance, null, 2)}` : '';

    return {
      content: [{
        type: "text",
        text: `✅ WhatsApp Instance Created Successfully!

💬 Message: ${response.message}${instanceInfo}

🔧 Next Steps:
1. Use 'get_qr_code' to get the QR code for WhatsApp Web connection
2. Scan the QR code with your WhatsApp mobile app
3. Use 'start_instance' to begin sending/receiving messages

📋 Full Response: ${JSON.stringify(response, null, 2)}`
      }]
    };

  } catch (error) {
    if (log) {
      log("error", "Failed to create instance", { error: (error as Error).message, token: token.substring(0, 8) + "..." });
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(ErrorCode.InternalError, `Failed to create WhatsApp instance: ${(error as Error).message}`);
  }
} 
import { z } from "zod";
import { makeApiRequest } from "../../utils/helpers.js";
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { StartInstanceRequest, StartInstanceResponse } from "../../types/api.js";

export const startInstanceSchema = z.object({
  token: z.string().min(1, "Token is required"),
  instanceID: z.string().min(1, "Instance ID is required"),
});

export async function handleStartInstance(
  args: z.infer<typeof startInstanceSchema>,
  context?: { log?: (level: string, message: string, meta?: any) => void }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { token, instanceID } = args;
  const { log } = context || {};

  try {
    if (log) {
      log("info", "Starting WhatsApp instance", { 
        instanceID,
        token: token.substring(0, 8) + "..." 
      });
    }

    const requestBody: StartInstanceRequest = {
      token,
      instanceID
    };

    const response = await makeApiRequest('/api/startInstance', requestBody) as StartInstanceResponse;

    if (log) {
      log("info", "Instance started successfully", { 
        instanceID: response.instance?.instanceID || instanceID,
        message: response.message 
      });
    }

    const instanceInfo = response.instance ? `
🆔 Instance ID: ${response.instance.instanceID}
📊 Instance Details: ${JSON.stringify(response.instance, null, 2)}` : '';

    return {
      content: [{
        type: "text",
        text: `✅ WhatsApp Instance Started Successfully!

💬 Message: ${response.message}${instanceInfo}

🚀 Instance Status: RUNNING
📱 Ready to send and receive messages!

💡 Available Actions:
- Send messages using 'send_whatsapp_message'
- Send files using 'send_whatsapp_files'
- Load chat history using 'load_chat_messages'
- Manage groups using group management tools
- Get all chats using 'get_all_chats'

📋 Full Response: ${JSON.stringify(response, null, 2)}`
      }]
    };

  } catch (error) {
    if (log) {
      log("error", "Failed to start instance", { 
        error: (error as Error).message, 
        instanceID,
        token: token.substring(0, 8) + "..." 
      });
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(ErrorCode.InternalError, `Failed to start WhatsApp instance ${instanceID}: ${(error as Error).message}`);
  }
} 
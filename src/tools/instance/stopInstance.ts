import { z } from "zod";
import { makeApiRequest } from "../../utils/helpers.js";
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'; 
import type { StopInstanceRequest, StopInstanceResponse } from "../../types/api.js";

export const stopInstanceSchema = z.object({
  token: z.string().min(1, "Token is required"),
  instanceID: z.string().min(1, "Instance ID is required"),
});

export async function handleStopInstance(
  args: z.infer<typeof stopInstanceSchema>,
  context?: { log?: (level: string, message: string, meta?: any) => void }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { token, instanceID } = args;
  const { log } = context || {};

  try {
    if (log) {
      log("info", "Stopping WhatsApp instance", { 
        instanceID,
        token: token.substring(0, 8) + "..." 
      });
    }

    const requestBody: StopInstanceRequest = {
      token,
      instanceID
    };

    const response = await makeApiRequest('/api/stopInstance', requestBody) as StopInstanceResponse;

    if (log) {
      log("info", "Instance stopped successfully", { 
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
        text: `⏹️ WhatsApp Instance Stopped Successfully!

💬 Message: ${response.message}${instanceInfo}

🛑 Instance Status: STOPPED
📱 No longer sending or receiving messages

💡 Next Actions:
- Use 'start_instance' to restart the instance
- Use 'get_qr_code' if you need to reconnect WhatsApp Web
- Use 'delete_instance' to permanently remove the instance

⚠️ Note: While stopped, the instance cannot send/receive messages or perform WhatsApp operations.

📋 Full Response: ${JSON.stringify(response, null, 2)}`
      }]
    };

  } catch (error) {
    if (log) {
      log("error", "Failed to stop instance", { 
        error: (error as Error).message, 
        instanceID,
        token: token.substring(0, 8) + "..." 
      });
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(ErrorCode.InternalError, `Failed to stop WhatsApp instance ${instanceID}: ${(error as Error).message}`);
  }
} 
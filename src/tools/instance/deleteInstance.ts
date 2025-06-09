import { z } from "zod";
import { makeApiRequest } from "../../utils/helpers.js";
import { UserError } from "fastmcp";
import type { DeleteInstanceRequest, DeleteInstanceResponse } from "../../types/api.js";

export const deleteInstanceSchema = z.object({
  token: z.string().min(1, "Token is required"),
  instanceID: z.string().min(1, "Instance ID is required"),
});

export async function handleDeleteInstance(
  args: z.infer<typeof deleteInstanceSchema>,
  context?: { log?: (level: string, message: string, meta?: any) => void }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { token, instanceID } = args;
  const { log } = context || {};

  try {
    if (log) {
      log("info", "Deleting WhatsApp instance", { 
        instanceID,
        token: token.substring(0, 8) + "..." 
      });
    }

    const requestBody: DeleteInstanceRequest = {
      token,
      instanceID
    };

    const response = await makeApiRequest('/api/deleteInstance', requestBody) as DeleteInstanceResponse;

    if (log) {
      log("info", "Instance deleted successfully", { 
        instanceID,
        message: response.message 
      });
    }

    return {
      content: [{
        type: "text",
        text: `🗑️ WhatsApp Instance Deleted Successfully!

💬 Message: ${response.message}
🆔 Deleted Instance ID: ${instanceID}

⚠️ PERMANENT ACTION COMPLETED
📱 Instance has been permanently removed
🚫 All associated data and connections have been deleted

💡 To use WhatsApp again:
1. Create a new instance using 'create_instance'
2. Get QR code using 'get_qr_code'
3. Scan QR code with WhatsApp mobile app
4. Start the new instance using 'start_instance'

📋 Full Response: ${JSON.stringify(response, null, 2)}`
      }]
    };

  } catch (error) {
    if (log) {
      log("error", "Failed to delete instance", { 
        error: (error as Error).message, 
        instanceID,
        token: token.substring(0, 8) + "..." 
      });
    }
    
    if (error instanceof UserError) {
      throw error;
    }
    
    throw new UserError(`Failed to delete WhatsApp instance ${instanceID}: ${(error as Error).message}`);
  }
} 
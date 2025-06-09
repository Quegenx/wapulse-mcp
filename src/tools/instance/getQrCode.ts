import { z } from "zod";
import { makeApiRequest } from "../../utils/helpers.js";
import { UserError } from "fastmcp";
import type { GetQrCodeRequest, GetQrCodeResponse } from "../../types/api.js";

export const getQrCodeSchema = z.object({
  token: z.string().min(1, "Token is required"),
  instanceID: z.string().min(1, "Instance ID is required"),
});

export async function handleGetQrCode(
  args: z.infer<typeof getQrCodeSchema>,
  context?: { log?: (level: string, message: string, meta?: any) => void }
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { token, instanceID } = args;
  const { log } = context || {};

  try {
    if (log) {
      log("info", "Retrieving QR code for WhatsApp Web connection", { 
        instanceID,
        token: token.substring(0, 8) + "..." 
      });
    }

    const requestBody: GetQrCodeRequest = {
      token,
      instanceID
    };

    const response = await makeApiRequest('/api/qrCode', requestBody) as GetQrCodeResponse;

    if (log) {
      log("info", "QR code retrieved successfully", { 
        instanceID,
        hasQrCode: !!response.qrCode 
      });
    }

    const qrCodeLength = response.qrCode ? response.qrCode.length : 0;

    return {
      content: [{
        type: "text",
        text: `📱 WhatsApp Web QR Code Retrieved!

🆔 Instance ID: ${instanceID}
📊 QR Code Length: ${qrCodeLength} characters
${response.qrCode ? `🔗 QR Code Data: ${response.qrCode.substring(0, 100)}${qrCodeLength > 100 ? '...' : ''}` : '❌ No QR code data received'}

📋 Instructions:
1. Generate a QR code image from the QR code data above
2. Open WhatsApp on your mobile device
3. Go to Settings > Linked Devices > Link a Device
4. Scan the QR code with your phone's camera
5. Once connected, use 'start_instance' to begin messaging

⚠️ Note: QR codes expire after a short time. If connection fails, request a new QR code.

📋 Full Response: ${JSON.stringify(response, null, 2)}`
      }]
    };

  } catch (error) {
    if (log) {
      log("error", "Failed to retrieve QR code", { 
        error: (error as Error).message, 
        instanceID,
        token: token.substring(0, 8) + "..." 
      });
    }
    
    if (error instanceof UserError) {
      throw error;
    }
    
    throw new UserError(`Failed to retrieve QR code for instance ${instanceID}: ${(error as Error).message}`);
  }
} 
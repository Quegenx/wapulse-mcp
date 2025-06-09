import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

// Import all tool definitions and handlers
import { sendMessageTool, handleSendMessage } from "./tools/messaging/sendMessage.js"
import { sendFilesTool, handleSendFiles } from "./tools/messaging/sendFiles.js"
import { sendAudioTool, handleSendAudio } from "./tools/messaging/sendAudio.js"
import { loadChatAllMessagesTool, handleLoadChatAllMessages } from "./tools/messaging/loadChatAllMessages.js"
import { isExistsTool, handleIsExists } from "./tools/messaging/isExists.js"
import { validatePhoneNumberTool, handleValidatePhoneNumber } from "./tools/messaging/validatePhoneNumber.js"

import { getAllChatsTool, handleGetAllChats } from "./tools/general/getAllChats.js"
import { wapulseDocTool, handleGetWapulseDoc } from "./tools/general/wapulseDoc.js"

import { createGroupTool, handleCreateGroup } from "./tools/group/createGroup.js"
import { addParticipantsTool, handleAddParticipants } from "./tools/group/addParticipants.js"
import { removeParticipantsTool, handleRemoveParticipants } from "./tools/group/removeParticipants.js"
import { promoteParticipantsTool, handlePromoteParticipants } from "./tools/group/promoteParticipants.js"
import { demoteParticipantsTool, handleDemoteParticipants } from "./tools/group/demoteParticipants.js"
import { leaveGroupTool, handleLeaveGroup } from "./tools/group/leaveGroup.js"
import { getGroupInviteLinkTool, handleGetGroupInviteLink } from "./tools/group/getGroupInviteLink.js"
import { changeGroupInviteCodeTool, handleChangeGroupInviteCode } from "./tools/group/changeGroupInviteCode.js"
import { getGroupRequestsTool, handleGetGroupRequests } from "./tools/group/getGroupRequests.js"
import { rejectGroupRequestTool, handleRejectGroupRequest } from "./tools/group/rejectGroupRequest.js"
import { approveGroupRequestTool, handleApproveGroupRequest } from "./tools/group/approveGroupRequest.js"
import { getAllGroupsTool, handleGetAllGroups } from "./tools/group/getAllGroups.js"

import { handleCreateInstance } from "./tools/instance/createInstance.js"
import { handleGetQrCode } from "./tools/instance/getQrCode.js"
import { handleStartInstance } from "./tools/instance/startInstance.js"
import { handleStopInstance } from "./tools/instance/stopInstance.js"
import { handleDeleteInstance } from "./tools/instance/deleteInstance.js"

export const configSchema = z.object({
	wapulseToken: z.string().describe("WaPulse API token"),
	wapulseInstanceID: z.string().describe("WaPulse instance ID"),
	wapulseBaseUrl: z.string().default("https://wapulseserver.com:3003").describe("WaPulse API base URL"),
})

export default function ({ config }: { config: z.infer<typeof configSchema> }) {
	try {
		console.log("🚀 Starting WaPulse MCP Server with all 25 tools...")

		// Ensure config values are available
		if (!config.wapulseToken || !config.wapulseInstanceID) {
			throw new Error("Missing required configuration: wapulseToken and wapulseInstanceID are required");
		}

		// Set the base URL for API requests
		process.env.WAPULSE_BASE_URL = config.wapulseBaseUrl;

		const server = new McpServer({
			name: "WaPulse WhatsApp MCP Server",
			version: "2.0.0",
		})

		// Helper function to convert tool response to MCP format
		function convertResponse(result: any) {
			if (result && result.content && Array.isArray(result.content)) {
				return {
					content: result.content.map((item: any) => ({
						type: item.type || "text",
						text: item.text || item.data || JSON.stringify(item)
					}))
				};
			}
			return {
				content: [{
					type: "text" as const,
					text: JSON.stringify(result, null, 2)
				}]
			};
		}

		// Helper function to adapt context
		function adaptContext() {
			const logFunction = (level: string, message: string, meta?: any) => {
				const logLevel = level.toUpperCase();
				if (level === 'error') {
					console.error(`[${logLevel}] ${message}`, meta || '');
				} else if (level === 'warn') {
					console.warn(`[${logLevel}] ${message}`, meta || '');
				} else {
					console.log(`[${logLevel}] ${message}`, meta || '');
				}
			};

			// Create a function that can be called both ways
			const log = Object.assign(logFunction, {
				info: (message: string, meta?: any) => {
					console.log(`[INFO] ${message}`, meta || '');
				},
				error: (message: string, meta?: any) => {
					console.error(`[ERROR] ${message}`, meta || '');
				},
				warn: (message: string, meta?: any) => {
					console.warn(`[WARN] ${message}`, meta || '');
				},
				debug: (message: string, meta?: any) => {
					console.log(`[DEBUG] ${message}`, meta || '');
				}
			});

			return { log };
		}

		// Register messaging tools
		server.tool(sendMessageTool.name!!, sendMessageTool.description!!, {
			to: z.string().regex(/^\d{1,4}\d{6,15}$/),
			message: z.string().min(1).max(4096),
			type: z.enum(['user', 'group']).default('user'),
			customToken: z.string().optional(),
			customInstanceID: z.string().optional()
		}, sendMessageTool.annotations ?? {}, async (args) => {
			const { customToken, customInstanceID, ...restArgs } = args;
			const token = customToken ?? config.wapulseToken!;
			const instanceID = customInstanceID ?? config.wapulseInstanceID!;
			const result = await handleSendMessage({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext());
			return convertResponse(result);
		});

		server.tool(sendFilesTool.name!, sendFilesTool.description!, {
			to: z.string().regex(/^\d{1,4}\d{6,15}$/),
			files: z.array(z.object({
				file: z.string(),
				filename: z.string(),
				caption: z.string().optional()
			})).min(1).max(10),
			customToken: z.string().optional(),
			customInstanceID: z.string().optional()
		}, sendFilesTool.annotations ?? {}, async (args) => {
			const { customToken, customInstanceID, ...restArgs } = args;
			const token = customToken ?? config.wapulseToken!;
			const instanceID = customInstanceID ?? config.wapulseInstanceID!;
			const result = await handleSendFiles({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext());
			return convertResponse(result);
		});

		server.tool(sendAudioTool.name!, sendAudioTool.description!, {
			to: z.string().regex(/^\d{1,4}\d{6,15}$/),
			audio: z.object({
				file: z.string(),
				filename: z.string(),
				caption: z.string().optional(),
				isVoiceNote: z.boolean().default(false)
			}),
			customToken: z.string().optional(),
			customInstanceID: z.string().optional()
		}, sendAudioTool.annotations ?? {}, async (args) => {
			const { customToken, customInstanceID, ...restArgs } = args;
			const token = customToken ?? config.wapulseToken!;
			const instanceID = customInstanceID ?? config.wapulseInstanceID!;
			const result = await handleSendAudio({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext());
			return convertResponse(result);
		});

		server.tool(loadChatAllMessagesTool.name!, loadChatAllMessagesTool.description!, {
			id: z.string(),
			type: z.enum(['user', 'group']),
			until: z.string().optional(),
			customToken: z.string().optional(),
			customInstanceID: z.string().optional()
		}, loadChatAllMessagesTool.annotations ?? {}, async (args) => {
			const { customToken, customInstanceID, ...restArgs } = args;
			const token = customToken ?? config.wapulseToken!;
			const instanceID = customInstanceID ?? config.wapulseInstanceID!;
			const result = await handleLoadChatAllMessages({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext());
			return convertResponse(result);
		});

		server.tool(isExistsTool.name!, isExistsTool.description!, {
			value: z.string(),
			type: z.enum(['user', 'group']),
			customToken: z.string().optional(),
			customInstanceID: z.string().optional()
		}, isExistsTool.annotations ?? {}, async (args) => {
			const { customToken, customInstanceID, ...restArgs } = args;
			const token = customToken ?? config.wapulseToken!;
			const instanceID = customInstanceID ?? config.wapulseInstanceID!;
			const result = await handleIsExists({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext());
			return convertResponse(result);
		});

		server.tool(validatePhoneNumberTool.name!, validatePhoneNumberTool.description!, {
			phoneNumber: z.string()
		}, validatePhoneNumberTool.annotations ?? {}, async (args) => {
			const result = await handleValidatePhoneNumber(args);
			return convertResponse(result);
		});

		// Register general tools
		server.tool(getAllChatsTool.name!, getAllChatsTool.description!, {
			customToken: z.string().optional(),
			customInstanceID: z.string().optional()
		}, getAllChatsTool.annotations ?? {}, async (args) => {
			const token = args.customToken ?? config.wapulseToken!;
			const instanceID = args.customInstanceID ?? config.wapulseInstanceID!;
			const result = await handleGetAllChats({ customToken: token, customInstanceID: instanceID }, adaptContext());
			return convertResponse(result);
		});

		server.tool(wapulseDocTool.name!, wapulseDocTool.description!, {
			section: z.enum(['overview', 'authentication', 'messaging', 'groups', 'instances', 'webhooks', 'errors', 'rate-limits', 'examples']).optional(),
			search: z.string().min(2).max(100).optional()
		}, wapulseDocTool.annotations ?? {}, async (args) => {
			const result = await handleGetWapulseDoc(args, adaptContext());
			return convertResponse(result);
		});

		// Register group tools (12 tools)
		const groupTools = [
			{ tool: createGroupTool, handler: handleCreateGroup },
			{ tool: addParticipantsTool, handler: handleAddParticipants },
			{ tool: removeParticipantsTool, handler: handleRemoveParticipants },
			{ tool: promoteParticipantsTool, handler: handlePromoteParticipants },
			{ tool: demoteParticipantsTool, handler: handleDemoteParticipants },
			{ tool: leaveGroupTool, handler: handleLeaveGroup },
			{ tool: getGroupInviteLinkTool, handler: handleGetGroupInviteLink },
			{ tool: changeGroupInviteCodeTool, handler: handleChangeGroupInviteCode },
			{ tool: getGroupRequestsTool, handler: handleGetGroupRequests },
			{ tool: rejectGroupRequestTool, handler: handleRejectGroupRequest },
			{ tool: approveGroupRequestTool, handler: handleApproveGroupRequest },
			{ tool: getAllGroupsTool, handler: handleGetAllGroups }
		];

		groupTools.forEach(({ tool, handler }) => {
			// Create appropriate schema based on tool requirements
			let schema: any = {
				id: z.string().min(1),
				customToken: z.string().optional(),
				customInstanceID: z.string().optional()
			};

			// Add specific fields for different tool types
			if (tool.name!.includes('participants') || tool.name!.includes('request')) {
				const fieldName = tool.name!.includes('request') ? 'numbers' : 'participants';
				const maxItems = tool.name!.includes('promote') || tool.name!.includes('demote') || tool.name!.includes('request') ? 20 : 50;
				schema[fieldName] = z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(maxItems);
			}

			if (tool.name! === 'create_whatsapp_group') {
				schema = {
					name: z.string().min(1).max(100),
					participants: z.array(z.string().regex(/^\d{1,4}\d{6,15}$/)).min(1).max(256),
					customToken: z.string().optional(),
					customInstanceID: z.string().optional()
				};
			}

			server.tool(tool.name!, tool.description!, schema, tool.annotations ?? {}, async (args: any) => {
				const { customToken, customInstanceID, ...restArgs } = args;
				const token = customToken ?? config.wapulseToken!;
				const instanceID = customInstanceID ?? config.wapulseInstanceID!;
				const result = await handler({ ...restArgs, customToken: token, customInstanceID: instanceID }, adaptContext());
				return convertResponse(result);
			});
		});

		// Register instance tools (5 tools)
		server.tool("create_instance", "Create a new WhatsApp instance", {
			token: z.string().min(1)
		}, { title: "Create Instance" }, async (args) => {
			const result = await handleCreateInstance(args, adaptContext());
			return convertResponse(result);
		});

		server.tool("get_qr_code", "Get QR code for WhatsApp Web connection", {
			token: z.string().min(1),
			instanceID: z.string().min(1)
		}, { title: "Get QR Code", readOnlyHint: true }, async (args) => {
			const result = await handleGetQrCode(args, adaptContext());
			return convertResponse(result);
		});

		server.tool("start_instance", "Start a WhatsApp instance to begin receiving and sending messages", {
			token: z.string().min(1),
			instanceID: z.string().min(1)
		}, { title: "Start Instance" }, async (args) => {
			const result = await handleStartInstance(args, adaptContext());
			return convertResponse(result);
		});

		server.tool("stop_instance", "Stop a running WhatsApp instance", {
			token: z.string().min(1),
			instanceID: z.string().min(1)
		}, { title: "Stop Instance" }, async (args) => {
			const result = await handleStopInstance(args, adaptContext());
			return convertResponse(result);
		});

		server.tool("delete_instance", "Permanently delete a WhatsApp instance", {
			token: z.string().min(1),
			instanceID: z.string().min(1)
		}, { title: "Delete Instance", destructiveHint: true }, async (args) => {
			const result = await handleDeleteInstance(args, adaptContext());
			return convertResponse(result);
		});

		console.log("✅ Registered all 25 tools successfully!");
		console.log("📱 Messaging (6): send_whatsapp_message, send_whatsapp_files, send_whatsapp_audio, load_chat_messages, check_id_exists, validate_phone_number");
		console.log("💬 General (2): get_all_chats, get_wapulse_documentation");
		console.log("👥 Group (12): create_whatsapp_group, add_group_participants, remove_group_participants, promote_group_participants, demote_group_participants, leave_whatsapp_group, get_group_invite_link, change_group_invite_code, get_group_requests, reject_group_request, approve_group_request, get_all_groups");
		console.log("🏗️ Instance (5): create_instance, get_qr_code, start_instance, stop_instance, delete_instance");

		return server.server
	} catch (e) {
		console.error("❌ Failed to start server:", e)
		throw e
	}
} 
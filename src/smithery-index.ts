#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

// Import all our tool handler functions
import { handleSendMessage } from "./tools/messaging/sendMessage.js"
import { handleSendFiles } from "./tools/messaging/sendFiles.js"
import { handleSendAudio } from "./tools/messaging/sendAudio.js"
import { handleLoadChatAllMessages } from "./tools/messaging/loadChatAllMessages.js"
import { handleIsExists } from "./tools/messaging/isExists.js"
import { handleValidatePhoneNumber } from "./tools/messaging/validatePhoneNumber.js"
import { handleGetAllChats } from "./tools/general/getAllChats.js"
import { handleGetWapulseDoc } from "./tools/general/wapulseDoc.js"
import { handleCreateGroup } from "./tools/group/createGroup.js"
import { handleAddParticipants } from "./tools/group/addParticipants.js"
import { handleRemoveParticipants } from "./tools/group/removeParticipants.js"
import { handlePromoteParticipants } from "./tools/group/promoteParticipants.js"
import { handleDemoteParticipants } from "./tools/group/demoteParticipants.js"
import { handleLeaveGroup } from "./tools/group/leaveGroup.js"
import { handleGetGroupInviteLink } from "./tools/group/getGroupInviteLink.js"
import { handleChangeGroupInviteCode } from "./tools/group/changeGroupInviteCode.js"
import { handleGetGroupRequests } from "./tools/group/getGroupRequests.js"
import { handleRejectGroupRequest } from "./tools/group/rejectGroupRequest.js"
import { handleApproveGroupRequest } from "./tools/group/approveGroupRequest.js"
import { handleGetAllGroups } from "./tools/group/getAllGroups.js"
import { handleCreateInstance } from "./tools/instance/createInstance.js"
import { handleGetQrCode } from "./tools/instance/getQrCode.js"
import { handleStartInstance } from "./tools/instance/startInstance.js"
import { handleStopInstance } from "./tools/instance/stopInstance.js"
import { handleDeleteInstance } from "./tools/instance/deleteInstance.js"

export const configSchema = z.object({
	wapulseToken: z.string().describe("WaPulse API token"),
	wapulseInstanceID: z.string().describe("WaPulse instance ID"),
})

export default function ({ config }: { config: z.infer<typeof configSchema> }) {
	try {
		console.log("Starting WaPulse MCP Server...")

		// Create a new MCP server
		const server = new McpServer({
			name: "WaPulse WhatsApp MCP Server",
			version: "1.0.0",
		})

		// Simple test tool to verify the server works
		server.tool(
			"test_wapulse_connection",
			"Test the WaPulse server connection and configuration",
			{
				message: z.string().optional().default("Hello from WaPulse MCP!").describe("Test message"),
			},
			async ({ message }) => {
				return {
					content: [{
						type: "text" as const,
						text: `✅ WaPulse MCP Server is running!\n\n🔧 Configuration:\n- Token: ${config.wapulseToken.substring(0, 8)}...\n- Instance ID: ${config.wapulseInstanceID}\n\n💬 Test Message: ${message}\n\n🚀 Server Status: READY`
					}]
				}
			}
		)

		// Send message tool
		server.tool(
			"send_whatsapp_message",
			"Send a WhatsApp message to a specific phone number or group using WaPulse API",
			{
				to: z.string().regex(/^\d{1,4}\d{6,15}$/).describe("Phone number in international format (e.g., 1234567890)"),
				message: z.string().min(1).max(4096).describe("Message content"),
				type: z.enum(["user", "group"]).default("user").describe("Message type"),
			},
			async ({ to, message, type }) => {
				try {
					// Make API request to WaPulse
					const response = await fetch('https://wapulse.com/api/sendMessage', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							token: config.wapulseToken,
							instanceID: config.wapulseInstanceID,
							to,
							message,
							type
						})
					})

					const result = await response.json() as any

					if (!response.ok) {
						throw new Error(`API Error: ${result.message || 'Unknown error'}`)
					}

					return {
						content: [{
							type: "text" as const,
							text: `✅ Message sent successfully!\n\n📱 To: ${to}\n💬 Message: "${message}"\n📊 Response: ${JSON.stringify(result, null, 2)}`
						}]
					}
				} catch (error: any) {
					return {
						content: [{
							type: "text" as const,
							text: `❌ Failed to send message: ${error.message}`
						}]
					}
				}
			}
		)

		// Validate phone number tool
		server.tool(
			"validate_phone_number",
			"Validate if a phone number is in the correct format for WaPulse API",
			{
				phoneNumber: z.string().describe("Phone number to validate"),
			},
			async ({ phoneNumber }) => {
				const isValid = /^\d{7,19}$/.test(phoneNumber)
				
				if (isValid) {
					return {
						content: [{
							type: "text" as const,
							text: `✅ Phone number is valid!\n\n📱 Number: ${phoneNumber}\n📊 Status: VALID`
						}]
					}
				} else {
					return {
						content: [{
							type: "text" as const,
							text: `❌ Phone number is invalid!\n\n📱 Number: ${phoneNumber}\n🚫 Error: Must be 7-19 digits\n📊 Status: INVALID`
						}]
					}
				}
			}
		)

		// Get all chats tool
		server.tool(
			"get_all_chats",
			"Get all WhatsApp chats (individual and group conversations) for an instance using WaPulse API",
			{},
			async () => {
				try {
					const response = await fetch('https://wapulse.com/api/getAllChats', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							token: config.wapulseToken,
							instanceID: config.wapulseInstanceID
						})
					})

					const result = await response.json() as any

					if (!response.ok) {
						throw new Error(`API Error: ${result.message || 'Unknown error'}`)
					}

					return {
						content: [{
							type: "text" as const,
							text: `📱 All Chats Retrieved\n\n📊 Response: ${JSON.stringify(result, null, 2)}`
						}]
					}
				} catch (error: any) {
					return {
						content: [{
							type: "text" as const,
							text: `❌ Failed to get chats: ${error.message}`
						}]
					}
				}
			}
		)

		return server.server
	} catch (e) {
		console.error(e)
		throw e
	}
} 
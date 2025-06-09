# WaPulse WhatsApp MCP Server

A comprehensive Model Context Protocol (MCP) server that provides seamless integration with the WaPulse WhatsApp Web API. This server enables you to send messages, manage groups, handle files, and perform various WhatsApp operations through the MCP protocol.

## Features

### 🚀 **25 WhatsApp Tools Available**

#### **Messaging Tools (7)**
- `send_whatsapp_message` - Send text messages to individuals or groups
- `send_whatsapp_files` - Send images, documents, and other files
- `send_whatsapp_audio` - Send audio messages and voice notes
- `load_chat_messages` - Retrieve chat history and messages
- `check_id_exists` - Verify if a WhatsApp ID exists
- `validate_phone_number` - Validate phone number format
- `get_all_chats` - Get all chat conversations

#### **Group Management Tools (12)**
- `create_whatsapp_group` - Create new WhatsApp groups
- `add_group_participants` - Add members to groups
- `remove_group_participants` - Remove members from groups
- `promote_group_participants` - Promote members to admin
- `demote_group_participants` - Demote admins to members
- `leave_whatsapp_group` - Leave a group
- `get_group_invite_link` - Get group invite links
- `change_group_invite_code` - Generate new invite links
- `get_group_requests` - View pending join requests
- `approve_group_request` - Approve join requests
- `reject_group_request` - Reject join requests
- `get_all_groups` - List all groups

#### **Instance Management Tools (5)**
- `create_instance` - Create new WhatsApp instances
- `get_qr_code` - Get QR code for WhatsApp Web connection
- `start_instance` - Start a WhatsApp instance
- `stop_instance` - Stop a WhatsApp instance
- `delete_instance` - Delete a WhatsApp instance

#### **General Tools (2)**
- `get_wapulse_documentation` - Access API documentation
- `get_all_chats` - Retrieve all chat conversations

## Installation

### Option 1: NPX (Recommended)

Install directly via NPX with your WaPulse credentials:

```bash
npx wapulse-whatsapp-mcp-server
```

**Configuration via Environment Variables:**
```bash
export WAPULSE_TOKEN="your-wapulse-token"
export WAPULSE_INSTANCE_ID="your-instance-id"
export WAPULSE_BASE_URL="https://wapulseserver.com:3003"  # optional
npx wapulse-whatsapp-mcp-server
```

**Configuration in MCP Client (Cursor):**
Add to your `mcp.json`:
```json
{
  "mcpServers": {
    "wapulse": {
      "command": "npx",
      "args": ["wapulse-whatsapp-mcp-server"],
      "env": {
        "WAPULSE_TOKEN": "your-wapulse-token",
        "WAPULSE_INSTANCE_ID": "your-instance-id"
      }
    }
  }
}
```

### Option 2: Smithery Cloud

Install via Smithery cloud (requires Smithery account):

```bash
npx @smithery/cli@latest install @Quegenx/wapulse-whatsapp-mcp --client cursor
```

### Option 3: Local Development

1. Clone the repository:
```bash
git clone https://github.com/Quegenx/wapulse-mcp.git
cd wapulse-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Configure your MCP client to use the built server at `dist/smithery-index.js` with your WaPulse credentials

## Configuration

### Required Configuration
- `wapulseToken` - Your WaPulse API token
- `wapulseInstanceID` - Your WhatsApp instance ID

### Optional Configuration
- `wapulseBaseUrl` - WaPulse API base URL (defaults to `https://wapulseserver.com:3003`)

### Example MCP Client Configuration

For Cursor IDE, add to your `mcp.json`:

```json
{
  "mcpServers": {
    "wapulse-whatsapp": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@Quegenx/wapulse-whatsapp-mcp",
        "--key",
        "your-smithery-key",
        "--profile",
        "your-profile"
      ]
    }
  }
}
```

## Usage Examples

### Send a WhatsApp Message
```typescript
// Send a text message
await sendWhatsAppMessage({
  to: "972512345678",
  message: "Hello from MCP!",
  type: "user"
});
```

### Send Files
```typescript
// Send an image with caption
await sendWhatsAppFiles({
  to: "972512345678",
  files: [{
    file: "data:image/jpeg;base64,/9j/4AAQ...",
    filename: "image.jpg",
    caption: "Check out this image!"
  }]
});
```

### Create a WhatsApp Group
```typescript
// Create a new group
await createWhatsAppGroup({
  name: "My New Group",
  participants: ["972512345678", "972587654321"]
});
```

### Load Chat Messages
```typescript
// Get chat history
await loadChatMessages({
  id: "972512345678@c.us",
  type: "user"
});
```

## Phone Number Format

All phone numbers should be in international format without the `+` sign:
- ✅ Correct: `972512345678` (Israel)
- ✅ Correct: `14155552671` (US)
- ❌ Incorrect: `+972512345678`
- ❌ Incorrect: `972-512-345-678`

## Error Handling

The server uses proper MCP error codes:
- `InvalidParams` - For validation errors (invalid phone numbers, missing parameters)
- `InternalError` - For API failures or network issues

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## API Documentation

The server includes a built-in documentation tool that provides comprehensive information about the WaPulse API:

```typescript
await getWaPulseDocumentation({
  section: "messaging", // overview, authentication, messaging, groups, instances, webhooks, errors, rate-limits, examples
  search: "send message" // optional search term
});
```

## Requirements

- Node.js 18+ 
- Valid WaPulse account and API credentials
- Active WhatsApp instance

## Getting WaPulse Credentials

1. Visit [WaPulse.com](https://wapulse.com)
2. Create an account and get your API token
3. Create a WhatsApp instance and note the instance ID
4. Use these credentials when installing the MCP server

## Support

For issues related to:
- **MCP Server**: Open an issue on this repository
- **WaPulse API**: Contact WaPulse support
- **WhatsApp Integration**: Check WaPulse documentation

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ using the official [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)**

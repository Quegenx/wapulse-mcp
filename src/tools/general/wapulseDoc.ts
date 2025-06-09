import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const wapulseDocTool: Tool = {
  name: 'get_wapulse_documentation',
  description: 'Fetch and search WaPulse API documentation from the official website',
  annotations: {
    title: 'Get WaPulse Documentation',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  },
  inputSchema: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        description: 'Specific documentation section to fetch (optional)',
        enum: [
          'overview',
          'authentication',
          'messaging',
          'groups',
          'instances',
          'webhooks',
          'errors',
          'rate-limits',
          'examples'
        ]
      },
      search: {
        type: 'string',
        description: 'Search term to find specific information in the documentation',
        minLength: 2,
        maxLength: 100
      }
    },
    additionalProperties: false
  }
};

export async function handleGetWapulseDoc(
  args: { section?: string; search?: string },
  context?: { log?: (level: string, message: string, meta?: any) => void }
): Promise<any> {
  const { section, search } = args;
  const { log } = context || {};

  try {
    if (log) {
      log('info', 'Fetching WaPulse documentation', { section, search });
    }

    // WaPulse documentation sections mapping
    const docSections = {
      overview: {
        title: 'WaPulse API Overview',
        content: `# WaPulse WhatsApp Web API Documentation

## Overview
WaPulse provides a comprehensive WhatsApp Web API that allows you to:
- Send and receive messages
- Manage WhatsApp instances
- Handle group operations
- Send multimedia files
- Manage webhooks

## Base URL
\`https://wapulse.com/api\`

## Authentication
All API requests require:
- \`token\`: Your unique user token
- \`instanceID\`: Your WhatsApp instance identifier

## Common Response Format
\`\`\`json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {...}
}
\`\`\``
      },
      
      authentication: {
        title: 'Authentication & Setup',
        content: `# Authentication & Instance Setup

## 1. Create Instance
\`POST /api/createInstance\`
\`\`\`json
{
  "token": "your_token_here"
}
\`\`\`

## 2. Get QR Code
\`POST /api/getQrCode\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id"
}
\`\`\`

## 3. Start Instance
\`POST /api/startInstance\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id"
}
\`\`\`

## Security Notes
- Keep your token secure
- Use HTTPS for all requests
- Regenerate tokens periodically`
      },

      messaging: {
        title: 'Messaging API',
        content: `# Messaging Operations

## Send Message
\`POST /api/sendMessage\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id",
  "to": "972512345678",
  "message": "Hello World!",
  "type": "user"
}
\`\`\`

## Send Files
\`POST /api/sendFiles\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id", 
  "to": "972512345678",
  "files": [
    {
      "file": "data:image/jpeg;base64,/9j/4AAQ...",
      "filename": "image.jpg",
      "caption": "Optional caption"
    }
  ]
}
\`\`\`

## Send Audio
\`POST /api/sendFiles\` (with audio file)
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id",
  "to": "972512345678", 
  "files": [
    {
      "file": "data:audio/mpeg;base64,/9j/4AAQ...",
      "filename": "voice.mp3",
      "caption": "Voice message"
    }
  ]
}
\`\`\`

## Load Chat Messages
\`POST /api/loadChatAllMessages\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id",
  "id": "972512345678@c.us",
  "type": "user"
}
\`\`\``
      },

      groups: {
        title: 'Group Management',
        content: `# Group Management API

## Create Group
\`POST /api/createGroup\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id",
  "name": "My Group",
  "participants": ["972512345678", "972587654321"]
}
\`\`\`

## Add Participants
\`POST /api/addParticipants\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id",
  "id": "group_id@g.us",
  "participants": ["972512345678"]
}
\`\`\`

## Remove Participants
\`POST /api/removeParticipants\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id",
  "id": "group_id@g.us", 
  "participants": ["972512345678"]
}
\`\`\`

## Promote/Demote Admins
\`POST /api/promoteParticipants\`
\`POST /api/demoteParticipants\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id",
  "id": "group_id@g.us",
  "participants": ["972512345678"]
}
\`\`\`

## Get Group Invite Link
\`POST /api/getGroupInviteLink\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id",
  "id": "group_id@g.us"
}
\`\`\``
      },

      instances: {
        title: 'Instance Management',
        content: `# Instance Management

## Instance Lifecycle
1. **Create** - Create new WhatsApp instance
2. **Get QR** - Get QR code for WhatsApp mobile app
3. **Start** - Start the instance for messaging
4. **Stop** - Temporarily stop the instance
5. **Delete** - Permanently remove the instance

## Create Instance
\`POST /api/createInstance\`
\`\`\`json
{
  "token": "your_unique_token"
}
\`\`\`

## Get QR Code
\`POST /api/getQrCode\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "instance_id_from_create"
}
\`\`\`

## Start Instance
\`POST /api/startInstance\`
\`\`\`json
{
  "token": "your_token", 
  "instanceID": "your_instance_id"
}
\`\`\`

## Stop Instance
\`POST /api/stopInstance\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id"
}
\`\`\`

## Delete Instance
\`POST /api/deleteInstance\`
\`\`\`json
{
  "token": "your_token",
  "instanceID": "your_instance_id"
}
\`\`\`

⚠️ **Warning**: Deleting an instance is permanent and cannot be undone.`
      },

      webhooks: {
        title: 'Webhooks & Events',
        content: `# Webhooks & Real-time Events

## Webhook Configuration
Configure webhooks to receive real-time notifications:

\`\`\`json
{
  "webhookUrl": "https://your-server.com/webhook",
  "events": ["message", "status", "group"]
}
\`\`\`

## Event Types

### Message Events
\`\`\`json
{
  "event": "message",
  "instanceID": "your_instance",
  "data": {
    "id": "message_id",
    "from": "972512345678@c.us",
    "to": "your_number@c.us",
    "body": "Hello!",
    "timestamp": 1640995200,
    "fromMe": false
  }
}
\`\`\`

### Status Events
\`\`\`json
{
  "event": "status",
  "instanceID": "your_instance",
  "data": {
    "status": "connected|disconnected|connecting"
  }
}
\`\`\`

### Group Events
\`\`\`json
{
  "event": "group",
  "instanceID": "your_instance", 
  "data": {
    "action": "participant_added|participant_removed",
    "groupId": "group_id@g.us",
    "participant": "972512345678@c.us"
  }
}
\`\`\``
      },

      errors: {
        title: 'Error Handling',
        content: `# Error Handling & Status Codes

## HTTP Status Codes
- \`200\` - Success
- \`400\` - Bad Request (invalid parameters)
- \`401\` - Unauthorized (invalid token)
- \`403\` - Forbidden (insufficient permissions)
- \`404\` - Not Found (instance/resource not found)
- \`429\` - Too Many Requests (rate limit exceeded)
- \`500\` - Internal Server Error

## Error Response Format
\`\`\`json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
\`\`\`

## Common Errors

### Authentication Errors
- \`INVALID_TOKEN\` - Token is invalid or expired
- \`MISSING_TOKEN\` - Token not provided
- \`INSTANCE_NOT_FOUND\` - Instance ID not found

### Messaging Errors  
- \`INVALID_PHONE\` - Phone number format invalid
- \`MESSAGE_TOO_LONG\` - Message exceeds character limit
- \`FILE_TOO_LARGE\` - File size exceeds limit
- \`UNSUPPORTED_FORMAT\` - File format not supported

### Instance Errors
- \`INSTANCE_NOT_CONNECTED\` - Instance not connected to WhatsApp
- \`QR_EXPIRED\` - QR code has expired, generate new one
- \`INSTANCE_LIMIT_REACHED\` - Maximum instances reached`
      },

      'rate-limits': {
        title: 'Rate Limits & Best Practices',
        content: `# Rate Limits & Best Practices

## Rate Limits
- **Messages**: 100 messages per minute per instance
- **API Calls**: 1000 requests per hour per token
- **File Uploads**: 50 files per minute per instance
- **Group Operations**: 20 operations per minute per instance

## Best Practices

### Message Sending
- Don't send more than 1 message per second
- Use batch operations when possible
- Implement exponential backoff for retries
- Monitor rate limit headers

### File Handling
- Compress images before sending
- Use appropriate file formats (JPEG, PNG, PDF, MP3, MP4)
- Maximum file size: 16MB for images, 64MB for videos
- Use base64 encoding with proper data URI prefix

### Instance Management
- Keep instances connected when actively using
- Stop instances when not needed to save resources
- Monitor instance status regularly
- Handle disconnections gracefully

### Error Handling
\`\`\`javascript
try {
  const response = await wapulseAPI.sendMessage(params);
  if (!response.success) {
    throw new Error(response.error);
  }
} catch (error) {
  if (error.status === 429) {
    // Rate limit hit, wait and retry
    await sleep(60000);
    return retry();
  }
  throw error;
}
\`\`\``
      },

      examples: {
        title: 'Code Examples',
        content: `# Code Examples

## JavaScript/Node.js Example
\`\`\`javascript
const WaPulseAPI = {
  baseURL: 'https://wapulse.com/api',
  token: 'your_token',
  instanceID: 'your_instance_id',

  async sendMessage(to, message, type = 'user') {
    const response = await fetch(\`\${this.baseURL}/sendMessage\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: this.token,
        instanceID: this.instanceID,
        to,
        message,
        type
      })
    });
    return response.json();
  },

  async sendFile(to, fileData, filename, caption) {
    const response = await fetch(\`\${this.baseURL}/sendFiles\`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: this.token,
        instanceID: this.instanceID,
        to,
        files: [{
          file: fileData, // base64 with data URI
          filename,
          caption
        }]
      })
    });
    return response.json();
  }
};

// Usage
await WaPulseAPI.sendMessage('972512345678', 'Hello World!');
\`\`\`

## Python Example
\`\`\`python
import requests
import base64

class WaPulseAPI:
    def __init__(self, token, instance_id):
        self.base_url = 'https://wapulse.com/api'
        self.token = token
        self.instance_id = instance_id
    
    def send_message(self, to, message, msg_type='user'):
        payload = {
            'token': self.token,
            'instanceID': self.instance_id,
            'to': to,
            'message': message,
            'type': msg_type
        }
        response = requests.post(f'{self.base_url}/sendMessage', json=payload)
        return response.json()
    
    def send_file(self, to, file_path, caption=None):
        with open(file_path, 'rb') as f:
            file_data = base64.b64encode(f.read()).decode()
            mime_type = 'image/jpeg'  # Detect based on file
            data_uri = f'data:{mime_type};base64,{file_data}'
        
        payload = {
            'token': self.token,
            'instanceID': self.instance_id,
            'to': to,
            'files': [{
                'file': data_uri,
                'filename': file_path.split('/')[-1],
                'caption': caption
            }]
        }
        response = requests.post(f'{self.base_url}/sendFiles', json=payload)
        return response.json()

# Usage
api = WaPulseAPI('your_token', 'your_instance_id')
api.send_message('972512345678', 'Hello from Python!')
\`\`\``
      }
    };

    // If specific section requested
    if (section) {
      const docSection = docSections[section as keyof typeof docSections];
      if (!docSection) {
        throw new McpError(ErrorCode.InvalidParams, `Documentation section '${section}' not found. Available sections: ${Object.keys(docSections).join(', ')}`);
      }

      if (log) {
        log('info', 'Retrieved documentation section', { section, title: docSection.title });
      }

      return {
        content: [
          {
            type: 'text',
            text: `📚 **${docSection.title}**\n\n${docSection.content}`
          }
        ]
      };
    }

    // If search term provided
    if (search) {
      const searchResults = [];
      const searchLower = search.toLowerCase();

      for (const [key, doc] of Object.entries(docSections)) {
        if (doc.title.toLowerCase().includes(searchLower) || 
            doc.content.toLowerCase().includes(searchLower)) {
          
          // Extract relevant snippet
          const lines = doc.content.split('\n');
          const relevantLines = lines.filter(line => 
            line.toLowerCase().includes(searchLower)
          ).slice(0, 3);

          searchResults.push({
            section: key,
            title: doc.title,
            snippet: relevantLines.join('\n') || doc.content.substring(0, 200) + '...'
          });
        }
      }

      if (searchResults.length === 0) {
        throw new McpError(ErrorCode.InvalidParams, `No documentation found for search term: "${search}"`);
      }

      if (log) {
        log('info', 'Search completed', { search, resultsCount: searchResults.length });
      }

      const resultText = searchResults.map(result => 
        `## ${result.title} (${result.section})\n${result.snippet}\n`
      ).join('\n---\n');

      return {
        content: [
          {
            type: 'text',
            text: `🔍 **Search Results for "${search}"**\n\n${resultText}\n\n💡 Use section parameter to get full documentation for any section.`
          }
        ]
      };
    }

    // Return overview of all sections
    const overview = Object.entries(docSections).map(([key, doc]) => 
      `**${key}**: ${doc.title}`
    ).join('\n');

    if (log) {
      log('info', 'Retrieved documentation overview');
    }

    return {
      content: [
        {
          type: 'text',
          text: `📚 **WaPulse API Documentation**

## Available Sections:
${overview}

## Usage:
- Use \`section\` parameter to get specific documentation
- Use \`search\` parameter to find specific information
- Visit: https://www.wapulse.com/console/developers/documentation

## Examples:
- \`section: "messaging"\` - Get messaging API docs
- \`search: "send file"\` - Search for file sending info
- \`section: "authentication"\` - Get auth setup guide`
        }
      ]
    };

  } catch (error) {
    if (log) {
      log('error', 'Error fetching WaPulse documentation', { error: (error as Error).message });
    }
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(ErrorCode.InternalError, `Failed to fetch WaPulse documentation: ${(error as Error).message}`);
  }
} 
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { server } from './server.js';
import { parseConfigFromUrl } from './utils/config.js';

const port = parseInt(process.env.PORT || "3000");

// Create HTTP server that handles Smithery configuration
const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Parse configuration from URL if present
  if (req.url) {
    parseConfigFromUrl(`http://localhost${req.url}`);
  }

  // Handle health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      message: 'WaPulse MCP Server is running',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Handle MCP requests - delegate to FastMCP
  if (req.url?.startsWith('/mcp')) {
    // Let FastMCP handle the MCP protocol
    // This is a simplified approach - in production you'd want more sophisticated routing
    try {
      // For now, we'll let FastMCP handle this through its built-in HTTP support
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        message: 'MCP endpoint - use FastMCP client to connect',
        tools: 25,
        categories: ['messaging', 'general', 'group', 'instance']
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  // Default response
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start the server
httpServer.listen(port, () => {
  console.log(`🚀 WaPulse MCP HTTP Server listening on port ${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
  console.log(`\n📊 Available Tools (25 total):`);
  console.log(`   📱 Messaging (6): send_message, validate_phone, send_files, send_audio, load_chats, check_exists`);
  console.log(`   💬 General (2): get_all_chats, get_wapulse_documentation`);
  console.log(`   👥 Group Management (12): create_group, add/remove/promote/demote participants, leave_group, invite_links, join_requests, get_all_groups`);
  console.log(`   🏗️ Instance Management (5): create_instance, get_qr_code, start_instance, stop_instance, delete_instance`);
});

// Also start the FastMCP server for actual MCP protocol handling
server.start({
  transportType: "httpStream",
  httpStream: { port: port + 1 } // Use a different port for the actual MCP server
});

export { httpServer }; 
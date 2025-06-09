import { server } from './server.js';

// Start server - let FastMCP handle transport detection
console.log("🚀 Starting WaPulse MCP Server");
console.log(`\n📊 Available Tools (25 total):`);
console.log(`   📱 Messaging (6): send_message, validate_phone, send_files, send_audio, load_chats, check_exists`);
console.log(`   💬 General (2): get_all_chats, get_wapulse_documentation`);
console.log(`   👥 Group Management (12): create_group, add/remove/promote/demote participants, leave_group, invite_links, join_requests, get_all_groups`);
console.log(`   🏗️ Instance Management (5): create_instance, get_qr_code, start_instance, stop_instance, delete_instance`);

// FastMCP will automatically detect the transport type (stdio for local, httpStream for Smithery)
server.start(); 
export default {
  esbuild: {
    // Mark problematic packages as external to avoid bundling issues
    external: ["@fastmcp/core", "@valibot/to-json-schema"],
    
    // Enable minification for production
    minify: true,
    
    // Set Node.js target version
    target: "node18"
  }
} 
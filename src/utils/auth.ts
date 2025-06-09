import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export interface AuthenticatedUser {
  id: string;
  apiKey: string;
  name?: string;
  permissions?: string[];
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

// Default rate limits
const DEFAULT_RATE_LIMITS = {
  requestsPerMinute: 60,
  requestsPerHour: 1000
};

// Valid API keys (in production, this would be in a database)
const VALID_API_KEYS: Record<string, AuthenticatedUser> = {
  'wapulse-demo-key-123': {
    id: 'demo-user',
    apiKey: 'wapulse-demo-key-123',
    name: 'Demo User',
    permissions: ['send_message', 'send_files', 'load_chats'],
    rateLimit: DEFAULT_RATE_LIMITS
  },
  'wapulse-admin-key-456': {
    id: 'admin-user',
    apiKey: 'wapulse-admin-key-456',
    name: 'Admin User',
    permissions: ['*'], // All permissions
    rateLimit: {
      requestsPerMinute: 120,
      requestsPerHour: 5000
    }
  }
};

export function authenticateRequest(request: Request): AuthenticatedUser {
  const apiKey = request.headers.get('x-api-key') || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    throw new Response('Missing API key. Provide x-api-key header or Authorization: Bearer <key>', {
      status: 401,
      statusText: 'Unauthorized'
    });
  }

  const user = VALID_API_KEYS[apiKey];
  if (!user) {
    throw new Response('Invalid API key', {
      status: 401,
      statusText: 'Unauthorized'
    });
  }

  return user;
}

export function checkRateLimit(userId: string, rateLimit: AuthenticatedUser['rateLimit']): void {
  const now = Date.now();
  const limits = rateLimit || DEFAULT_RATE_LIMITS;
  
  // Check minute-based rate limit
  const minuteKey = `${userId}:${Math.floor(now / 60000)}`;
  const minuteData = rateLimitMap.get(minuteKey) || { count: 0, resetTime: now + 60000 };
  
  if (minuteData.count >= limits.requestsPerMinute) {
    throw new McpError(ErrorCode.InternalError, `Rate limit exceeded: ${limits.requestsPerMinute} requests per minute. Try again in ${Math.ceil((minuteData.resetTime - now) / 1000)} seconds.`);
  }
  
  // Check hour-based rate limit
  const hourKey = `${userId}:${Math.floor(now / 3600000)}`;
  const hourData = rateLimitMap.get(hourKey) || { count: 0, resetTime: now + 3600000 };
  
  if (hourData.count >= limits.requestsPerHour) {
    throw new McpError(ErrorCode.InternalError, `Rate limit exceeded: ${limits.requestsPerHour} requests per hour. Try again in ${Math.ceil((hourData.resetTime - now) / 60000)} minutes.`);
  }
  
  // Update counters
  rateLimitMap.set(minuteKey, { count: minuteData.count + 1, resetTime: minuteData.resetTime });
  rateLimitMap.set(hourKey, { count: hourData.count + 1, resetTime: hourData.resetTime });
  
  // Clean up old entries (older than 1 hour)
  for (const [key, data] of rateLimitMap.entries()) {
    if (data.resetTime < now) {
      rateLimitMap.delete(key);
    }
  }
}

export function checkPermission(user: AuthenticatedUser, permission: string): boolean {
  if (!user.permissions) return false;
  
  // Admin users with '*' permission have access to everything
  if (user.permissions.includes('*')) return true;
  
  // Check specific permission
  return user.permissions.includes(permission);
}

export function requirePermission(user: AuthenticatedUser, permission: string): void {
  if (!checkPermission(user, permission)) {
    throw new McpError(ErrorCode.InternalError, `Access denied. Required permission: ${permission}`);
  }
} 
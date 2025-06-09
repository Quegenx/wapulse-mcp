// Global configuration for lazy loading
export let globalConfig: {
  wapulseToken?: string;
  wapulseInstanceID?: string;
} = {};

// Parse configuration from query parameters (Smithery format)
export function parseConfigFromUrl(url: string): void {
  try {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;
    
    const wapulseToken = searchParams.get('wapulseToken');
    const wapulseInstanceID = searchParams.get('wapulseInstanceID');
    
    if (wapulseToken) {
      globalConfig.wapulseToken = wapulseToken;
      console.log('🔑 WaPulse token configured from URL parameters');
    }
    if (wapulseInstanceID) {
      globalConfig.wapulseInstanceID = wapulseInstanceID;
      console.log('🆔 WaPulse instance ID configured from URL parameters');
    }
  } catch (error) {
    console.warn('⚠️ Failed to parse configuration from URL:', error);
  }
}

// Parse configuration from environment variables (fallback)
export function parseConfigFromEnv(): void {
  const envToken = process.env.WAPULSE_TOKEN;
  const envInstanceID = process.env.WAPULSE_INSTANCE_ID;
  
  if (envToken && !globalConfig.wapulseToken) {
    globalConfig.wapulseToken = envToken;
    console.log('🔑 WaPulse token configured from environment');
  }
  if (envInstanceID && !globalConfig.wapulseInstanceID) {
    globalConfig.wapulseInstanceID = envInstanceID;
    console.log('🆔 WaPulse instance ID configured from environment');
  }
}

// Get effective configuration (custom params override global config)
export function getEffectiveConfig(customToken?: string, customInstanceID?: string): {
  token: string;
  instanceID: string;
} {
  const token = customToken || globalConfig.wapulseToken || process.env.WAPULSE_TOKEN;
  const instanceID = customInstanceID || globalConfig.wapulseInstanceID || process.env.WAPULSE_INSTANCE_ID;
  
  if (!token || !instanceID) {
    throw new Error('WaPulse configuration required. Please provide wapulseToken and wapulseInstanceID in server configuration or as custom parameters.');
  }
  
  return { token, instanceID };
}

// Check if configuration is available (for lazy loading)
export function hasConfiguration(customToken?: string, customInstanceID?: string): boolean {
  const token = customToken || globalConfig.wapulseToken || process.env.WAPULSE_TOKEN;
  const instanceID = customInstanceID || globalConfig.wapulseInstanceID || process.env.WAPULSE_INSTANCE_ID;
  
  return !!(token && instanceID);
} 
// WaPulse WhatsApp API Types

export interface SendMessageRequest {
  token: string;
  instanceID: string;
  to: string;
  message: string;
  type?: "user" | "group";
}

export interface SendMessageResponse {
  message: string;
}

// Send Files API Types
export interface FileObject {
  file: string; // Base64 encoded file data with data URI prefix
  filename: string;
  caption?: string;
}

export interface SendFilesRequest {
  token: string;
  instanceID: string;
  to: string;
  files: FileObject[];
}

export interface SendFilesResponse {
  message: string;
}

// Load Chat Messages API Types
export interface LoadChatMessagesRequest {
  token: string;
  instanceID: string;
  id: string; // Chat ID (e.g., "353871234567@c.us")
  type: "user" | "group";
  until?: string; // Timestamp
}

export interface ChatMessage {
  id: string;
  body: string;
  type: string;
  timestamp: number;
  from: string;
  to: string;
  fromMe: boolean;
  hasMedia: boolean;
  [key: string]: any; // Allow for additional properties
}

export interface LoadChatMessagesResponse {
  messages: ChatMessage[];
}

// Check ID Exists API Types
export interface CheckIdExistsRequest {
  token: string;
  instanceID: string;
  value: string; // Phone number or group ID
  type: "user" | "group";
}

export interface CheckIdExistsResponse {
  exists: string; // "true" or "false" as string
}

// Get All Chats API Types
export interface GetAllChatsRequest {
  token: string;
  instanceID: string;
}

export interface ChatInfo {
  id: string;
  name?: string;
  isGroup?: boolean;
  lastMessage?: {
    body?: string;
    timestamp?: number;
  };
  unreadCount?: number;
  participants?: string[];
  archived?: boolean;
  pinned?: boolean;
}

export interface GetAllChatsResponse {
  chats: ChatInfo[];
}

// Group Management API Types
export interface CreateGroupRequest {
  token: string;
  instanceID: string;
  name: string;
  participants: string[];
}

export interface CreateGroupResponse {
  message: string;
  groupId?: string;
}

export interface GroupParticipantsRequest {
  token: string;
  instanceID: string;
  id: string;
  participants: string[];
}

export interface GroupParticipantsResponse {
  message: string;
}

export interface LeaveGroupRequest {
  token: string;
  instanceID: string;
  id: string;
}

export interface LeaveGroupResponse {
  message: string;
}

export interface GetGroupInviteLinkRequest {
  token: string;
  instanceID: string;
  id: string;
}

export interface GetGroupInviteLinkResponse {
  inviteLink: string;
}

export interface ChangeGroupInviteCodeRequest {
  token: string;
  instanceID: string;
  id: string;
}

export interface ChangeGroupInviteCodeResponse {
  newLink: string;
}

export interface GetGroupRequestsRequest {
  token: string;
  instanceID: string;
  id: string;
}

export interface GroupRequest {
  id?: string;
  number?: string;
  phone?: string;
  name?: string;
  timestamp?: number;
}

export interface GetGroupRequestsResponse {
  requests: GroupRequest[];
}

export interface GroupRequestActionRequest {
  token: string;
  instanceID: string;
  id: string;
  numbers: string[];
}

export interface GroupRequestActionResponse {
  success: string; // "true" or "false"
}

export interface GetAllGroupsRequest {
  token: string;
  instanceID: string;
}

export interface GroupInfo {
  id: string;
  name?: string;
  description?: string;
  participantCount?: number;
  participants?: string[];
  admins?: string[];
  isAdmin?: boolean;
  createdAt?: number;
  lastActivity?: number;
}

export interface GetAllGroupsResponse {
  groups: GroupInfo[];
}

export interface WaPulseError {
  error: string;
  details?: string;
}

// Instance Management API Types
export interface CreateInstanceRequest {
  token: string;
}

export interface InstanceObject {
  instanceID: string;
  [key: string]: any; // Allow for additional properties
}

export interface CreateInstanceResponse {
  message: string;
  instance?: InstanceObject;
}

export interface GetQrCodeRequest {
  token: string;
  instanceID: string;
}

export interface GetQrCodeResponse {
  qrCode: string;
}

export interface StartInstanceRequest {
  token: string;
  instanceID: string;
}

export interface StartInstanceResponse {
  message: string;
  instance?: InstanceObject;
}

export interface StopInstanceRequest {
  token: string;
  instanceID: string;
}

export interface StopInstanceResponse {
  message: string;
  instance?: InstanceObject;
}

export interface DeleteInstanceRequest {
  token: string;
  instanceID: string;
}

export interface DeleteInstanceResponse {
  message: string;
}

// Phone number validation helper type
export type PhoneNumber = string; // Format: country code + number (e.g., "353871234567")

// Message types that could be extended in the future
export type MessageType = "user" | "group";

// Instance configuration
export interface InstanceConfig {
  instanceID: string;
  token: string;
  baseUrl?: string;
}

// Audio Message Types
export interface SendAudioRequest {
  to: string;
  audio: {
    file: string;
    filename: string;
    caption?: string;
    isVoiceNote?: boolean;
  };
  customToken?: string;
  customInstanceID?: string;
}

export interface SendAudioResponse {
  success: boolean;
  message: string;
  messageId?: string;
}



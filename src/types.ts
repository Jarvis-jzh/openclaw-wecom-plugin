import type { ChannelPeer, ChannelMessage, ChannelMedia } from 'openclaw/plugin-sdk';

/**
 * 企业微信配置
 */
export interface WeComConfig {
  enabled: boolean;
  
  // 企业API模式
  corpId?: string;
  corpSecret?: string;
  agentId?: number;
  
  // Webhook模式
  webhookUrl?: string;
  
  // 通用配置
  dmPolicy: 'pairing' | 'open';
  allowFrom: string[];
  proxy?: string;
  messagePrefix?: string;
  
  // 高级配置
  tokenRefreshInterval?: number; // token刷新间隔(秒)
  maxRetries?: number;          // 最大重试次数
  timeoutMs?: number;           // 请求超时(毫秒)
}

/**
 * 企业微信访问令牌
 */
export interface WeComAccessToken {
  access_token: string;
  expires_in: number; // 过期时间(秒)
  expires_at: number; // 过期时间戳(毫秒)
}

/**
 * 企业微信用户信息
 */
export interface WeComUser {
  userid: string;
  name: string;
  department: number[];
  position?: string;
  mobile?: string;
  email?: string;
  avatar?: string;
}

/**
 * 企业微信部门信息
 */
export interface WeComDepartment {
  id: number;
  name: string;
  parentid: number;
  order: number;
}

/**
 * 企业微信消息类型
 */
export type WeComMessageType = 
  | 'text'
  | 'image'
  | 'voice'
  | 'video'
  | 'file'
  | 'textcard'
  | 'news'
  | 'markdown';

/**
 * 企业微信消息内容
 */
export interface WeComMessageContent {
  // 文本消息
  content?: string;
  
  // 媒体消息
  media_id?: string;
  
  // 图文消息
  title?: string;
  description?: string;
  url?: string;
  picurl?: string;
  
  // 文本卡片
  btntxt?: string;
  
  // Markdown
  markdown_content?: string;
}

/**
 * 企业微信发送消息参数
 */
export interface WeComSendMessageParams {
  touser?: string;      // 用户ID列表，用|分隔
  toparty?: string;     // 部门ID列表，用|分隔
  totag?: string;       // 标签ID列表，用|分隔
  msgtype: WeComMessageType;
  agentid: number;
  content: WeComMessageContent;
  safe?: 0 | 1;         // 保密消息
  enable_id_trans?: 0 | 1; // 是否转译用户ID
}

/**
 * 企业微信接收消息
 */
export interface WeComReceivedMessage {
  ToUserName: string;   // 企业微信CorpID
  FromUserName: string; // 发送方账号
  CreateTime: number;   // 消息创建时间
  MsgType: WeComMessageType;
  MsgId: string;
  AgentID: number;
  
  // 文本消息
  Content?: string;
  
  // 媒体消息
  MediaId?: string;
  PicUrl?: string;
  
  // 位置消息
  Location_X?: number;
  Location_Y?: number;
  Scale?: number;
  Label?: string;
  
  // 事件消息
  Event?: string;
  EventKey?: string;
}

/**
 * 企业微信API响应
 */
export interface WeComApiResponse<T = any> {
  errcode: number;
  errmsg: string;
  data?: T;
}

/**
 * 企业微信消息适配器
 */
export interface WeComMessageAdapter {
  toWeComMessage(msg: ChannelMessage): WeComSendMessageParams;
  fromWeComMessage(msg: WeComReceivedMessage): ChannelMessage;
}

/**
 * 企业微信临时素材
 */
export interface WeComMediaUploadResult {
  type: 'image' | 'voice' | 'video' | 'file';
  media_id: string;
  created_at: number;
}
import type { ChannelMessage, ChannelPeer } from 'openclaw/plugin-sdk';
import type { WeComConfig, WeComSendMessageParams } from './types.js';
import { WeComApiClient } from './api.js';
import { WeComMessageAdapterImpl } from './adapter.js';
import { runtimeUtils } from './runtime.js';

/**
 * 企业微信消息发送器
 */
export class WeComMessageSender {
  private apiClient: WeComApiClient;
  private adapter: WeComMessageAdapterImpl;
  private config: WeComConfig;
  private retryCount = 0;
  
  constructor(config: WeComConfig) {
    this.config = config;
    this.apiClient = new WeComApiClient(config);
    this.adapter = new WeComMessageAdapterImpl(config.agentId || 0, config.messagePrefix);
  }
  
  /**
   * 发送消息
   */
  async send(message: ChannelMessage): Promise<SendResult> {
    try {
      runtimeUtils.log('info', '发送消息', {
        to: message.peer.id,
        type: message.peer.kind,
        hasText: !!message.text,
        hasMedia: !!(message.media && message.media.length > 0)
      });
      
      // 转换消息格式
      const wecomMessage = this.adapter.toWeComMessage(message);
      
      // 发送消息
      const response = await this.apiClient.sendMessage(wecomMessage);
      
      if (response.errcode === 0) {
        runtimeUtils.log('info', '消息发送成功', {
          messageId: response.data?.msgid,
          userId: message.peer.id
        });
        
        this.retryCount = 0; // 重置重试计数
        
        return {
          success: true,
          messageId: response.data?.msgid || `wecom-${Date.now()}`,
          timestamp: Date.now()
        };
      } else {
        // 处理错误
        const error = new WeComSendError(
          response.errmsg,
          response.errcode,
          message
        );
        
        runtimeUtils.log('error', '消息发送失败', {
          errorCode: response.errcode,
          errorMsg: response.errmsg,
          userId: message.peer.id
        });
        
        // 检查是否需要重试
        if (this.shouldRetry(response.errcode)) {
          return await this.retrySend(message, error);
        }
        
        throw error;
      }
    } catch (error) {
      runtimeUtils.log('error', '发送消息时发生异常', {
        error: error instanceof Error ? error.message : '未知错误',
        userId: message.peer.id
      });
      
      if (error instanceof WeComSendError) {
        throw error;
      }
      
      throw new WeComSendError(
        error instanceof Error ? error.message : '发送失败',
        500,
        message
      );
    }
  }
  
  /**
   * 发送文本消息
   */
  async sendText(to: ChannelPeer, text: string, replyTo?: ChannelMessage): Promise<SendResult> {
    const message: ChannelMessage = {
      peer: to,
      text,
      timestamp: Date.now(),
      id: `temp-${Date.now()}`,
      channel: 'wecom',
      accountId: this.config.agentId?.toString() || '0',
      replyTo
    };
    
    return this.send(message);
  }
  
  /**
   * 发送媒体消息
   */
  async sendMedia(
    to: ChannelPeer,
    media: Array<{
      type: 'image' | 'audio' | 'video' | 'file';
      data: Buffer;
      filename: string;
      caption?: string;
    }>,
    replyTo?: ChannelMessage
  ): Promise<SendResult> {
    // 企业微信一次只能发送一个媒体文件
    const mediaItem = media[0];
    if (!mediaItem) {
      throw new Error('没有可发送的媒体文件');
    }
    
    // 上传媒体文件
    runtimeUtils.log('info', '上传媒体文件', {
      type: mediaItem.type,
      filename: mediaItem.filename,
      size: mediaItem.data.length
    });
    
    const uploadResult = await this.apiClient.uploadMedia(
      mediaItem.type,
      mediaItem.data,
      mediaItem.filename
    );
    
    const message: ChannelMessage = {
      peer: to,
      timestamp: Date.now(),
      id: `temp-${Date.now()}`,
      channel: 'wecom',
      accountId: this.config.agentId?.toString() || '0',
      media: [{
        type: mediaItem.type,
        url: uploadResult.media_id,
        caption: mediaItem.caption
      }],
      replyTo
    };
    
    return this.send(message);
  }
  
  /**
   * 发送部门消息
   */
  async sendToDepartment(departmentId: number, text: string): Promise<SendResult> {
    const message: ChannelMessage = {
      peer: {
        kind: 'group',
        id: departmentId.toString(),
        name: `部门 ${departmentId}`
      },
      text,
      timestamp: Date.now(),
      id: `dept-${Date.now()}`,
      channel: 'wecom',
      accountId: this.config.agentId?.toString() || '0'
    };
    
    return this.send(message);
  }
  
  /**
   * 发送卡片消息
   */
  async sendCard(
    to: ChannelPeer,
    title: string,
    description: string,
    url: string,
    btntxt: string = '查看详情'
  ): Promise<SendResult> {
    const cardMessage = this.adapter.buildCardMessage(
      title,
      description,
      url,
      btntxt,
      to.kind === 'dm' ? to.id : undefined,
      to.kind === 'group' ? to.id : undefined
    );
    
    const response = await this.apiClient.sendMessage(cardMessage);
    
    if (response.errcode === 0) {
      return {
        success: true,
        messageId: response.data?.msgid || `card-${Date.now()}`,
        timestamp: Date.now()
      };
    } else {
      throw new WeComSendError(response.errmsg, response.errcode, {
        peer: to,
        text: title,
        timestamp: Date.now(),
        id: `temp-${Date.now()}`,
        channel: 'wecom',
        accountId: this.config.agentId?.toString() || '0'
      });
    }
  }
  
  /**
   * 检查是否需要重试
   */
  private shouldRetry(errorCode: number): boolean {
    // 这些错误码通常可以重试
    const retryableErrors = [
      42001, // token过期
      40014, // token无效
      45033, // 接口调用超过限制
      45009, // 接口调用超过频率限制
      50001, // 用户未授权
    ];
    
    return retryableErrors.includes(errorCode) && this.retryCount < (this.config.maxRetries || 3);
  }
  
  /**
   * 重试发送
   */
  private async retrySend(message: ChannelMessage, error: WeComSendError): Promise<SendResult> {
    this.retryCount++;
    
    runtimeUtils.log('warn', `重试发送消息 (${this.retryCount}/${this.config.maxRetries || 3})`, {
      errorCode: error.errorCode,
      errorMsg: error.message,
      userId: message.peer.id
    });
    
    // 等待指数退避
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 如果是token错误，刷新token
    if (error.errorCode === 42001 || error.errorCode === 40014) {
      await this.apiClient.refreshAccessToken();
    }
    
    return this.send(message);
  }
  
  /**
   * 销毁资源
   */
  destroy(): void {
    this.apiClient.destroy();
  }
}

/**
 * 发送结果
 */
export interface SendResult {
  success: boolean;
  messageId: string;
  timestamp: number;
  error?: string;
}

/**
 * 企业微信发送错误
 */
export class WeComSendError extends Error {
  constructor(
    message: string,
    public readonly errorCode: number,
    public readonly originalMessage: ChannelMessage
  ) {
    super(`企业微信发送错误 ${errorCode}: ${message}`);
    this.name = 'WeComSendError';
  }
  
  /**
   * 是否可恢复
   */
  isRecoverable(): boolean {
    // 这些错误通常可以恢复
    const recoverableErrors = [
      42001, // token过期
      40014, // token无效
      45033, // 接口调用超过限制
    ];
    
    return recoverableErrors.includes(this.errorCode);
  }
  
  /**
   * 获取错误描述
   */
  getDescription(): string {
    const errorDescriptions: Record<number, string> = {
      40001: '不合法的调用凭证',
      40014: 'access_token无效',
      42001: 'access_token已过期',
      45009: '接口调用超过频率限制',
      45033: '接口调用超过限制',
      50001: '用户未授权',
      60011: '无权限操作该用户',
      60102: 'UserID已存在',
      60103: '手机号码不合法',
      60104: '手机号码已存在',
      60105: '邮箱不合法',
      60106: '邮箱已存在',
      60107: '微信号不合法',
      60110: '用户所属部门数量超过限制',
      60111: 'UserID不存在',
      60112: '用户已禁用',
      60123: '无效的部门id',
      60124: '无效的父部门id',
      60125: '部门名称不合法',
      60127: '缺少department参数',
      60128: '部门id和父部门id不能相同',
      60129: '部门层级超过限制',
    };
    
    return errorDescriptions[this.errorCode] || '未知错误';
  }
}
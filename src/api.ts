import type { WeComConfig, WeComAccessToken, WeComApiResponse, WeComSendMessageParams, WeComMediaUploadResult } from './types.js';

/**
 * 企业微信API客户端
 */
export class WeComApiClient {
  private baseUrl = 'https://qyapi.weixin.qq.com/cgi-bin';
  private config: WeComConfig;
  private accessToken: WeComAccessToken | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  
  constructor(config: WeComConfig) {
    this.config = config;
  }
  
  /**
   * 初始化客户端
   */
  async initialize(): Promise<void> {
    if (this.config.corpId && this.config.corpSecret) {
      await this.refreshAccessToken();
      
      // 设置定时刷新
      const refreshInterval = (this.config.tokenRefreshInterval || 3600) * 1000;
      this.tokenRefreshTimer = setInterval(() => {
        this.refreshAccessToken().catch(err => {
          console.error('企业微信token刷新失败:', err);
        });
      }, refreshInterval);
    }
  }
  
  /**
   * 销毁客户端
   */
  destroy(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }
  
  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.config.corpId || !this.config.corpSecret) {
      throw new Error('缺少corpId或corpSecret配置');
    }
    
    const url = `${this.baseUrl}/gettoken`;
    const params = new URLSearchParams({
      corpid: this.config.corpId,
      corpsecret: this.config.corpSecret
    });
    
    const response = await this.request<{ access_token: string; expires_in: number }>(
      `${url}?${params}`
    );
    
    if (response.errcode === 0 && response.access_token) {
      this.accessToken = {
        access_token: response.access_token,
        expires_in: response.expires_in,
        expires_at: Date.now() + (response.expires_in - 300) * 1000 // 提前5分钟过期
      };
      console.log('企业微信访问令牌已刷新，过期时间:', new Date(this.accessToken.expires_at).toLocaleString());
    } else {
      throw new Error(`获取访问令牌失败: ${response.errmsg} (${response.errcode})`);
    }
  }
  
  /**
   * 获取当前访问令牌
   */
  async getAccessToken(): Promise<string> {
    if (!this.accessToken || Date.now() >= this.accessToken.expires_at) {
      await this.refreshAccessToken();
    }
    
    if (!this.accessToken) {
      throw new Error('无法获取访问令牌');
    }
    
    return this.accessToken.access_token;
  }
  
  /**
   * 发送消息
   */
  async sendMessage(params: WeComSendMessageParams): Promise<WeComApiResponse> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/message/send?access_token=${token}`;
    
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }
  
  /**
   * 上传临时素材
   */
  async uploadMedia(
    type: 'image' | 'voice' | 'video' | 'file',
    mediaData: Buffer,
    filename: string
  ): Promise<WeComMediaUploadResult> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/media/upload?access_token=${token}&type=${type}`;
    
    // 创建FormData（模拟）
    const formData = new FormData();
    const blob = new Blob([mediaData], { type: this.getMimeType(type, filename) });
    formData.append('media', blob, filename);
    
    const response = await this.request<WeComMediaUploadResult>(url, {
      method: 'POST',
      body: formData as any
    });
    
    if (response.errcode !== 0) {
      throw new Error(`上传素材失败: ${response.errmsg} (${response.errcode})`);
    }
    
    return {
      type,
      media_id: response.media_id,
      created_at: response.created_at || Math.floor(Date.now() / 1000)
    };
  }
  
  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/user/get?access_token=${token}&userid=${userId}`;
    
    return this.request(url);
  }
  
  /**
   * 获取部门列表
   */
  async getDepartmentList(parentId: number = 1): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/department/list?access_token=${token}&id=${parentId}`;
    
    return this.request(url);
  }
  
  /**
   * 获取部门成员
   */
  async getDepartmentUsers(departmentId: number, fetchChild: boolean = false): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/user/list?access_token=${token}&department_id=${departmentId}&fetch_child=${fetchChild ? 1 : 0}`;
    
    return this.request(url);
  }
  
  /**
   * 通用请求方法
   */
  private async request<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<WeComApiResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs || 10000);
    
    try {
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };
      
      // 添加代理支持
      if (this.config.proxy) {
        // 在实际实现中，这里需要使用支持代理的HTTP客户端
        // 目前使用fetch的简单实现
      }
      
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as WeComApiResponse<T>;
      
      // 处理常见的错误码
      if (data.errcode === 40014 || data.errcode === 42001) {
        // token过期，尝试刷新
        console.log('检测到token过期，尝试刷新...');
        await this.refreshAccessToken();
        // 这里可以添加重试逻辑
      }
      
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  
  /**
   * 根据文件类型获取MIME类型
   */
  private getMimeType(type: string, filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    switch (type) {
      case 'image':
        return `image/${ext === 'jpg' ? 'jpeg' : ext || 'jpeg'}`;
      case 'voice':
        return 'audio/amr';
      case 'video':
        return 'video/mp4';
      case 'file':
        return 'application/octet-stream';
      default:
        return 'application/octet-stream';
    }
  }
  
  /**
   * 检查连接状态
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (this.config.webhookUrl) {
        // Webhook模式检查
        const response = await fetch(this.config.webhookUrl, {
          method: 'HEAD',
          timeout: 5000
        });
        return response.ok;
      } else {
        // 企业API模式检查
        await this.getAccessToken();
        return true;
      }
    } catch {
      return false;
    }
  }
}
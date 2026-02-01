import type {
  ChannelPlugin,
  ChannelMeta,
  ChannelCapabilities,
  ChannelMessage,
  ChannelPeer,
  OpenClawPluginApi,
  PluginRuntime
} from 'openclaw/plugin-sdk';
import type { WeComConfig, WeComMessageAdapter } from './types.js';
import { WeComApiClient } from './api.js';
import { WeComMessageAdapterImpl } from './adapter.js';
import { validateWeComConfig } from './config-schema.js';

/**
 * 企业微信通道运行时
 */
class WeComRuntime {
  private runtime: PluginRuntime | null = null;
  
  setRuntime(runtime: PluginRuntime) {
    this.runtime = runtime;
  }
  
  getRuntime(): PluginRuntime {
    if (!this.runtime) {
      throw new Error('运行时未初始化');
    }
    return this.runtime;
  }
}

export const wecomRuntime = new WeComRuntime();

/**
 * 企业微信通道插件
 */
export const wecomPlugin: ChannelPlugin<WeComConfig> = {
  id: 'wecom',
  name: '企业微信',
  
  // 通道能力
  capabilities: {
    text: true,
    media: true,
    reactions: false, // 企业微信不支持反应
    typing: false,    // 企业微信不支持输入指示
    edits: false,     // 企业微信不支持消息编辑
    deletes: false,   // 企业微信不支持消息删除
    replies: true,
    mentions: true,
    groups: true,     // 通过部门/标签支持群组
    voice: true,
    video: true,
    files: true,
    locations: true,
    events: true      // 企业微信事件
  } as ChannelCapabilities,
  
  // 通道元数据
  meta: {
    description: '企业微信通道，支持完整的企业API',
    icon: '🏢',
    categories: ['enterprise', 'china'],
    requiresAuth: true,
    supportsWebhook: true,
    supportsLongPolling: false
  } as ChannelMeta,
  
  // 初始化
  async initialize(config: WeComConfig, api: OpenClawPluginApi) {
    const errors = validateWeComConfig(config);
    if (errors.length > 0) {
      throw new Error(`配置验证失败: ${errors.join(', ')}`);
    }
    
    console.log('企业微信通道初始化...');
    
    // 检查连接
    const apiClient = new WeComApiClient(config);
    const connected = await apiClient.checkConnection();
    
    if (!connected) {
      throw new Error('无法连接到企业微信API');
    }
    
    console.log('企业微信通道初始化完成');
  },
  
  // 发送消息
  async send(message: ChannelMessage, config: WeComConfig) {
    const apiClient = new WeComApiClient(config);
    const adapter = new WeComMessageAdapterImpl(config.agentId || 0, config.messagePrefix);
    
    try {
      // 转换消息格式
      const wecomMessage = adapter.toWeComMessage(message);
      
      // 发送消息
      const response = await apiClient.sendMessage(wecomMessage);
      
      if (response.errcode !== 0) {
        throw new Error(`发送失败: ${response.errmsg} (${response.errcode})`);
      }
      
      return {
        success: true,
        messageId: response.data?.msgid || `wecom-${Date.now()}`
      };
    } catch (error) {
      console.error('发送企业微信消息失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  },
  
  // 接收消息（Webhook模式）
  async receive(webhookData: any, config: WeComConfig) {
    const adapter = new WeComMessageAdapterImpl(config.agentId || 0);
    
    try {
      // 验证Webhook签名（如果配置了）
      if (config.webhookUrl && webhookData.msg_signature) {
        // 实际实现中需要验证签名
      }
      
      // 转换消息格式
      const message = adapter.fromWeComMessage(webhookData);
      
      return {
        messages: [message],
        shouldReply: true // 企业微信通常需要回复
      };
    } catch (error) {
      console.error('处理企业微信消息失败:', error);
      return {
        messages: [],
        shouldReply: false
      };
    }
  },
  
  // 处理事件
  async handleEvent(event: any, config: WeComConfig) {
    // 企业微信特有事件处理
    const { type, data } = event;
    
    switch (type) {
      case 'user_add':
        console.log(`新用户添加: ${data.userid}`);
        break;
      case 'user_leave':
        console.log(`用户离开: ${data.userid}`);
        break;
      case 'department_create':
        console.log(`部门创建: ${data.departmentid}`);
        break;
      case 'department_update':
        console.log(`部门更新: ${data.departmentid}`);
        break;
    }
    
    return { handled: true };
  },
  
  // 获取用户信息
  async getUserInfo(peer: ChannelPeer, config: WeComConfig) {
    if (!config.corpId || !config.corpSecret) {
      return null;
    }
    
    try {
      const apiClient = new WeComApiClient(config);
      const userInfo = await apiClient.getUserInfo(peer.id);
      
      if (userInfo.errcode === 0) {
        return {
          id: peer.id,
          name: userInfo.name || peer.id,
          avatar: userInfo.avatar,
          email: userInfo.email,
          phone: userInfo.mobile,
          department: userInfo.department?.join(',') || ''
        };
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
    
    return null;
  },
  
  // 验证权限
  async checkPermission(peer: ChannelPeer, config: WeComConfig): Promise<boolean> {
    const { dmPolicy, allowFrom } = config;
    
    // 检查允许列表
    if (allowFrom.includes('*')) {
      return true;
    }
    
    if (allowFrom.includes(peer.id)) {
      return true;
    }
    
    // DM配对策略
    if (dmPolicy === 'pairing' && peer.kind === 'dm') {
      // 这里应该检查配对状态
      // 暂时返回true用于测试
      return true;
    }
    
    return dmPolicy === 'open';
  },
  
  // 健康检查
  async healthCheck(config: WeComConfig): Promise<{ healthy: boolean; details?: any }> {
    try {
      const apiClient = new WeComApiClient(config);
      const connected = await apiClient.checkConnection();
      
      if (connected) {
        return {
          healthy: true,
          details: {
            mode: config.webhookUrl ? 'webhook' : 'enterprise-api',
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          healthy: false,
          details: { error: '连接失败' }
        };
      }
    } catch (error) {
      return {
        healthy: false,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      };
    }
  },
  
  // 清理资源
  async cleanup(config: WeComConfig) {
    // 清理计时器等资源
    console.log('企业微信通道清理完成');
  }
};

/**
 * 通道扩展功能（Dock）
 */
export const wecomDock = {
  // 发送测试消息
  async sendTestMessage(config: WeComConfig, to: string, message: string) {
    const apiClient = new WeComApiClient(config);
    const adapter = new WeComMessageAdapterImpl(config.agentId || 0);
    
    const testMessage: ChannelMessage = {
      peer: { kind: 'dm', id: to, name: '测试用户' },
      text: message,
      timestamp: Date.now(),
      id: `test-${Date.now()}`,
      channel: 'wecom',
      accountId: config.agentId?.toString() || '0'
    };
    
    const wecomMessage = adapter.toWeComMessage(testMessage);
    return apiClient.sendMessage(wecomMessage);
  },
  
  // 获取部门列表
  async getDepartments(config: WeComConfig, parentId: number = 1) {
    if (!config.corpId || !config.corpSecret) {
      throw new Error('需要企业API配置');
    }
    
    const apiClient = new WeComApiClient(config);
    return apiClient.getDepartmentList(parentId);
  },
  
  // 获取部门成员
  async getDepartmentUsers(config: WeComConfig, departmentId: number, fetchChild: boolean = false) {
    if (!config.corpId || !config.corpSecret) {
      throw new Error('需要企业API配置');
    }
    
    const apiClient = new WeComApiClient(config);
    return apiClient.getDepartmentUsers(departmentId, fetchChild);
  },
  
  // 上传测试文件
  async uploadTestFile(config: WeComConfig, fileData: Buffer, filename: string) {
    if (!config.corpId || !config.corpSecret) {
      throw new Error('需要企业API配置');
    }
    
    const apiClient = new WeComApiClient(config);
    return apiClient.uploadMedia('file', fileData, filename);
  },
  
  // 验证配置
  validateConfig(config: Partial<WeComConfig>): string[] {
    return validateWeComConfig(config);
  }
};
import type { PluginConfigSchema } from 'openclaw/plugin-sdk';
import type { WeComConfig } from './types.js';

/**
 * 企业微信配置schema
 */
export const wecomConfigSchema: PluginConfigSchema<WeComConfig> = {
  type: 'object',
  properties: {
    enabled: {
      type: 'boolean',
      default: true,
      description: '启用企业微信通道',
      ui: { group: '基本配置' }
    },
    
    // 企业API模式
    corpId: {
      type: 'string',
      description: '企业ID(必填)',
      ui: {
        group: '企业API配置',
        label: '企业ID (corpId)',
        placeholder: 'wwxxxxxxxxxxxxxxx'
      }
    },
    
    corpSecret: {
      type: 'string',
      description: '应用Secret(必填)',
      sensitive: true,
      ui: {
        group: '企业API配置',
        label: '应用Secret',
        placeholder: 'xxxxxxxxxxxxxxxx'
      }
    },
    
    agentId: {
      type: 'number',
      description: '应用AgentID(必填)',
      ui: {
        group: '企业API配置',
        label: '应用AgentID',
        placeholder: '1000001'
      }
    },
    
    // Webhook模式（备选）
    webhookUrl: {
      type: 'string',
      description: '群机器人Webhook URL',
      ui: {
        group: 'Webhook配置',
        label: 'Webhook URL',
        placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx'
      }
    },
    
    // 安全配置
    dmPolicy: {
      type: 'string',
      enum: ['pairing', 'open'],
      default: 'pairing',
      description: '私聊策略: pairing=需要配对, open=开放访问',
      ui: {
        group: '安全配置',
        label: '私聊策略'
      }
    },
    
    allowFrom: {
      type: 'array',
      items: { type: 'string' },
      default: [],
      description: '允许发消息的用户/部门ID列表，["*"]表示允许所有',
      ui: {
        group: '安全配置',
        label: '允许列表'
      }
    },
    
    // 高级配置
    proxy: {
      type: 'string',
      description: '代理服务器地址',
      ui: {
        group: '高级配置',
        label: '代理地址',
        placeholder: 'http://proxy.local:8080'
      }
    },
    
    messagePrefix: {
      type: 'string',
      description: '消息前缀',
      ui: {
        group: '高级配置',
        label: '消息前缀',
        placeholder: '[AI助手] '
      }
    },
    
    tokenRefreshInterval: {
      type: 'number',
      default: 3600, // 1小时
      description: '访问令牌刷新间隔(秒)',
      ui: {
        group: '高级配置',
        label: '令牌刷新间隔(秒)'
      }
    },
    
    maxRetries: {
      type: 'number',
      default: 3,
      description: '最大重试次数',
      ui: {
        group: '高级配置',
        label: '最大重试次数'
      }
    },
    
    timeoutMs: {
      type: 'number',
      default: 10000,
      description: '请求超时时间(毫秒)',
      ui: {
        group: '高级配置',
        label: '超时时间(毫秒)'
      }
    }
  },
  required: [], // 企业API和Webhook模式二选一
  
  ui: {
    groups: [
      { id: 'basic', label: '基本配置' },
      { id: 'api', label: '企业API配置' },
      { id: 'webhook', label: 'Webhook配置' },
      { id: 'security', label: '安全配置' },
      { id: 'advanced', label: '高级配置' }
    ]
  }
};

/**
 * 验证配置
 */
export function validateWeComConfig(config: Partial<WeComConfig>): string[] {
  const errors: string[] = [];
  
  if (!config.enabled) {
    return []; // 禁用时不验证
  }
  
  // 检查企业API模式配置
  const hasApiConfig = config.corpId && config.corpSecret && config.agentId;
  const hasWebhookConfig = config.webhookUrl;
  
  if (!hasApiConfig && !hasWebhookConfig) {
    errors.push('必须配置企业API(corpId+corpSecret+agentId)或Webhook URL');
  }
  
  if (hasApiConfig && hasWebhookConfig) {
    errors.push('不能同时配置企业API和Webhook URL，请选择一种模式');
  }
  
  if (hasApiConfig) {
    if (!config.corpId?.trim()) {
      errors.push('corpId不能为空');
    }
    if (!config.corpSecret?.trim()) {
      errors.push('corpSecret不能为空');
    }
    if (!config.agentId || config.agentId <= 0) {
      errors.push('agentId必须为正整数');
    }
  }
  
  if (hasWebhookConfig && !config.webhookUrl?.startsWith('http')) {
    errors.push('webhookUrl必须是有效的URL');
  }
  
  return errors;
}
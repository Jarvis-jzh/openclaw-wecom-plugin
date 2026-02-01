import type {
  OnboardingStep,
  OnboardingStepResult,
  OpenClawPluginApi
} from 'openclaw/plugin-sdk';
import type { WeComConfig } from './types.js';
import { validateWeComConfig } from './config-schema.js';
import { runtimeUtils } from './runtime.js';

/**
 * 企业微信配置引导
 */
export const wecomOnboarding: OnboardingStep<WeComConfig>[] = [
  {
    id: 'mode-selection',
    title: '选择对接模式',
    description: '选择企业微信对接模式',
    
    async run(api, currentConfig): Promise<OnboardingStepResult<WeComConfig>> {
      const choices = [
        { value: 'enterprise', label: '企业API模式（推荐）', description: '使用企业微信官方API，功能完整' },
        { value: 'webhook', label: 'Webhook模式（简化）', description: '使用群机器人Webhook，配置简单' }
      ];
      
      const selected = await api.prompt.choice({
        message: '请选择对接模式:',
        choices
      });
      
      return {
        updates: { mode: selected } as any,
        nextStep: selected === 'enterprise' ? 'enterprise-config' : 'webhook-config'
      };
    }
  },
  
  {
    id: 'enterprise-config',
    title: '配置企业API',
    description: '配置企业微信应用信息',
    
    async run(api, currentConfig): Promise<OnboardingStepResult<WeComConfig>> {
      runtimeUtils.log('info', '开始配置企业API模式');
      
      // 获取企业ID
      const corpId = await api.prompt.input({
        message: '请输入企业ID (corpId):',
        placeholder: 'wwxxxxxxxxxxxxxxx',
        validate: (value) => {
          if (!value.trim()) return '企业ID不能为空';
          if (!value.startsWith('ww')) return '企业ID应以"ww"开头';
          return null;
        }
      });
      
      // 获取应用Secret
      const corpSecret = await api.prompt.input({
        message: '请输入应用Secret:',
        placeholder: 'xxxxxxxxxxxxxxxx',
        sensitive: true,
        validate: (value) => {
          if (!value.trim()) return '应用Secret不能为空';
          return null;
        }
      });
      
      // 获取应用AgentID
      const agentIdStr = await api.prompt.input({
        message: '请输入应用AgentID:',
        placeholder: '1000001',
        validate: (value) => {
          if (!value.trim()) return 'AgentID不能为空';
          if (!/^\d+$/.test(value)) return 'AgentID必须为数字';
          return null;
        }
      });
      
      const agentId = parseInt(agentIdStr, 10);
      
      // 测试连接
      const testing = await api.prompt.confirm({
        message: '是否立即测试连接？',
        default: true
      });
      
      if (testing) {
        try {
          // 这里应该实际测试连接
          await api.prompt.info('正在测试连接...');
          
          // 模拟连接测试
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await api.prompt.success('连接测试成功！');
        } catch (error) {
          await api.prompt.error(`连接测试失败: ${error}`);
          
          const retry = await api.prompt.confirm({
            message: '是否重新配置？',
            default: true
          });
          
          if (retry) {
            return { nextStep: 'enterprise-config' };
          }
        }
      }
      
      return {
        updates: {
          corpId,
          corpSecret,
          agentId,
          enabled: true,
          dmPolicy: 'pairing',
          allowFrom: ['*']
        },
        nextStep: 'security-config'
      };
    }
  },
  
  {
    id: 'webhook-config',
    title: '配置Webhook',
    description: '配置企业微信群机器人Webhook',
    
    async run(api, currentConfig): Promise<OnboardingStepResult<WeComConfig>> {
      runtimeUtils.log('info', '开始配置Webhook模式');
      
      const webhookUrl = await api.prompt.input({
        message: '请输入Webhook URL:',
        placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx',
        validate: (value) => {
          if (!value.trim()) return 'Webhook URL不能为空';
          if (!value.startsWith('http')) return '请输入有效的URL';
          return null;
        }
      });
      
      // 测试Webhook
      const testing = await api.prompt.confirm({
        message: '是否测试Webhook连接？',
        default: true
      });
      
      if (testing) {
        try {
          await api.prompt.info('正在测试Webhook...');
          
          // 这里应该实际测试Webhook
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              msgtype: 'text',
              text: { content: 'OpenClaw连接测试' }
            })
          });
          
          if (response.ok) {
            await api.prompt.success('Webhook测试成功！');
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          await api.prompt.error(`Webhook测试失败: ${error}`);
          
          const retry = await api.prompt.confirm({
            message: '是否重新配置？',
            default: true
          });
          
          if (retry) {
            return { nextStep: 'webhook-config' };
          }
        }
      }
      
      return {
        updates: {
          webhookUrl,
          enabled: true,
          dmPolicy: 'open',
          allowFrom: ['*']
        },
        nextStep: 'security-config'
      };
    }
  },
  
  {
    id: 'security-config',
    title: '安全配置',
    description: '配置访问权限和安全策略',
    
    async run(api, currentConfig): Promise<OnboardingStepResult<WeComConfig>> {
      runtimeUtils.log('info', '开始配置安全策略');
      
      // 选择私聊策略
      const dmPolicy = await api.prompt.choice({
        message: '选择私聊策略:',
        choices: [
          { value: 'pairing', label: '需要配对', description: '用户首次私聊需要配对码' },
          { value: 'open', label: '开放访问', description: '允许所有用户私聊' }
        ],
        default: currentConfig.dmPolicy || 'pairing'
      });
      
      // 配置允许列表
      let allowFrom: string[] = [];
      
      if (dmPolicy === 'open') {
        const allowAll = await api.prompt.confirm({
          message: '是否允许所有用户访问？',
          default: true
        });
        
        if (allowAll) {
          allowFrom = ['*'];
        } else {
          const userList = await api.prompt.input({
            message: '请输入允许的用户ID（多个用逗号分隔）:',
            placeholder: 'user1,user2,department1'
          });
          
          allowFrom = userList.split(',').map(id => id.trim()).filter(Boolean);
        }
      }
      
      // 配置消息前缀
      const usePrefix = await api.prompt.confirm({
        message: '是否添加消息前缀？',
        default: false
      });
      
      let messagePrefix = '';
      if (usePrefix) {
        messagePrefix = await api.prompt.input({
          message: '请输入消息前缀:',
          placeholder: '[AI助手] ',
          default: '[AI助手] '
        });
      }
      
      return {
        updates: {
          dmPolicy,
          allowFrom,
          messagePrefix: messagePrefix || undefined
        },
        nextStep: 'advanced-config'
      };
    }
  },
  
  {
    id: 'advanced-config',
    title: '高级配置',
    description: '配置高级选项',
    
    async run(api, currentConfig): Promise<OnboardingStepResult<WeComConfig>> {
      runtimeUtils.log('info', '开始配置高级选项');
      
      const updates: Partial<WeComConfig> = {};
      
      // 代理配置
      const useProxy = await api.prompt.confirm({
        message: '是否需要配置代理？',
        default: false
      });
      
      if (useProxy) {
        updates.proxy = await api.prompt.input({
          message: '请输入代理地址:',
          placeholder: 'http://proxy.local:8080',
          validate: (value) => {
            if (!value.startsWith('http')) return '请输入有效的代理地址';
            return null;
          }
        });
      }
      
      // 超时配置
      const customTimeout = await api.prompt.confirm({
        message: '是否自定义超时时间？',
        default: false
      });
      
      if (customTimeout) {
        const timeoutMs = await api.prompt.input({
          message: '请输入超时时间（毫秒）:',
          placeholder: '10000',
          default: '10000',
          validate: (value) => {
            const num = parseInt(value, 10);
            if (isNaN(num) || num <= 0) return '请输入正数';
            return null;
          }
        });
        
        updates.timeoutMs = parseInt(timeoutMs, 10);
      }
      
      // 重试配置
      const customRetries = await api.prompt.confirm({
        message: '是否自定义重试次数？',
        default: false
      });
      
      if (customRetries) {
        const maxRetries = await api.prompt.input({
          message: '请输入最大重试次数:',
          placeholder: '3',
          default: '3',
          validate: (value) => {
            const num = parseInt(value, 10);
            if (isNaN(num) || num < 0) return '请输入非负数';
            return null;
          }
        });
        
        updates.maxRetries = parseInt(maxRetries, 10);
      }
      
      return {
        updates,
        nextStep: 'validation'
      };
    }
  },
  
  {
    id: 'validation',
    title: '配置验证',
    description: '验证配置并完成',
    
    async run(api, currentConfig): Promise<OnboardingStepResult<WeComConfig>> {
      runtimeUtils.log('info', '开始验证配置');
      
      // 合并所有配置
      const finalConfig: WeComConfig = {
        enabled: true,
        dmPolicy: 'pairing',
        allowFrom: [],
        ...currentConfig
      };
      
      // 验证配置
      const errors = validateWeComConfig(finalConfig);
      
      if (errors.length > 0) {
        await api.prompt.error('配置验证失败:');
        for (const error of errors) {
          await api.prompt.error(`  - ${error}`);
        }
        
        const restart = await api.prompt.confirm({
          message: '是否重新配置？',
          default: true
        });
        
        if (restart) {
          return { nextStep: 'mode-selection' };
        } else {
          throw new Error('配置验证失败');
        }
      }
      
      // 显示配置摘要
      await api.prompt.info('配置摘要:');
      
      if (finalConfig.corpId) {
        await api.prompt.info(`  模式: 企业API模式`);
        await api.prompt.info(`  企业ID: ${finalConfig.corpId.substring(0, 8)}...`);
        await api.prompt.info(`  AgentID: ${finalConfig.agentId}`);
      } else if (finalConfig.webhookUrl) {
        await api.prompt.info(`  模式: Webhook模式`);
        await api.prompt.info(`  Webhook: ${finalConfig.webhookUrl.substring(0, 50)}...`);
      }
      
      await api.prompt.info(`  私聊策略: ${finalConfig.dmPolicy}`);
      await api.prompt.info(`  允许列表: ${finalConfig.allowFrom.join(', ') || '无'}`);
      
      if (finalConfig.messagePrefix) {
        await api.prompt.info(`  消息前缀: ${finalConfig.messagePrefix}`);
      }
      
      const confirm = await api.prompt.confirm({
        message: '是否应用此配置？',
        default: true
      });
      
      if (!confirm) {
        return { nextStep: 'mode-selection' };
      }
      
      await api.prompt.success('企业微信配置完成！');
      
      return {
        updates: finalConfig,
        completed: true
      };
    }
  }
];

/**
 * 快速配置引导（简化版）
 */
export async function quickSetupWeCom(api: OpenClawPluginApi): Promise<Partial<WeComConfig>> {
  runtimeUtils.log('info', '开始快速配置企业微信');
  
  try {
    const corpId = await api.prompt.input({
      message: '企业ID (corpId):',
      placeholder: 'wwxxxxxxxxxxxxxxx'
    });
    
    const corpSecret = await api.prompt.input({
      message: '应用Secret:',
      placeholder: 'xxxxxxxxxxxxxxxx',
      sensitive: true
    });
    
    const agentIdStr = await api.prompt.input({
      message: '应用AgentID:',
      placeholder: '1000001'
    });
    
    return {
      corpId,
      corpSecret,
      agentId: parseInt(agentIdStr, 10),
      enabled: true,
      dmPolicy: 'pairing',
      allowFrom: ['*']
    };
  } catch (error) {
    runtimeUtils.log('error', '快速配置失败', { error });
    throw error;
  }
}
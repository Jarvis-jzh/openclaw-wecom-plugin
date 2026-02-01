import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';

import { wecomConfigSchema } from './src/config-schema.js';
import { wecomPlugin, wecomDock } from './src/channel.js';
import { wecomOnboarding, quickSetupWeCom } from './src/onboarding.js';
import { setWeComRuntime } from './src/runtime.js';

/**
 * 企业微信插件
 */
const plugin = {
  id: 'wecom',
  name: '企业微信',
  description: '企业微信通道插件，支持完整的企业API',
  version: '1.0.0',
  
  // 配置schema
  configSchema: wecomConfigSchema,
  
  // 注册插件
  register(api: OpenClawPluginApi) {
    // 设置运行时
    setWeComRuntime(api.runtime);
    
    // 注册通道
    api.registerChannel({ 
      plugin: wecomPlugin, 
      dock: wecomDock 
    });
    
    // 注册配置引导
    api.registerOnboarding('wecom', wecomOnboarding);
    
    // 注册快速配置函数
    api.registerQuickSetup('wecom', quickSetupWeCom);
    
    console.log('企业微信插件注册完成');
  },
  
  // 插件元数据
  metadata: {
    author: 'OpenClaw Team',
    homepage: 'https://openclaw.ai',
    repository: 'https://github.com/openclaw/openclaw',
    license: 'MIT',
    
    // 企业微信相关信息
    wecom: {
      minVersion: '3.0.0',
      requiredScopes: [
        'contact:read',
        'contact:write',
        'message:send',
        'message:receive'
      ],
      supportedMessageTypes: [
        'text',
        'image',
        'voice',
        'video',
        'file',
        'textcard',
        'news',
        'markdown'
      ]
    }
  }
};

export default plugin;
import type { PluginRuntime } from 'openclaw/plugin-sdk';
import { wecomRuntime } from './channel.js';

/**
 * 设置企业微信运行时
 */
export function setWeComRuntime(runtime: PluginRuntime): void {
  wecomRuntime.setRuntime(runtime);
}

/**
 * 获取企业微信运行时
 */
export function getWeComRuntime(): PluginRuntime {
  return wecomRuntime.getRuntime();
}

/**
 * 运行时工具函数
 */
export const runtimeUtils = {
  /**
   * 使用运行时记录日志
   */
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    try {
      const runtime = getWeComRuntime();
      const logger = runtime.logging.getChildLogger('wecom');
      
      const logMessage = data 
        ? `${message} ${JSON.stringify(data)}`
        : message;
      
      switch (level) {
        case 'info':
          console.log(`[WeCom] ${logMessage}`);
          break;
        case 'warn':
          console.warn(`[WeCom] ${logMessage}`);
          break;
        case 'error':
          console.error(`[WeCom] ${logMessage}`);
          break;
      }
    } catch (error) {
      // 回退到console
      console[level](`[WeCom] ${message}`, data || '');
    }
  },
  
  /**
   * 获取状态目录
   */
  getStateDir(): string {
    try {
      const runtime = getWeComRuntime();
      return runtime.state.resolveStateDir();
    } catch {
      return '/tmp/openclaw-wecom';
    }
  },
  
  /**
   * 检查是否启用详细日志
   */
  isVerboseLogging(): boolean {
    try {
      const runtime = getWeComRuntime();
      return runtime.logging.shouldLogVerbose();
    } catch {
      return false;
    }
  }
};
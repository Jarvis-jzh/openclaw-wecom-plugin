/**
 * 企业微信插件使用示例
 * 
 * 这个文件演示了如何使用企业微信插件
 */

import { WeComApiClient } from './src/api.js';
import { WeComMessageAdapterImpl } from './src/adapter.js';
import { WeComAccountManager } from './src/accounts.js';
import { WeComMessageSender } from './src/send.js';

/**
 * 示例1: 发送文本消息
 */
async function exampleSendText() {
  const config = {
    corpId: 'wwxxxxxxxxxxxxxxx',
    corpSecret: 'xxxxxxxxxxxxxxxx',
    agentId: 1000001,
    enabled: true,
    dmPolicy: 'pairing' as const,
    allowFrom: ['*']
  };

  const sender = new WeComMessageSender(config);
  
  try {
    const result = await sender.sendText(
      { kind: 'dm', id: 'zhangsan', name: '张三' },
      '你好，这是测试消息！'
    );
    
    console.log('消息发送成功:', result);
  } catch (error) {
    console.error('发送失败:', error);
  } finally {
    sender.destroy();
  }
}

/**
 * 示例2: 发送部门消息
 */
async function exampleSendToDepartment() {
  const config = {
    corpId: 'wwxxxxxxxxxxxxxxx',
    corpSecret: 'xxxxxxxxxxxxxxxx',
    agentId: 1000001,
    enabled: true,
    dmPolicy: 'pairing' as const,
    allowFrom: ['*']
  };

  const sender = new WeComMessageSender(config);
  
  try {
    // 发送到部门ID为2的所有成员
    const result = await sender.sendToDepartment(
      2,
      '【部门通知】\n请大家参加下午3点的部门会议。'
    );
    
    console.log('部门消息发送成功:', result);
  } catch (error) {
    console.error('发送失败:', error);
  } finally {
    sender.destroy();
  }
}

/**
 * 示例3: 发送卡片消息
 */
async function exampleSendCard() {
  const config = {
    corpId: 'wwxxxxxxxxxxxxxxx',
    corpSecret: 'xxxxxxxxxxxxxxxx',
    agentId: 1000001,
    enabled: true,
    dmPolicy: 'pairing' as const,
    allowFrom: ['*']
  };

  const sender = new WeComMessageSender(config);
  
  try {
    const result = await sender.sendCard(
      { kind: 'dm', id: 'lisi', name: '李四' },
      '任务完成通知',
      '您的项目任务已经完成，请查收附件。',
      'https://example.com/task/123',
      '查看详情'
    );
    
    console.log('卡片消息发送成功:', result);
  } catch (error) {
    console.error('发送失败:', error);
  } finally {
    sender.destroy();
  }
}

/**
 * 示例4: 管理账号信息
 */
async function exampleAccountManagement() {
  const config = {
    corpId: 'wwxxxxxxxxxxxxxxx',
    corpSecret: 'xxxxxxxxxxxxxxxx',
    agentId: 1000001,
    enabled: true,
    dmPolicy: 'pairing' as const,
    allowFrom: ['*']
  };

  const accountManager = new WeComAccountManager(config);
  
  try {
    await accountManager.initialize();
    
    // 获取用户信息
    const user = accountManager.getAccount('zhangsan');
    if (user) {
      console.log('用户信息:', user);
    }
    
    // 搜索用户
    const results = accountManager.searchAccounts('张');
    console.log('搜索结果:', results);
    
    // 获取部门成员
    const deptUsers = accountManager.getAccountsByDepartment('技术部');
    console.log('技术部成员:', deptUsers);
    
  } catch (error) {
    console.error('账号管理失败:', error);
  } finally {
    accountManager.destroy();
  }
}

/**
 * 示例5: 使用消息适配器
 */
function exampleMessageAdapter() {
  const adapter = new WeComMessageAdapterImpl(1000001, '[AI助手] ');
  
  // 转换OpenClaw消息为企业微信消息
  const openClawMessage = {
    peer: { kind: 'dm', id: 'wangwu', name: '王五' },
    text: '请帮我查一下今天的日程',
    timestamp: Date.now(),
    id: 'msg-123',
    channel: 'wecom',
    accountId: '1000001'
  };
  
  const wecomMessage = adapter.toWeComMessage(openClawMessage);
  console.log('转换后的企业微信消息:', wecomMessage);
  
  // 解析@消息
  const mentionedUsers = adapter.extractMentionedUsers('@zhangsan @lisi 请参加会议');
  console.log('提到的用户:', mentionedUsers);
  
  // 构建@消息
  const mentionText = adapter.buildMentionText(['zhangsan', 'lisi'], '请参加会议');
  console.log('@消息文本:', mentionText);
}

/**
 * 示例6: 健康检查
 */
async function exampleHealthCheck() {
  const config = {
    corpId: 'wwxxxxxxxxxxxxxxx',
    corpSecret: 'xxxxxxxxxxxxxxxx',
    agentId: 1000001,
    enabled: true,
    dmPolicy: 'pairing' as const,
    allowFrom: ['*']
  };

  const apiClient = new WeComApiClient(config);
  
  try {
    const healthy = await apiClient.checkConnection();
    console.log('连接状态:', healthy ? '健康' : '异常');
    
    if (healthy) {
      // 获取部门列表
      const departments = await apiClient.getDepartmentList();
      console.log('部门列表:', departments);
    }
  } catch (error) {
    console.error('健康检查失败:', error);
  } finally {
    apiClient.destroy();
  }
}

// 运行示例
async function runExamples() {
  console.log('=== 企业微信插件使用示例 ===\n');
  
  console.log('1. 发送文本消息示例:');
  await exampleSendText();
  
  console.log('\n2. 发送部门消息示例:');
  await exampleSendToDepartment();
  
  console.log('\n3. 发送卡片消息示例:');
  await exampleSendCard();
  
  console.log('\n4. 账号管理示例:');
  await exampleAccountManagement();
  
  console.log('\n5. 消息适配器示例:');
  exampleMessageAdapter();
  
  console.log('\n6. 健康检查示例:');
  await exampleHealthCheck();
  
  console.log('\n=== 示例运行完成 ===');
}

// 导出示例函数
export {
  exampleSendText,
  exampleSendToDepartment,
  exampleSendCard,
  exampleAccountManagement,
  exampleMessageAdapter,
  exampleHealthCheck,
  runExamples
};
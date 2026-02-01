/**
 * 企业微信插件测试配置
 * 
 * 这个配置文件用于测试企业微信插件的配置验证
 */

// 有效的企业API配置
export const validEnterpriseConfig = {
  enabled: true,
  corpId: 'wwxxxxxxxxxxxxxxx',
  corpSecret: 'xxxxxxxxxxxxxxxx',
  agentId: 1000001,
  dmPolicy: 'pairing' as const,
  allowFrom: ['*'],
  messagePrefix: '[AI助手] ',
  timeoutMs: 10000,
  maxRetries: 3
};

// 有效的Webhook配置
export const validWebhookConfig = {
  enabled: true,
  webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx',
  dmPolicy: 'open' as const,
  allowFrom: ['user1', 'user2'],
  timeoutMs: 5000
};

// 无效配置 - 缺少必要参数
export const invalidConfigMissingParams = {
  enabled: true,
  dmPolicy: 'pairing' as const,
  // 缺少 corpId, corpSecret, agentId 和 webhookUrl
};

// 无效配置 - 同时配置了两种模式
export const invalidConfigMixedModes = {
  enabled: true,
  corpId: 'wwxxxxxxxxxxxxxxx',
  corpSecret: 'xxxxxxxxxxxxxxxx',
  agentId: 1000001,
  webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx',
  dmPolicy: 'pairing' as const,
  allowFrom: ['*']
};

// 无效配置 - 无效的企业ID格式
export const invalidConfigBadCorpId = {
  enabled: true,
  corpId: 'invalid-id', // 不以ww开头
  corpSecret: 'xxxxxxxxxxxxxxxx',
  agentId: 1000001,
  dmPolicy: 'pairing' as const,
  allowFrom: ['*']
};

// 无效配置 - 无效的AgentID
export const invalidConfigBadAgentId = {
  enabled: true,
  corpId: 'wwxxxxxxxxxxxxxxx',
  corpSecret: 'xxxxxxxxxxxxxxxx',
  agentId: -1, // 负数
  dmPolicy: 'pairing' as const,
  allowFrom: ['*']
};

// 无效配置 - 无效的Webhook URL
export const invalidConfigBadWebhookUrl = {
  enabled: true,
  webhookUrl: 'not-a-valid-url',
  dmPolicy: 'open' as const,
  allowFrom: ['*']
};

// 测试用的模拟消息
export const testMessages = {
  // 文本消息
  textMessage: {
    peer: { kind: 'dm' as const, id: 'zhangsan', name: '张三' },
    text: '你好，这是测试消息！',
    timestamp: Date.now(),
    id: 'test-msg-1',
    channel: 'wecom',
    accountId: '1000001'
  },
  
  // 带@的文本消息
  mentionMessage: {
    peer: { kind: 'dm' as const, id: 'lisi', name: '李四' },
    text: '@zhangsan @wangwu 请参加会议',
    timestamp: Date.now(),
    id: 'test-msg-2',
    channel: 'wecom',
    accountId: '1000001'
  },
  
  // 回复消息
  replyMessage: {
    peer: { kind: 'dm' as const, id: 'wangwu', name: '王五' },
    text: '这是回复消息',
    timestamp: Date.now(),
    id: 'test-msg-3',
    channel: 'wecom',
    accountId: '1000001',
    replyTo: {
      id: 'original-msg-1',
      senderName: '张三',
      text: '原始消息内容'
    }
  },
  
  // 部门消息
  departmentMessage: {
    peer: { kind: 'group' as const, id: '2', name: '技术部' },
    text: '【部门通知】请所有人参加技术评审',
    timestamp: Date.now(),
    id: 'test-msg-4',
    channel: 'wecom',
    accountId: '1000001'
  },
  
  // 带媒体文件的消息
  mediaMessage: {
    peer: { kind: 'dm' as const, id: 'zhaoliu', name: '赵六' },
    text: '请查看附件',
    timestamp: Date.now(),
    id: 'test-msg-5',
    channel: 'wecom',
    accountId: '1000001',
    media: [{
      type: 'file' as const,
      url: 'media-id-123',
      caption: '项目文档.pdf'
    }]
  }
};

// 模拟的企业微信API响应
export const mockApiResponses = {
  // 成功获取token
  successToken: {
    errcode: 0,
    errmsg: 'ok',
    access_token: 'mock-access-token-123456',
    expires_in: 7200
  },
  
  // token过期
  expiredToken: {
    errcode: 42001,
    errmsg: 'access_token已过期'
  },
  
  // 无效token
  invalidToken: {
    errcode: 40014,
    errmsg: 'access_token无效'
  },
  
  // 成功发送消息
  successSend: {
    errcode: 0,
    errmsg: 'ok',
    msgid: 'msg-id-123456'
  },
  
  // 发送频率超限
  rateLimit: {
    errcode: 45009,
    errmsg: '接口调用超过频率限制'
  },
  
  // 用户不存在
  userNotFound: {
    errcode: 60111,
    errmsg: 'UserID不存在'
  },
  
  // 部门不存在
  departmentNotFound: {
    errcode: 60123,
    errmsg: '无效的部门id'
  }
};

// 测试用的用户数据
export const mockUsers = [
  {
    userid: 'zhangsan',
    name: '张三',
    department: [1, 2],
    position: '工程师',
    mobile: '13800138001',
    email: 'zhangsan@example.com',
    avatar: 'https://example.com/avatar/zhangsan.jpg'
  },
  {
    userid: 'lisi',
    name: '李四',
    department: [2],
    position: '经理',
    mobile: '13800138002',
    email: 'lisi@example.com'
  },
  {
    userid: 'wangwu',
    name: '王五',
    department: [3],
    position: '设计师',
    mobile: '13800138003'
  }
];

// 测试用的部门数据
export const mockDepartments = [
  {
    id: 1,
    name: '公司',
    parentid: 0,
    order: 1
  },
  {
    id: 2,
    name: '技术部',
    parentid: 1,
    order: 10
  },
  {
    id: 3,
    name: '设计部',
    parentid: 1,
    order: 20
  }
];
# @openclaw/wecom

企业微信(WeCom)通道插件 for OpenClaw

## 功能特性

✅ **完整企业API支持**
- 企业微信应用消息API
- 支持文本、图片、文件、图文等多种消息类型
- @成员功能
- 部门/用户管理

✅ **消息收发**
- 接收员工消息
- 发送回复消息
- 支持群聊和私聊

✅ **安全配置**
- DM配对机制
- 允许列表控制
- 访问令牌自动刷新

✅ **企业级功能**
- 部门消息定向发送
- 标签群发
- 消息卡片和模板

## 安装

### 本地开发安装
```bash
openclaw plugins install ./wecom-plugin
```

### NPM安装（发布后）
```bash
openclaw plugins install @openclaw/wecom
```

## 配置示例

### 企业API模式（推荐）
```json5
{
  channels: {
    wecom: {
      enabled: true,
      corpId: "wwxxxxxxxxxxxxxxx",    // 企业ID
      corpSecret: "xxxxxxxxxxxxxxxx", // 应用Secret
      agentId: 1000001,               // 应用AgentID
      dmPolicy: "pairing",            // 私聊策略
      allowFrom: ["*"],               // 允许所有用户
      
      // 可选：代理设置
      proxy: "http://proxy.local:8080",
      
      // 可选：消息前缀
      messagePrefix: "[AI助手] "
    }
  }
}
```

### Webhook模式（简化版）
```json5
{
  channels: {
    wecom: {
      enabled: true,
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx",
      dmPolicy: "open"
    }
  }
}
```

## 企业微信配置步骤

1. **登录企业微信管理后台**
2. **创建应用**：应用管理 → 创建应用
3. **获取凭据**：
   - 企业ID (corpId)
   - 应用Secret (corpSecret)
   - 应用AgentID (agentId)
4. **配置可信IP**（如果需要）
5. **启用API接收消息**（回调模式可选）

## 使用场景

### 1. IT运维助手
- 员工咨询IT问题
- 自动创建工单
- 推送系统通知

### 2. 销售智能助手
- 客户信息查询
- 销售数据报表
- 潜在客户提醒

### 3. HR人力资源助手
- 假期余额查询
- 政策咨询
- 工资单查询

### 4. 项目协同助手
- 项目进度查询
- 任务状态更新
- 会议提醒

## 消息格式支持

| 类型 | 支持 | 说明 |
|------|------|------|
| 文本 | ✅ | 支持@成员 |
| 图片 | ✅ | 支持临时素材上传 |
| 文件 | ✅ | 支持临时素材上传 |
| 图文 | ✅ | 支持链接卡片 |
| Markdown | ✅ | 通过Webhook模式 |
| 任务卡片 | ✅ | 企业微信4.0+ |

## 开发

```bash
# 安装依赖
pnpm install

# 构建
pnpm build

# 开发模式
pnpm dev
```

## 许可证

MIT
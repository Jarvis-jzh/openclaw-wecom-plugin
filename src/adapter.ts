import type {
  ChannelMessage,
  ChannelMedia,
  ChannelPeer
} from 'openclaw/plugin-sdk';
import type {
  WeComSendMessageParams,
  WeComReceivedMessage,
  WeComMessageType,
  WeComMessageContent,
  WeComMessageAdapter
} from './types.js';

/**
 * 企业微信消息适配器
 */
export class WeComMessageAdapterImpl implements WeComMessageAdapter {
  private agentId: number;
  private messagePrefix?: string;
  
  constructor(agentId: number, messagePrefix?: string) {
    this.agentId = agentId;
    this.messagePrefix = messagePrefix;
  }
  
  /**
   * 将OpenClaw消息转换为企业微信消息
   */
  toWeComMessage(msg: ChannelMessage): WeComSendMessageParams {
    const { peer, text, media, replyTo } = msg;
    
    // 构建接收方
    let touser: string | undefined;
    let toparty: string | undefined;
    
    if (peer.kind === 'dm') {
      touser = peer.id;
    } else if (peer.kind === 'group') {
      // 企业微信中，群聊通常使用部门或标签
      // 这里假设群聊ID是部门ID
      toparty = peer.id;
    }
    
    // 添加消息前缀
    let contentText = text || '';
    if (this.messagePrefix && !contentText.startsWith(this.messagePrefix)) {
      contentText = this.messagePrefix + contentText;
    }
    
    // 处理回复引用
    if (replyTo) {
      contentText = `回复 ${replyTo.senderName || '用户'}:\n${contentText}`;
    }
    
    // 处理媒体消息
    if (media && media.length > 0) {
      const mediaItem = media[0];
      return this.createMediaMessage(mediaItem, touser, toparty);
    }
    
    // 创建文本消息
    return {
      touser,
      toparty,
      msgtype: 'text',
      agentid: this.agentId,
      content: {
        content: contentText
      }
    };
  }
  
  /**
   * 创建媒体消息
   */
  private createMediaMessage(
    media: ChannelMedia,
    touser?: string,
    toparty?: string
  ): WeComSendMessageParams {
    const { type, url, caption } = media;
    
    let msgtype: WeComMessageType;
    let content: WeComMessageContent = {};
    
    switch (type) {
      case 'image':
        msgtype = 'image';
        content = {
          media_id: url // 假设url是media_id
        };
        break;
        
      case 'video':
        msgtype = 'video';
        content = {
          media_id: url
        };
        break;
        
      case 'audio':
        msgtype = 'voice';
        content = {
          media_id: url
        };
        break;
        
      case 'file':
        msgtype = 'file';
        content = {
          media_id: url
        };
        break;
        
      default:
        msgtype = 'text';
        content = {
          content: `[${type}] ${url}${caption ? '\n' + caption : ''}`
        };
    }
    
    // 如果有文字说明，添加到媒体消息中
    if (caption && type !== 'file') {
      // 企业微信中，可以为媒体消息添加文字说明
      content.content = caption;
    }
    
    return {
      touser,
      toparty,
      msgtype,
      agentid: this.agentId,
      content
    };
  }
  
  /**
   * 将企业微信消息转换为OpenClaw消息
   */
  fromWeComMessage(msg: WeComReceivedMessage): ChannelMessage {
    const {
      FromUserName: userId,
      CreateTime: timestamp,
      MsgType: msgType,
      MsgId: messageId,
      AgentID: agentId,
      Content: content,
      MediaId: mediaId,
      PicUrl: picUrl
    } = msg;
    
    // 确定消息类型
    const peer: ChannelPeer = {
      kind: 'dm', // 企业微信中，所有消息都是通过应用发送，暂时都当作私聊
      id: userId,
      name: userId // 实际实现中应该获取用户名
    };
    
    // 构建基础消息
    const channelMessage: ChannelMessage = {
      peer,
      timestamp: timestamp * 1000, // 转换为毫秒
      id: messageId,
      channel: 'wecom',
      accountId: agentId.toString()
    };
    
    // 根据消息类型添加内容
    switch (msgType) {
      case 'text':
        if (content) {
          channelMessage.text = content;
          
          // 检查是否是@消息
          const mentionMatch = content.match(/@(\w+)/);
          if (mentionMatch) {
            channelMessage.mentions = [{
              userId: mentionMatch[1],
              name: mentionMatch[1]
            }];
          }
        }
        break;
        
      case 'image':
        if (mediaId || picUrl) {
          channelMessage.media = [{
            type: 'image',
            url: mediaId || picUrl || '',
            caption: content
          }];
        }
        break;
        
      case 'voice':
        if (mediaId) {
          channelMessage.media = [{
            type: 'audio',
            url: mediaId,
            caption: content
          }];
        }
        break;
        
      case 'video':
        if (mediaId) {
          channelMessage.media = [{
            type: 'video',
            url: mediaId,
            caption: content
          }];
        }
        break;
        
      case 'file':
        if (mediaId) {
          channelMessage.media = [{
            type: 'file',
            url: mediaId,
            caption: content
          }];
        }
        break;
        
      case 'location':
        channelMessage.text = `位置: ${msg.Label || '未知位置'}`;
        channelMessage.location = {
          latitude: msg.Location_X || 0,
          longitude: msg.Location_Y || 0
        };
        break;
        
      default:
        channelMessage.text = `[${msgType}] ${content || '未知消息类型'}`;
    }
    
    // 处理事件消息
    if (msg.Event) {
      channelMessage.event = {
        type: msg.Event,
        data: msg.EventKey ? { key: msg.EventKey } : {}
      };
      
      // 常见事件类型
      switch (msg.Event) {
        case 'subscribe':
          channelMessage.text = '用户关注了应用';
          break;
        case 'unsubscribe':
          channelMessage.text = '用户取消关注应用';
          break;
        case 'enter_agent':
          channelMessage.text = '用户进入了应用';
          break;
      }
    }
    
    return channelMessage;
  }
  
  /**
   * 解析@消息中的用户ID
   */
  extractMentionedUsers(text: string): string[] {
    const mentions: string[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }
  
  /**
   * 构建@消息文本
   */
  buildMentionText(userIds: string[], text: string): string {
    if (userIds.length === 0) {
      return text;
    }
    
    const mentions = userIds.map(id => `@${id}`).join(' ');
    return `${mentions}\n${text}`;
  }
  
  /**
   * 构建部门消息
   */
  buildDepartmentMessage(
    departmentIds: number[],
    text: string,
    includeSubDepartments: boolean = false
  ): WeComSendMessageParams {
    return {
      toparty: departmentIds.join('|'),
      msgtype: 'text',
      agentid: this.agentId,
      content: {
        content: text
      }
    };
  }
  
  /**
   * 构建卡片消息
   */
  buildCardMessage(
    title: string,
    description: string,
    url: string,
    btntxt: string = '查看详情',
    touser?: string,
    toparty?: string
  ): WeComSendMessageParams {
    return {
      touser,
      toparty,
      msgtype: 'textcard',
      agentid: this.agentId,
      content: {
        title,
        description,
        url,
        btntxt
      }
    };
  }
  
  /**
   * 构建图文消息
   */
  buildNewsMessage(
    articles: Array<{
      title: string;
      description: string;
      url: string;
      picurl: string;
    }>,
    touser?: string,
    toparty?: string
  ): WeComSendMessageParams {
    return {
      touser,
      toparty,
      msgtype: 'news',
      agentid: this.agentId,
      content: {
        // 企业微信图文消息格式特殊，这里简化处理
        content: articles.map(article => 
          `【${article.title}】\n${article.description}\n${article.url}`
        ).join('\n\n')
      }
    };
  }
}
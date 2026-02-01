import type { WeComConfig } from './types.js';
import { WeComApiClient } from './api.js';

/**
 * 企业微信账号管理器
 */
export class WeComAccountManager {
  private config: WeComConfig;
  private apiClient: WeComApiClient | null = null;
  private accounts = new Map<string, AccountInfo>();
  
  constructor(config: WeComConfig) {
    this.config = config;
    
    if (config.corpId && config.corpSecret) {
      this.apiClient = new WeComApiClient(config);
    }
  }
  
  /**
   * 初始化账号管理器
   */
  async initialize(): Promise<void> {
    if (this.apiClient) {
      await this.apiClient.initialize();
      await this.loadAccounts();
    }
  }
  
  /**
   * 加载账号信息
   */
  private async loadAccounts(): Promise<void> {
    if (!this.apiClient) {
      return;
    }
    
    try {
      // 获取根部门
      const departments = await this.apiClient.getDepartmentList();
      if (departments.errcode === 0 && departments.department) {
        for (const dept of departments.department) {
          // 获取部门成员
          const users = await this.apiClient.getDepartmentUsers(dept.id);
          if (users.errcode === 0 && users.userlist) {
            for (const user of users.userlist) {
              this.accounts.set(user.userid, {
                id: user.userid,
                name: user.name,
                department: dept.name,
                position: user.position,
                mobile: user.mobile,
                email: user.email,
                avatar: user.avatar,
                lastActive: Date.now()
              });
            }
          }
        }
      }
      
      console.log(`加载了 ${this.accounts.size} 个企业微信账号`);
    } catch (error) {
      console.error('加载账号信息失败:', error);
    }
  }
  
  /**
   * 获取账号信息
   */
  getAccount(userId: string): AccountInfo | undefined {
    return this.accounts.get(userId);
  }
  
  /**
   * 更新账号信息
   */
  updateAccount(userId: string, updates: Partial<AccountInfo>): void {
    const existing = this.accounts.get(userId);
    if (existing) {
      this.accounts.set(userId, { ...existing, ...updates });
    } else {
      this.accounts.set(userId, {
        id: userId,
        name: updates.name || userId,
        department: updates.department || '',
        ...updates,
        lastActive: Date.now()
      });
    }
  }
  
  /**
   * 搜索账号
   */
  searchAccounts(query: string): AccountInfo[] {
    const results: AccountInfo[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const account of this.accounts.values()) {
      if (
        account.id.toLowerCase().includes(lowerQuery) ||
        account.name.toLowerCase().includes(lowerQuery) ||
        account.department.toLowerCase().includes(lowerQuery)
      ) {
        results.push(account);
      }
    }
    
    return results;
  }
  
  /**
   * 获取部门下的账号
   */
  getAccountsByDepartment(departmentName: string): AccountInfo[] {
    const results: AccountInfo[] = [];
    
    for (const account of this.accounts.values()) {
      if (account.department === departmentName) {
        results.push(account);
      }
    }
    
    return results;
  }
  
  /**
   * 清理不活跃账号
   */
  cleanupInactiveAccounts(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [userId, account] of this.accounts.entries()) {
      if (now - account.lastActive > maxAgeMs) {
        toDelete.push(userId);
      }
    }
    
    for (const userId of toDelete) {
      this.accounts.delete(userId);
    }
    
    if (toDelete.length > 0) {
      console.log(`清理了 ${toDelete.length} 个不活跃账号`);
    }
  }
  
  /**
   * 导出账号数据
   */
  exportAccounts(): AccountInfo[] {
    return Array.from(this.accounts.values());
  }
  
  /**
   * 导入账号数据
   */
  importAccounts(accounts: AccountInfo[]): void {
    for (const account of accounts) {
      this.accounts.set(account.id, account);
    }
  }
  
  /**
   * 销毁资源
   */
  destroy(): void {
    if (this.apiClient) {
      this.apiClient.destroy();
    }
    this.accounts.clear();
  }
}

/**
 * 账号信息
 */
export interface AccountInfo {
  id: string;
  name: string;
  department: string;
  position?: string;
  mobile?: string;
  email?: string;
  avatar?: string;
  lastActive: number;
  metadata?: Record<string, any>;
}
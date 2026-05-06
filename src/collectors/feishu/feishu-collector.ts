import { MemoryItem, PlatformSource } from '../../types/index.js';
import { Logger } from '../../utils/logger.js';
import { AiService } from '../../ai/ai-service.js';

export interface FeishuCollectorConfig {
  appId: string;
  appSecret: string;
  tenantAccessToken?: string;
}

interface FeishuDocItem {
  document_id: string;
  title: string;
  url: string;
  modified_time: string;
}

interface FeishuMinutesItem {
  meeting_id: string;
  subject: string;
  url: string;
  meeting_start_time: string;
}

interface FeishuCalendarItem {
  event_id: string;
  summary: string;
  url: string;
  start_time: string;
}

export class FeishuCollector {
  private logger: Logger;
  private aiService: AiService;
  private config: FeishuCollectorConfig;

  constructor(logger: Logger, aiService: AiService, config: FeishuCollectorConfig) {
    this.logger = logger;
    this.aiService = aiService;
    this.config = config;
  }

  async collectDocs(_since?: string): Promise<MemoryItem[]> {
    this.logger.info('Collecting Feishu docs...');
    try {
      const token = await this.getAccessToken();
      const docs = await this.fetchDocs(token, _since);
      const items: MemoryItem[] = [];
      for (const doc of docs) {
        const summary = await this.aiService.summarize(doc.title);
        const now = new Date().toISOString();
        items.push({
          id: `xiaji-${doc.document_id.slice(0, 10)}`,
          source: 'feishu-doc' as PlatformSource,
          url: doc.url,
          time: doc.modified_time,
          platform: '飞书文档',
          title: doc.title,
          summary,
          tags: ['feishu', 'doc'],
          created_at: now,
          updated_at: now,
        });
      }
      this.logger.info(`Collected ${items.length} Feishu docs`);
      return items;
    } catch (err) {
      this.logger.error(`Failed to collect Feishu docs: ${String(err)}`);
      throw err;
    }
  }

  async collectMinutes(_since?: string): Promise<MemoryItem[]> {
    this.logger.info('Collecting Feishu minutes...');
    try {
      const token = await this.getAccessToken();
      const minutes = await this.fetchMinutes(token, _since);
      const items: MemoryItem[] = [];
      for (const m of minutes) {
        const summary = await this.aiService.summarize(m.subject);
        const now = new Date().toISOString();
        items.push({
          id: `xiaji-${m.meeting_id.slice(0, 10)}`,
          source: 'feishu-minutes' as PlatformSource,
          url: m.url,
          time: m.meeting_start_time,
          platform: '飞书妙记',
          title: m.subject,
          summary,
          tags: ['feishu', 'meeting'],
          created_at: now,
          updated_at: now,
        });
      }
      this.logger.info(`Collected ${items.length} Feishu minutes`);
      return items;
    } catch (err) {
      this.logger.error(`Failed to collect Feishu minutes: ${String(err)}`);
      throw err;
    }
  }

  async collectCalendar(_since?: string): Promise<MemoryItem[]> {
    this.logger.info('Collecting Feishu calendar...');
    try {
      const token = await this.getAccessToken();
      const events = await this.fetchCalendar(token, _since);
      const items: MemoryItem[] = [];
      for (const e of events) {
        const summary = await this.aiService.summarize(e.summary);
        const now = new Date().toISOString();
        items.push({
          id: `xiaji-${e.event_id.slice(0, 10)}`,
          source: 'feishu-calendar' as PlatformSource,
          url: e.url,
          time: e.start_time,
          platform: '飞书日历',
          title: e.summary,
          summary,
          tags: ['feishu', 'calendar'],
          created_at: now,
          updated_at: now,
        });
      }
      this.logger.info(`Collected ${items.length} Feishu calendar events`);
      return items;
    } catch (err) {
      this.logger.error(`Failed to collect Feishu calendar: ${String(err)}`);
      throw err;
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.config.tenantAccessToken) return this.config.tenantAccessToken;
    const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to get Feishu access token: ${response.status}`);
    }
    const data = await response.json() as {
      code: number;
      tenant_access_token: string;
    };
    if (data.code !== 0) {
      throw new Error(`Feishu API error: code ${data.code}`);
    }
    this.config.tenantAccessToken = data.tenant_access_token;
    return data.tenant_access_token;
  }

  private async fetchDocs(token: string, _since?: string): Promise<FeishuDocItem[]> {
    const url = 'https://open.feishu.cn/open-apis/drive/v1/files';
    const params = new URLSearchParams({ page_size: '50' });
    const response = await fetch(`${url}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Feishu docs API failed: ${response.status}`);
    const data = await response.json() as {
      data: { files: Array<{ token: string; name: string; url: string; modified_time: string }> };
    };
    return (data.data?.files || []).map(f => ({
      document_id: f.token,
      title: f.name,
      url: f.url,
      modified_time: f.modified_time,
    }));
  }

  private async fetchMinutes(token: string, _since?: string): Promise<FeishuMinutesItem[]> {
    const url = 'https://open.feishu.cn/open-apis/vc/v1/meetings';
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Feishu minutes API failed: ${response.status}`);
    const data = await response.json() as {
      data: { meeting_list: Array<{ id: string; subject: string; url: string; meeting_start_time: string }> };
    };
    return (data.data?.meeting_list || []).map(m => ({
      meeting_id: m.id,
      subject: m.subject,
      url: m.url,
      meeting_start_time: m.meeting_start_time,
    }));
  }

  private async fetchCalendar(token: string, _since?: string): Promise<FeishuCalendarItem[]> {
    const url = 'https://open.feishu.cn/open-apis/calendar/v4/calendars/primary/events';
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Feishu calendar API failed: ${response.status}`);
    const data = await response.json() as {
      data: { items: Array<{ event_id: string; summary: string; html_link: string; start: { dateTime: string } }> };
    };
    return (data.data?.items || []).map(e => ({
      event_id: e.event_id,
      summary: e.summary || '无标题',
      url: e.html_link,
      start_time: e.start?.dateTime || '',
    }));
  }
}

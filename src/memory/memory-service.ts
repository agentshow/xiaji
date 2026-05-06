import { MemoryItem, SyncOutput, SyncError, QueryOutput, AddOutput, ListOutput, PlatformSource } from '../types/index';
import { StorageService } from '../storage/storage';
import { ConfigService } from '../config/config-service';
import { FeishuCollector } from '../collectors/feishu/feishu-collector';
import { AiService } from '../ai/ai-service';
import { Logger } from '../utils/logger';
import { generateId } from '../utils/crypto';

export class MemoryService {
  private storage: StorageService;
  private config: ConfigService;
  private feishuCollector: FeishuCollector | null;
  private aiService: AiService;
  private logger: Logger;

  constructor(
    storage: StorageService,
    config: ConfigService,
    aiService: AiService,
    logger: Logger,
    feishuCollector: FeishuCollector | null = null,
  ) {
    this.storage = storage;
    this.config = config;
    this.aiService = aiService;
    this.logger = logger;
    this.feishuCollector = feishuCollector;
  }

  async sync(platforms?: PlatformSource[], _force: boolean = false): Promise<SyncOutput> {
    const startTime = new Date().toISOString();
    const errors: SyncError[] = [];
    const platformCounts: Record<string, number> = {};
    let totalCount = 0;
    const targetPlatforms = platforms || this.config.getSyncPlatforms();
    for (const platform of targetPlatforms) {
      try {
        if (platform === 'feishu-doc' && this.feishuCollector) {
          const items = await this.feishuCollector.collectDocs();
          for (const item of items) {
            this.storage.saveMemory(item);
          }
          platformCounts[platform] = items.length;
          totalCount += items.length;
        } else if (platform === 'feishu-minutes' && this.feishuCollector) {
          const items = await this.feishuCollector.collectMinutes();
          for (const item of items) {
            this.storage.saveMemory(item);
          }
          platformCounts[platform] = items.length;
          totalCount += items.length;
        } else if (platform === 'feishu-calendar' && this.feishuCollector) {
          const items = await this.feishuCollector.collectCalendar();
          for (const item of items) {
            this.storage.saveMemory(item);
          }
          platformCounts[platform] = items.length;
          totalCount += items.length;
        } else {
          this.logger.warn(`Platform ${platform} not supported or collector not available`);
        }
      } catch (err) {
        const msg = String(err);
        this.logger.error(`Sync failed for ${platform}: ${msg}`);
        errors.push({
          platform,
          code: msg.includes('token') || msg.includes('auth') ? 'SYNC_TOKEN_EXPIRED' : 'SYNC_PLATFORM_FAILED',
          message: msg,
        });
      }
    }
    this.config.updateLastSync(startTime);
    return {
      success: errors.length === 0,
      count: totalCount,
      errors,
      platformCounts,
      timestamp: startTime,
    };
  }

  async query(text: string, options: {
    timeRange?: { start?: string; end?: string };
    platforms?: PlatformSource[];
    limit?: number;
  }): Promise<QueryOutput> {
    const startTime = Date.now();
    const results = this.storage.searchMemories(text, {
      timeRange: options.timeRange,
      platforms: options.platforms,
      limit: options.limit,
    });
    return {
      success: true,
      query: text,
      total: results.length,
      results,
      took_ms: Date.now() - startTime,
    };
  }

  async add(content: string, options: {
    time?: string;
    platform?: string;
    tags?: string[];
  } = {}): Promise<AddOutput> {
    if (!content || content.trim().length === 0) {
      throw new Error('ADD_INVALID_CONTENT');
    }
    const now = new Date().toISOString();
    const id = generateId();
    const title = await this.aiService.generateTitle(content);
    const summary = await this.aiService.summarize(content);
    const item: MemoryItem = {
      id,
      source: 'manual' as PlatformSource,
      url: '',
      time: options.time || now,
      platform: options.platform || 'manual',
      title,
      summary,
      tags: options.tags || [],
      created_at: now,
      updated_at: now,
    };
    this.storage.saveMemory(item);
    return {
      success: true,
      id,
      filePath: `~/xiaji/by-time/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().toISOString().slice(0, 10)}.md`,
      timestamp: now,
    };
  }

  list(options: {
    timeRange?: { start?: string; end?: string };
    platforms?: PlatformSource[];
    limit?: number;
    offset?: number;
  }): ListOutput {
    const result = this.storage.listMemories(options);
    return {
      success: true,
      items: result.items,
      total: result.total,
      hasMore: result.hasMore,
    };
  }
}

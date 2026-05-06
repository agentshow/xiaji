import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { MemoryService } from '../../src/memory/memory-service';
import { StorageService } from '../../src/storage/storage';
import { ConfigService } from '../../src/config/config-service';
import { AiService } from '../../src/ai/ai-service';
import { Logger, LogLevel } from '../../src/utils/logger';

describe('Integration: MemoryService + Storage + Config', () => {
  let memoryService: MemoryService;
  let storage: StorageService;
  let config: ConfigService;
  let aiService: AiService;
  let logger: Logger;
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `xiaji-integration-${Date.now()}`);
    configPath = path.join(tmpDir, 'config.json');
    logger = new Logger(tmpDir, LogLevel.DEBUG);
    config = new ConfigService(configPath, logger);
    config.init();
    config.setStoragePath(tmpDir);
    storage = new StorageService(tmpDir, logger);
    aiService = new AiService(logger, { apiKey: '' });
    vi.spyOn(aiService, 'generateTitle').mockImplementation(async (c: string) => c.slice(0, 30));
    vi.spyOn(aiService, 'summarize').mockImplementation(async (c: string) => `摘要: ${c.slice(0, 50)}`);
    memoryService = new MemoryService(storage, config, aiService, logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('完整记忆生命周期', () => {
    it('TC-001: 首次 sync 无数据时应返回 count=0', async () => {
      const result = await memoryService.sync();
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it('TC-006: 手动 add 记忆后应正确写入并可通过 list 查询', async () => {
      const addResult = await memoryService.add('今天完成了虾记集成测试', {
        tags: ['test', 'integration'],
      });
      expect(addResult.success).toBe(true);
      expect(addResult.id).toMatch(/^xiaji-/);

      const listResult = memoryService.list({});
      expect(listResult.items.length).toBe(1);
      expect(listResult.items[0].platform).toBe('manual');
      expect(listResult.items[0].title).toContain('虾记');
    });

    it('TC-005: query 无匹配时应返回空数组', async () => {
      await memoryService.add('测试内容');
      const result = await memoryService.query('不存在的关键词', {});
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(0);
    });

    it('应支持按平台筛选 list', async () => {
      await memoryService.add('飞书相关记忆', { platform: 'feishu' });
      await memoryService.add('手动记忆', { platform: 'manual' });
      const result = memoryService.list({ platforms: ['manual'] });
      expect(result.items.length).toBe(2);
      expect(result.items[0].platform).toBeDefined();
    });

    it('应支持按时间筛选 list', async () => {
      await memoryService.add('今天的记忆');
      await memoryService.add('昨天的记忆', { time: '2026-01-01T12:00:00+08:00' });
      const result = memoryService.list({ timeRange: { start: '2026-05-01', end: '2026-05-31' } });
      expect(result.items.length).toBe(1);
    });

    it('应支持分页查询', async () => {
      for (let i = 0; i < 5; i++) {
        await memoryService.add(`记忆${i}`);
      }
      const page1 = memoryService.list({ limit: 2, offset: 0 });
      const page2 = memoryService.list({ limit: 2, offset: 2 });
      expect(page1.items.length).toBe(2);
      expect(page2.items.length).toBe(2);
      expect(page1.items[0].id).not.toBe(page2.items[0].id);
    });
  });

  describe('存储层验证', () => {
    it('应同时写入 by-platform 和 by-time 两个目录', async () => {
      const result = await memoryService.add('双目录写入测试');
      const platformDir = path.join(tmpDir, 'by-platform', 'manual');
      const timeDir = path.join(tmpDir, 'by-time');
      expect(fs.existsSync(platformDir)).toBe(true);
      expect(fs.existsSync(timeDir)).toBe(true);
      const platformFiles = fs.readdirSync(platformDir);
      expect(platformFiles.length).toBeGreaterThan(0);
    });

    it('getStorageInfo 应返回正确的文件统计', async () => {
      await memoryService.add('第一条');
      await memoryService.add('第二条');
      const info = storage.getStorageInfo();
      expect(info.totalFiles).toBe(2);
      expect(info.totalSize).toBeGreaterThan(0);
    });
  });

  describe('配置层验证', () => {
    it('配置应正确持久化', () => {
      config.setApiKey('test-key');
      const cfg = config.get();
      expect(cfg.apiKey).toBe('test-key');
      const rawContent = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(rawContent);
      expect(parsed.apiKey).toBe('test-key');
    });

    it('Token 应加密存储', () => {
      config.setPlatformToken('feishu', 'secret-token-123');
      const rawContent = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(rawContent);
      expect(parsed.platforms.feishu.token).not.toBe('secret-token-123');
    });
  });
});

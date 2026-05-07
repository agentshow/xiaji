import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { MemoryService } from '../../src/memory/memory-service';
import { StorageService } from '../../src/storage/storage';
import { ConfigService } from '../../src/config/config-service';
import { Logger, LogLevel } from '../../src/utils/logger';

describe('MemoryService', () => {
  let memoryService: MemoryService;
  let storage: StorageService;
  let config: ConfigService;
  let logger: Logger;
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `xiaji-memory-test-${Date.now()}`);
    configPath = path.join(tmpDir, 'config.json');
    logger = new Logger(tmpDir, LogLevel.DEBUG);
    config = new ConfigService(configPath, logger);
    config.init();
    config.setStoragePath(tmpDir);
    storage = new StorageService(tmpDir, logger);
    memoryService = new MemoryService(storage, config, logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('add', () => {
    it('should add a memory item', async () => {
      const result = await memoryService.add('今天完成了虾记开发', {
        tags: ['work', 'xiaji'],
      });
      expect(result.success).toBe(true);
      expect(result.id).toMatch(/^xiaji-/);
      expect(result.filePath).toContain('by-time');
    });

    it('should throw error for empty content', async () => {
      await expect(memoryService.add('')).rejects.toThrow('ADD_INVALID_CONTENT');
    });

    it('should throw error for whitespace-only content', async () => {
      await expect(memoryService.add('   ')).rejects.toThrow('ADD_INVALID_CONTENT');
    });

    it('should use custom time when provided', async () => {
      const result = await memoryService.add('测试内容', {
        time: '2026-01-01T12:00:00+08:00',
      });
      expect(result.success).toBe(true);
      const item = storage.getMemory(result.id);
      expect(item).not.toBeNull();
      expect(item!.time).toBe('2026-01-01T12:00:00+08:00');
    });
  });

  describe('list', () => {
    it('should list added memories', async () => {
      await memoryService.add('第一条记忆');
      await memoryService.add('第二条记忆');
      const result = memoryService.list({});
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(2);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await memoryService.add(`记忆${i}`);
      }
      const result = memoryService.list({ limit: 2, offset: 0 });
      expect(result.items.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('query', () => {
    it('should query memories by text', async () => {
      await memoryService.add('虾记产品开发');
      await memoryService.add('周报汇总');
      const result = await memoryService.query('虾记', {});
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(1);
      expect(result.results[0].title).toContain('虾记');
    });

    it('should return empty for no matches', async () => {
      await memoryService.add('测试内容');
      const result = await memoryService.query('不存在的关键词', {});
      expect(result.results.length).toBe(0);
    });
  });

  describe('sync', () => {
    it('should handle sync with no collectors gracefully', async () => {
      const result = await memoryService.sync();
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });
  });
});

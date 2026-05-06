import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { StorageService } from '../../src/storage/storage';
import { Logger, LogLevel } from '../../src/utils/logger';
import { MemoryItem, PlatformSource } from '../../src/types/index';

describe('StorageService', () => {
  let storage: StorageService;
  let logger: Logger;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `xiaji-test-${Date.now()}`);
    logger = new Logger(tmpDir, LogLevel.DEBUG);
    storage = new StorageService(tmpDir, logger);
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const createTestItem = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({
    id: 'xiaji-2026-05-07-001',
    source: 'feishu-doc' as PlatformSource,
    url: 'https://example.com/doc/1',
    time: '2026-05-07T10:00:00+08:00',
    platform: '飞书文档',
    title: '测试文档',
    summary: '这是一个测试摘要',
    tags: ['test', 'doc'],
    created_at: '2026-05-07T10:00:00+08:00',
    updated_at: '2026-05-07T10:00:00+08:00',
    ...overrides,
  });

  describe('saveMemory', () => {
    it('should save a memory item to by-platform directory', () => {
      const item = createTestItem();
      storage.saveMemory(item);
      const platformFile = path.join(tmpDir, 'by-platform', 'feishu-doc', `${item.id}.md`);
      expect(fs.existsSync(platformFile)).toBe(true);
    });

    it('should save a memory item to by-time directory', () => {
      const item = createTestItem();
      storage.saveMemory(item);
      const timeFile = path.join(tmpDir, 'by-time', '2026', '05', '2026-05-07.md');
      expect(fs.existsSync(timeFile)).toBe(true);
    });

    it('should save multiple items to the same time file', () => {
      const item1 = createTestItem({ id: 'xiaji-2026-05-07-001' });
      const item2 = createTestItem({ id: 'xiaji-2026-05-07-002', title: '第二个文档' });
      storage.saveMemory(item1);
      storage.saveMemory(item2);
      const timeFile = path.join(tmpDir, 'by-time', '2026', '05', '2026-05-07.md');
      const content = fs.readFileSync(timeFile, 'utf-8');
      expect(content).toContain('测试文档');
      expect(content).toContain('第二个文档');
    });
  });

  describe('getMemory', () => {
    it('should retrieve a saved memory by id', () => {
      const item = createTestItem();
      storage.saveMemory(item);
      const retrieved = storage.getMemory(item.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.title).toBe('测试文档');
      expect(retrieved!.source).toBe('feishu-doc');
    });

    it('should return null for non-existent memory', () => {
      const retrieved = storage.getMemory('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('listMemories', () => {
    it('should list all memories', () => {
      storage.saveMemory(createTestItem({ id: 'xiaji-2026-05-07-001' }));
      storage.saveMemory(createTestItem({ id: 'xiaji-2026-05-07-002', title: '第二个' }));
      const result = storage.listMemories({});
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by platform', () => {
      storage.saveMemory(createTestItem({ id: 'xiaji-2026-05-07-001', source: 'feishu-doc' }));
      storage.saveMemory(createTestItem({ id: 'xiaji-2026-05-07-002', source: 'manual', platform: 'manual' }));
      const result = storage.listMemories({ platforms: ['feishu-doc'] });
      expect(result.items.length).toBe(1);
    });

    it('should support pagination', () => {
      for (let i = 1; i <= 5; i++) {
        storage.saveMemory(createTestItem({
          id: `xiaji-2026-05-07-00${i}`,
          title: `文档${i}`,
          time: `2026-05-07T0${i}:00:00+08:00`,
        }));
      }
      const result = storage.listMemories({ limit: 2, offset: 0 });
      expect(result.items.length).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('searchMemories', () => {
    it('should search by title', () => {
      storage.saveMemory(createTestItem({ id: 'xiaji-2026-05-07-001', title: '虾记产品方案' }));
      storage.saveMemory(createTestItem({ id: 'xiaji-2026-05-07-002', title: '周报汇总' }));
      const results = storage.searchMemories('虾记', {});
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('虾记产品方案');
    });

    it('should search by summary', () => {
      storage.saveMemory(createTestItem({
        id: 'xiaji-2026-05-07-001',
        title: '测试',
        summary: '包含虾记关键词的摘要',
      }));
      const results = storage.searchMemories('虾记', {});
      expect(results.length).toBe(1);
    });

    it('should search by tags', () => {
      storage.saveMemory(createTestItem({
        id: 'xiaji-2026-05-07-001',
        title: '测试',
        tags: ['important', 'work'],
      }));
      const results = storage.searchMemories('important', {});
      expect(results.length).toBe(1);
    });

    it('should return empty for no matches', () => {
      storage.saveMemory(createTestItem({ id: 'xiaji-2026-05-07-001' }));
      const results = storage.searchMemories('不存在的关键词', {});
      expect(results.length).toBe(0);
    });
  });

  describe('getStorageInfo', () => {
    it('should return correct file count and size', () => {
      storage.saveMemory(createTestItem({ id: 'xiaji-2026-05-07-001' }));
      storage.saveMemory(createTestItem({ id: 'xiaji-2026-05-07-002' }));
      const info = storage.getStorageInfo();
      expect(info.totalFiles).toBe(2);
      expect(info.totalSize).toBeGreaterThan(0);
    });
  });
});

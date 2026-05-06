import * as fs from 'node:fs';
import * as path from 'node:path';
import { MemoryItem, MemorySummary, PlatformSource } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { getTimePath, getDateFileName, parseDate } from '../utils/date.js';

export class StorageService {
  private basePath: string;
  private logger: Logger;

  constructor(basePath: string, logger: Logger) {
    this.basePath = basePath;
    this.logger = logger;
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      path.join(this.basePath, 'by-platform'),
      path.join(this.basePath, 'by-time'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private getPlatformDir(source: PlatformSource): string {
    const dir = path.join(this.basePath, 'by-platform', source);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private getTimeFilePath(date: Date): string {
    const timeDir = path.join(this.basePath, 'by-time', getTimePath(date));
    if (!fs.existsSync(timeDir)) {
      fs.mkdirSync(timeDir, { recursive: true });
    }
    return path.join(timeDir, getDateFileName(date));
  }

  private serializeMemory(item: MemoryItem): string {
    const frontmatter: Record<string, unknown> = {
      id: item.id,
      source: item.source,
      url: item.url,
      time: item.time,
      platform: item.platform,
      title: item.title,
      tags: item.tags,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
    if (item.summary) {
      frontmatter.summary = item.summary;
    }
    const yaml = Object.entries(frontmatter)
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          return `${k}: [${v.join(', ')}]`;
        }
        return `${k}: "${v}"`;
      })
      .join('\n');
    return `---\n${yaml}\n---\n\n${item.title}\n`;
  }

  private deserializeMemory(content: string): MemoryItem | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const yamlBlock = match[1];
    const fields: Record<string, string> = {};
    for (const line of yamlBlock.split('\n')) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (kv) {
        fields[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1').trim();
      }
    }
    if (!fields.id || !fields.source || !fields.time) return null;
    const tagsStr = fields.tags || '';
    const tags = tagsStr
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    return {
      id: fields.id,
      source: fields.source as PlatformSource,
      url: fields.url || '',
      time: fields.time,
      platform: fields.platform || '',
      title: fields.title || '',
      summary: fields.summary || null,
      tags,
      created_at: fields.created_at || fields.time,
      updated_at: fields.updated_at || fields.time,
    };
  }

  saveMemory(item: MemoryItem): void {
    const platformDir = this.getPlatformDir(item.source);
    const platformFile = path.join(platformDir, `${item.id}.md`);
    const content = this.serializeMemory(item);
    fs.writeFileSync(platformFile, content, 'utf-8');
    const timeFile = this.getTimeFilePath(parseDate(item.time));
    const entry = `- [${item.time}] **${item.title}** _(${item.platform})_ [链接](${item.url})\n`;
    fs.appendFileSync(timeFile, entry, 'utf-8');
    this.logger.debug(`Saved memory: ${item.id}`);
  }

  getMemory(id: string): MemoryItem | null {
    for (const source of this.listPlatformDirs()) {
      const file = path.join(this.basePath, 'by-platform', source, `${id}.md`);
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        return this.deserializeMemory(content);
      }
    }
    return null;
  }

  listMemories(options: {
    timeRange?: { start?: string; end?: string };
    platforms?: PlatformSource[];
    limit?: number;
    offset?: number;
  }): { items: MemorySummary[]; total: number; hasMore: boolean } {
    const allItems: MemorySummary[] = [];
    const sources = options.platforms || this.listPlatformDirs();
    for (const source of sources) {
      const dir = path.join(this.basePath, 'by-platform', source);
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        const memory = this.deserializeMemory(content);
        if (!memory) continue;
        if (options.timeRange) {
          const t = new Date(memory.time).getTime();
          if (options.timeRange.start && t < new Date(options.timeRange.start).getTime()) continue;
          if (options.timeRange.end && t > new Date(options.timeRange.end).getTime()) continue;
        }
        allItems.push({
          id: memory.id,
          time: memory.time,
          title: memory.title,
          platform: memory.platform,
          url: memory.url,
        });
      }
    }
    allItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const total = allItems.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const items = allItems.slice(offset, offset + limit);
    return { items, total, hasMore: offset + limit < total };
  }

  searchMemories(text: string, options: {
    timeRange?: { start?: string; end?: string };
    platforms?: PlatformSource[];
    limit?: number;
  }): MemoryItem[] {
    const results: MemoryItem[] = [];
    const sources = options.platforms || this.listPlatformDirs();
    const query = text.toLowerCase();
    for (const source of sources) {
      const dir = path.join(this.basePath, 'by-platform', source);
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        const memory = this.deserializeMemory(content);
        if (!memory) continue;
        if (options.timeRange) {
          const t = new Date(memory.time).getTime();
          if (options.timeRange.start && t < new Date(options.timeRange.start).getTime()) continue;
          if (options.timeRange.end && t > new Date(options.timeRange.end).getTime()) continue;
        }
        const searchTarget = `${memory.title} ${memory.summary || ''} ${memory.tags.join(' ')}`.toLowerCase();
        if (searchTarget.includes(query)) {
          results.push(memory);
        }
      }
    }
    results.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return results.slice(0, options.limit || 10);
  }

  private listPlatformDirs(): PlatformSource[] {
    const dir = path.join(this.basePath, 'by-platform');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name as PlatformSource);
  }

  getStorageInfo(): { totalFiles: number; totalSize: number } {
    let totalFiles = 0;
    let totalSize = 0;
    const walkDir = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          totalFiles++;
          totalSize += fs.statSync(fullPath).size;
        }
      }
    };
    walkDir(path.join(this.basePath, 'by-platform'));
    return { totalFiles, totalSize };
  }
}

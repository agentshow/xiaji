import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { XjConfig, PlatformSource } from '../types/index';
import { Logger } from '../utils/logger';
import { encrypt, decrypt } from '../utils/crypto';

const DEFAULT_CONFIG: XjConfig = {
  version: '1.0',
  storage: {
    type: 'local',
    path: path.join(os.homedir(), 'xiaji'),
  },
  sync: {
    cron: '0 22 * * *',
    enabled: true,
    notify: false,
    retryCount: 3,
    retryDelay: 60000,
    platforms: ['feishu-doc', 'feishu-minutes', 'feishu-calendar'],
  },
  platforms: {},
  apiKey: '',
  lastSync: '',
};

export class ConfigService {
  private configPath: string;
  private config: XjConfig;
  private logger: Logger;

  constructor(configPath: string, logger: Logger) {
    this.configPath = configPath;
    this.logger = logger;
    this.config = this.load();
  }

  private load(): XjConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = JSON.parse(raw) as Partial<XjConfig>;
        const merged: XjConfig = {
          ...DEFAULT_CONFIG,
          ...loaded,
          storage: { ...DEFAULT_CONFIG.storage, ...loaded.storage },
          sync: { ...DEFAULT_CONFIG.sync, ...loaded.sync },
        };
        this.logger.debug('Config loaded successfully');
        return merged;
      }
    } catch (err) {
      this.logger.warn(`Failed to load config: ${String(err)}`);
    }
    this.logger.info('Using default config');
    return { ...DEFAULT_CONFIG };
  }

  save(): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    this.logger.debug('Config saved');
  }

  get(): XjConfig {
    return this.config;
  }

  getStoragePath(): string {
    return this.config.storage.path.replace(/^~/, os.homedir());
  }

  setStoragePath(p: string): void {
    this.config.storage.path = p;
    this.save();
  }

  isPlatformEnabled(platform: string): boolean {
    return this.config.platforms[platform]?.enabled ?? false;
  }

  getPlatformToken(platform: string): string | undefined {
    const p = this.config.platforms[platform];
    if (!p?.token) return undefined;
    try {
      return decrypt(p.token, this.config.apiKey || 'xiaji-default-key');
    } catch {
      return undefined;
    }
  }

  setPlatformToken(platform: string, token: string): void {
    if (!this.config.platforms[platform]) {
      this.config.platforms[platform] = { enabled: true };
    }
    const encrypted = encrypt(token, this.config.apiKey || 'xiaji-default-key');
    this.config.platforms[platform].token = encrypted;
    this.config.platforms[platform].enabled = true;
    this.save();
  }

  setApiKey(key: string): void {
    this.config.apiKey = key;
    this.save();
  }

  updateLastSync(timestamp: string): void {
    this.config.lastSync = timestamp;
    this.save();
  }

  getSyncPlatforms(): PlatformSource[] {
    return this.config.sync.platforms;
  }

  init(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
    this.logger.info('Config initialized');
  }
}

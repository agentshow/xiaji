export type PlatformSource =
  | 'feishu-doc'
  | 'feishu-minutes'
  | 'feishu-calendar'
  | 'alipay'
  | 'wechat'
  | 'calendar'
  | 'photo'
  | 'manual';

export interface MemoryItem {
  id: string;
  source: PlatformSource;
  url: string;
  time: string;
  platform: string;
  title: string;
  summary: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface MemorySummary {
  id: string;
  time: string;
  title: string;
  platform: string;
  url: string;
}

export interface SyncInput {
  platforms?: PlatformSource[];
  force?: boolean;
}

export interface SyncError {
  platform: string;
  code: string;
  message: string;
}

export interface SyncOutput {
  success: boolean;
  count: number;
  errors: SyncError[];
  platformCounts: Record<string, number>;
  timestamp: string;
}

export interface TimeRange {
  start?: string;
  end?: string;
}

export interface QueryInput {
  text: string;
  timeRange?: TimeRange;
  platforms?: PlatformSource[];
  limit?: number;
}

export interface QueryOutput {
  success: boolean;
  query: string;
  total: number;
  results: MemoryItem[];
  took_ms: number;
}

export interface AddInput {
  content: string;
  time?: string;
  platform?: string;
  tags?: string[];
}

export interface AddOutput {
  success: boolean;
  id: string;
  filePath: string;
  timestamp: string;
}

export interface ListInput {
  timeRange?: TimeRange;
  platforms?: PlatformSource[];
  limit?: number;
  offset?: number;
}

export interface ListOutput {
  success: boolean;
  items: MemorySummary[];
  total: number;
  hasMore: boolean;
}

export type ErrorCode =
  | 'SYNC_ERROR'
  | 'SYNC_PLATFORM_FAILED'
  | 'SYNC_TOKEN_EXPIRED'
  | 'AUTH_ERROR'
  | 'AILY_AGENT_NOT_FOUND'
  | 'AILY_AUTH_FAILED'
  | 'QUERY_NO_RESULT'
  | 'QUERY_INVALID_TIME_RANGE'
  | 'ADD_FAILED'
  | 'ADD_INVALID_CONTENT'
  | 'VALIDATION_ERROR'
  | 'STORAGE_ERROR'
  | 'STORAGE_DISK_FULL'
  | 'PLATFORM_NOT_ENABLED'
  | 'INTERNAL_ERROR';

export interface XjError {
  code: ErrorCode;
  message: string;
  data?: Record<string, unknown>;
}

export interface XjConfig {
  version: string;
  storage: {
    type: 'icloud' | 'onedrive' | 'local';
    path: string;
  };
  sync: {
    cron: string;
    enabled: boolean;
    notify: boolean;
    retryCount: number;
    retryDelay: number;
    platforms: PlatformSource[];
  };
  platforms: Record<string, {
    enabled: boolean;
    aily_agent_id?: string;
  }>;
  lastSync: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  lastSync: string;
  platforms: Record<string, 'ok' | 'token_expired' | 'error'>;
}

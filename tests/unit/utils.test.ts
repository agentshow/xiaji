import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, generateId } from '../../src/utils/crypto';
import { formatDate, formatDateTime, formatIso, parseDate, getTimePath, getDateFileName } from '../../src/utils/date';

describe('crypto', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const original = 'hello world';
      const secret = 'my-secret-key';
      const encrypted = encrypt(original, secret);
      expect(encrypted).not.toBe(original);
      const decrypted = decrypt(encrypted, secret);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext for same input', () => {
      const text = 'same text';
      const secret = 'key';
      const e1 = encrypt(text, secret);
      const e2 = encrypt(text, secret);
      expect(e1).not.toBe(e2);
    });

    it('should fail to decrypt with wrong secret', () => {
      const encrypted = encrypt('secret', 'key1');
      expect(() => decrypt(encrypted, 'key2')).toThrow();
    });
  });

  describe('generateId', () => {
    it('should generate id with correct format', () => {
      const id = generateId();
      expect(id).toMatch(/^xiaji-\d{4}-\d{2}-\d{2}-\d{3}$/);
    });

    it('should generate unique ids', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });
  });
});

describe('date', () => {
  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const d = new Date('2026-05-07T10:00:00');
      expect(formatDate(d)).toBe('2026-05-07');
    });
  });

  describe('formatDateTime', () => {
    it('should format date as YYYY-MM-DDTHH:mm:ss', () => {
      const d = new Date('2026-05-07T10:30:45');
      expect(formatDateTime(d)).toBe('2026-05-07T10:30:45');
    });
  });

  describe('formatIso', () => {
    it('should format as ISO 8601', () => {
      const d = new Date('2026-05-07T10:00:00Z');
      expect(formatIso(d)).toBe('2026-05-07T10:00:00.000Z');
    });
  });

  describe('parseDate', () => {
    it('should parse ISO string to Date', () => {
      const d = parseDate('2026-05-07T10:00:00+08:00');
      expect(d).toBeInstanceOf(Date);
    });
  });

  describe('getTimePath', () => {
    it('should return YYYY/MM path', () => {
      const d = new Date('2026-05-07');
      expect(getTimePath(d)).toBe('2026/05');
    });
  });

  describe('getDateFileName', () => {
    it('should return YYYY-MM-DD.md', () => {
      const d = new Date('2026-05-07');
      expect(getDateFileName(d)).toBe('2026-05-07.md');
    });
  });
});

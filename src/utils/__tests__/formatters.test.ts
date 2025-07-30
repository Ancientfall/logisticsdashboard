/**
 * Formatters Tests
 * Tests utility formatting functions
 */

import {
  formatSmartCurrency,
  formatPercentage,
  formatDuration,
  formatFileSize,
  formatNumber,
  formatDate,
  formatDateRange
} from '../formatters';

describe('Formatters', () => {
  describe('formatSmartCurrency', () => {
    test('should format small amounts', () => {
      expect(formatSmartCurrency(123.45)).toBe('$123');
      expect(formatSmartCurrency(999)).toBe('$999');
    });

    test('should format thousands', () => {
      expect(formatSmartCurrency(1234)).toBe('$1.2K');
      expect(formatSmartCurrency(15000)).toBe('$15K');
      expect(formatSmartCurrency(999999)).toBe('$1000K');
    });

    test('should format millions', () => {
      expect(formatSmartCurrency(1000000)).toBe('$1M');
      expect(formatSmartCurrency(2500000)).toBe('$2.5M');
      expect(formatSmartCurrency(999999999)).toBe('$1000M');
    });

    test('should format billions', () => {
      expect(formatSmartCurrency(1000000000)).toBe('$1B');
      expect(formatSmartCurrency(2500000000)).toBe('$2.5B');
    });

    test('should handle edge cases', () => {
      expect(formatSmartCurrency(0)).toBe('$0');
      expect(formatSmartCurrency(undefined)).toBe('$0');
      expect(formatSmartCurrency(null)).toBe('$0');
      expect(formatSmartCurrency(NaN)).toBe('$0');
    });

    test('should handle negative numbers', () => {
      expect(formatSmartCurrency(-1234)).toBe('-$1.2K');
      expect(formatSmartCurrency(-1000000)).toBe('-$1M');
    });
  });

  describe('formatPercentage', () => {
    test('should format percentages with default precision', () => {
      expect(formatPercentage(0.1234)).toBe('12.3%');
      expect(formatPercentage(0.5)).toBe('50.0%');
      expect(formatPercentage(1)).toBe('100.0%');
    });

    test('should format percentages with custom precision', () => {
      expect(formatPercentage(0.1234, 2)).toBe('12.34%');
      expect(formatPercentage(0.1234, 0)).toBe('12%');
    });

    test('should handle edge cases', () => {
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(undefined as any)).toBe('0.0%');
      expect(formatPercentage(null as any)).toBe('0.0%');
      expect(formatPercentage(NaN)).toBe('0.0%');
    });

    test('should handle values already as percentages', () => {
      expect(formatPercentage(12.34, 1, true)).toBe('12.3%');
      expect(formatPercentage(100, 0, true)).toBe('100%');
    });
  });

  describe('formatDuration', () => {
    test('should format hours and minutes', () => {
      expect(formatDuration(1.5)).toBe('1h 30m');
      expect(formatDuration(2.25)).toBe('2h 15m');
      expect(formatDuration(0.5)).toBe('30m');
    });

    test('should format whole hours', () => {
      expect(formatDuration(1)).toBe('1h 0m');
      expect(formatDuration(24)).toBe('24h 0m');
    });

    test('should format minutes only', () => {
      expect(formatDuration(0.25)).toBe('15m');
      expect(formatDuration(0.1)).toBe('6m');
    });

    test('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('0m');
      expect(formatDuration(undefined as any)).toBe('0m');
      expect(formatDuration(null as any)).toBe('0m');
      expect(formatDuration(NaN)).toBe('0m');
    });

    test('should handle large durations', () => {
      expect(formatDuration(25.5)).toBe('25h 30m');
      expect(formatDuration(100)).toBe('100h 0m');
    });
  });

  describe('formatFileSize', () => {
    test('should format bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    test('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048575)).toBe('1024.0 KB');
    });

    test('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });

    test('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
      expect(formatFileSize(2684354560)).toBe('2.5 GB');
    });

    test('should handle edge cases', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(undefined as any)).toBe('0 B');
      expect(formatFileSize(null as any)).toBe('0 B');
      expect(formatFileSize(NaN)).toBe('0 B');
    });
  });

  describe('formatNumber', () => {
    test('should format numbers with default settings', () => {
      expect(formatNumber(1234.567)).toBe('1,235');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    test('should format with custom precision', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57');
      expect(formatNumber(1234.567, 0)).toBe('1,235');
    });

    test('should handle edge cases', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(undefined as any)).toBe('0');
      expect(formatNumber(null as any)).toBe('0');
      expect(formatNumber(NaN)).toBe('0');
    });

    test('should handle negative numbers', () => {
      expect(formatNumber(-1234.567)).toBe('-1,235');
      expect(formatNumber(-1234.567, 2)).toBe('-1,234.57');
    });
  });

  describe('formatDate', () => {
    test('should format dates with default format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      
      expect(formatted).toMatch(/Jan\s+15,\s+2024/);
    });

    test('should format dates with custom format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date, 'yyyy-MM-dd');
      
      expect(formatted).toBe('2024-01-15');
    });

    test('should handle invalid dates', () => {
      expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
      expect(formatDate(null as any)).toBe('');
      expect(formatDate(undefined as any)).toBe('');
    });

    test('should format with time', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date, 'MMM dd, yyyy HH:mm');
      
      expect(formatted).toMatch(/Jan\s+15,\s+2024\s+\d{2}:\d{2}/);
    });
  });

  describe('formatDateRange', () => {
    test('should format date ranges', () => {
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-20T00:00:00Z');
      
      const formatted = formatDateRange(startDate, endDate);
      
      expect(formatted).toMatch(/Jan\s+15.*Jan\s+20,\s+2024/);
    });

    test('should handle same dates', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      
      const formatted = formatDateRange(date, date);
      
      expect(formatted).toMatch(/Jan\s+15,\s+2024/);
    });

    test('should handle invalid dates', () => {
      const validDate = new Date('2024-01-15T00:00:00Z');
      const invalidDate = new Date('invalid');
      
      expect(formatDateRange(invalidDate, validDate)).toBe('Invalid Date Range');
      expect(formatDateRange(validDate, invalidDate)).toBe('Invalid Date Range');
      expect(formatDateRange(null as any, validDate)).toBe('Invalid Date Range');
    });

    test('should format with custom separator', () => {
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-20T00:00:00Z');
      
      const formatted = formatDateRange(startDate, endDate, ' to ');
      
      expect(formatted).toMatch(/Jan\s+15.*to.*Jan\s+20,\s+2024/);
    });
  });
});
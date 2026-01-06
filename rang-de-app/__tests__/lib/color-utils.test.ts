import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  isValidHex,
  normalizeHex,
  getContrastDirection,
} from '@/lib/color-utils';

describe('color-utils', () => {
  describe('isValidHex', () => {
    it('should validate correct hex colors', () => {
      expect(isValidHex('#000000')).toBe(true);
      expect(isValidHex('#ffffff')).toBe(true);
      expect(isValidHex('#ff0000')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHex('')).toBe(false);
      expect(isValidHex('not-a-color')).toBe(false);
      expect(isValidHex('#gggggg')).toBe(false);
    });
  });

  describe('normalizeHex', () => {
    it('should normalize hex colors', () => {
      expect(normalizeHex('#FF0000')).toBe('#ff0000');
      expect(normalizeHex('FF0000')).toBe('#ff0000');
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate contrast ratio correctly', () => {
      // Black on white should have high contrast
      const contrast = getContrastRatio('#000000', '#ffffff');
      expect(contrast).toBeGreaterThan(20);
    });

    it('should return 1 for same colors', () => {
      const contrast = getContrastRatio('#000000', '#000000');
      expect(contrast).toBeCloseTo(1, 1);
    });
  });

  describe('getContrastDirection', () => {
    it('should return dark for light surfaces', () => {
      expect(getContrastDirection('#ffffff')).toBe('dark');
      expect(getContrastDirection('#f0f0f0')).toBe('dark');
    });

    it('should return light for dark surfaces', () => {
      expect(getContrastDirection('#000000')).toBe('light');
      expect(getContrastDirection('#1a1a1a')).toBe('light');
    });
  });
});

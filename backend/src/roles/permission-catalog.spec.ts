import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS,
  isPermission,
  roleCodeFromName,
} from './permission-catalog.js';

describe('permission catalog', () => {
  it('lists unique, namespaced permission codes', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    for (const code of PERMISSIONS) {
      expect(code).toMatch(/^[a-z]+:[a-z]+$/);
    }
  });

  it('isPermission accepts catalog codes only', () => {
    expect(isPermission('users:read')).toBe(true);
    expect(isPermission('pets:fly')).toBe(false);
    expect(isPermission(42)).toBe(false);
  });
});

describe('roleCodeFromName', () => {
  it('slugs a name into a stable lowercase code', () => {
    expect(roleCodeFromName('Vet Assistant')).toBe('vet_assistant');
    expect(roleCodeFromName('  Groomer!!  ')).toBe('groomer');
  });

  it('strips diacritics and caps the length at 40', () => {
    expect(roleCodeFromName('Veterinário Sênior')).toBe('veterinario_senior');
    expect(roleCodeFromName('x'.repeat(60))).toHaveLength(40);
  });

  it('answers an empty code for a name with no usable characters', () => {
    expect(roleCodeFromName('!!!')).toBe('');
  });
});

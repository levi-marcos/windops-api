import { describe, it, expect } from 'vitest';
import { classifyTemperature } from './temperature.js';

describe('classifyTemperature', () => {
  it('classifica 70 como NORMAL', () => {
    expect(classifyTemperature(70)).toBe('NORMAL');
  });

  it('classifica 75 como WARNING (limite inferior)', () => {
    expect(classifyTemperature(75)).toBe('WARNING');
  });

  it('classifica 80 como WARNING', () => {
    expect(classifyTemperature(80)).toBe('WARNING');
  });

  it('classifica 85 como CRITICAL (limite inferior)', () => {
    expect(classifyTemperature(85)).toBe('CRITICAL');
  });

  it('classifica 90 como CRITICAL', () => {
    expect(classifyTemperature(90)).toBe('CRITICAL');
  });

  it('classifica 74 como NORMAL (abaixo do limite)', () => {
    expect(classifyTemperature(74)).toBe('NORMAL');
  });

  it('classifica 84 como WARNING (abaixo do crítico)', () => {
    expect(classifyTemperature(84)).toBe('WARNING');
  });
});
import { describe, it, expect } from 'vitest';
import { AppController } from './app.controller.js';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(() => {
    controller = new AppController();
  });

  it('GET /health retorna status ok', () => {
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
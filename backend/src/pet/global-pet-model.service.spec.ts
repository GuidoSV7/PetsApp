import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_GLOBAL_MODEL_SCALE,
  GLOBAL_PET_MODEL_FILE_PATH,
  GlobalPetModelService,
  MAX_GLOBAL_PET_MODEL_BYTES,
} from './global-pet-model.service.js';

describe('GlobalPetModelService', () => {
  let service: GlobalPetModelService;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'petsapp-pet-model-'));
    service = new GlobalPetModelService(
      new ConfigService({ PET_MODEL_DIR: dir }),
    );
    service.onModuleInit();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('defaults to procedural with a finite scale', () => {
    const meta = service.getMeta();
    expect(meta.kind).toBe('procedural');
    expect(meta.modelScale).toBe(DEFAULT_GLOBAL_MODEL_SCALE);
    expect(meta.fileUrl).toBeNull();
  });

  it('persists a GLB so every reader sees the same fileUrl', () => {
    const buffer = Buffer.from([1, 2, 3, 4]);
    const saved = service.saveModel({
      modelScale: 1.1,
      file: {
        buffer,
        originalname: 'michi.glb',
        mimetype: 'model/gltf-binary',
      },
    });
    expect(saved.kind).toBe('glb');
    expect(saved.modelScale).toBe(1.1);
    expect(saved.fileName).toBe('michi.glb');
    expect(saved.fileUrl).toBe(GLOBAL_PET_MODEL_FILE_PATH);

    const again = new GlobalPetModelService(
      new ConfigService({ PET_MODEL_DIR: dir }),
    );
    const meta = again.getMeta();
    expect(meta.kind).toBe('glb');
    expect(meta.fileUrl).toBe(GLOBAL_PET_MODEL_FILE_PATH);
    expect(again.getFileBuffer().buffer.equals(buffer)).toBe(true);
  });

  it('updates scale without replacing the file', () => {
    service.saveModel({
      modelScale: 0.8,
      file: {
        buffer: Buffer.from('glb'),
        originalname: 'a.glb',
      },
    });
    const next = service.saveModel({ modelScale: 1.25 });
    expect(next.kind).toBe('glb');
    expect(next.modelScale).toBe(1.25);
    expect(service.getFileBuffer().buffer.toString()).toBe('glb');
  });

  it('clears back to procedural', () => {
    service.saveModel({
      modelScale: 1,
      file: { buffer: Buffer.from('x'), originalname: 'x.glb' },
    });
    const cleared = service.clearModel();
    expect(cleared.kind).toBe('procedural');
    expect(cleared.fileUrl).toBeNull();
    expect(() => service.getFileBuffer()).toThrow(NotFoundException);
  });

  it('rejects oversized uploads', () => {
    const buffer = Buffer.alloc(MAX_GLOBAL_PET_MODEL_BYTES + 1, 1);
    expect(() =>
      service.saveModel({
        modelScale: 1,
        file: { buffer, originalname: 'huge.glb' },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects non-glb names', () => {
    expect(() =>
      service.saveModel({
        modelScale: 1,
        file: { buffer: Buffer.from('x'), originalname: 'cat.png' },
      }),
    ).toThrow(BadRequestException);
  });
});

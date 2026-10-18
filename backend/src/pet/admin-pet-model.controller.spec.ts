import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import { AdminPetModelController } from './admin-pet-model.controller.js';
import type { GlobalPetModelService } from './global-pet-model.service.js';

describe('AdminPetModelController routes', () => {
  it('is mounted at admin/pet-model with POST and PUT upserts', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminPetModelController)).toBe(
      'admin/pet-model',
    );
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AdminPetModelController.prototype.create,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AdminPetModelController.prototype.replace,
      ),
    ).toBe(RequestMethod.PUT);
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        AdminPetModelController.prototype.clear,
      ),
    ).toBe(RequestMethod.DELETE);
  });

  it('create delegates to saveModel', () => {
    const saveModel = vi.fn().mockReturnValue({ kind: 'glb' });
    const controller = new AdminPetModelController({
      saveModel,
      clearModel: vi.fn(),
    } as unknown as GlobalPetModelService);

    controller.create(
      { modelScale: 1.1 },
      {
        buffer: Buffer.from([1]),
        originalname: 'a.glb',
        mimetype: 'model/gltf-binary',
      },
    );

    expect(saveModel).toHaveBeenCalledWith({
      modelScale: 1.1,
      file: {
        buffer: Buffer.from([1]),
        originalname: 'a.glb',
        mimetype: 'model/gltf-binary',
      },
    });
  });
});

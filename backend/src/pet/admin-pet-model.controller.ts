import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import {
  GlobalPetModelService,
  MAX_GLOBAL_PET_MODEL_BYTES,
} from './global-pet-model.service.js';
import { UpsertGlobalPetModelDto } from './dto/upsert-global-pet-model.dto.js';

type UploadedModel = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

const multerOpts = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_GLOBAL_PET_MODEL_BYTES },
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/pet-model')
export class AdminPetModelController {
  constructor(private readonly models: GlobalPetModelService) {}

  /** Primary upsert — multer-native POST (preferred over PUT behind proxies). */
  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', multerOpts))
  create(
    @Body() body: UpsertGlobalPetModelDto,
    @UploadedFile() file?: UploadedModel,
  ) {
    return this.upsert(body, file);
  }

  /** Alias kept for older clients. */
  @Put()
  @UseInterceptors(FileInterceptor('file', multerOpts))
  replace(
    @Body() body: UpsertGlobalPetModelDto,
    @UploadedFile() file?: UploadedModel,
  ) {
    return this.upsert(body, file);
  }

  @Delete()
  clear() {
    return this.models.clearModel();
  }

  private upsert(body: UpsertGlobalPetModelDto, file?: UploadedModel) {
    return this.models.saveModel({
      modelScale: body.modelScale,
      file: file
        ? {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          }
        : undefined,
    });
  }
}

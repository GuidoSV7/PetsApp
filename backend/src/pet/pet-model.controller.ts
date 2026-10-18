import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { GlobalPetModelService } from './global-pet-model.service.js';

@Public()
@Controller('pet/model')
export class PetModelController {
  constructor(private readonly models: GlobalPetModelService) {}

  @Get()
  getMeta() {
    return this.models.getMeta();
  }

  @Get('file')
  @Header('Cache-Control', 'public, max-age=60')
  getFile(): StreamableFile {
    const { buffer, mimeType, fileName } = this.models.getFileBuffer();
    return new StreamableFile(buffer, {
      type: mimeType,
      disposition: `inline; filename="${fileName.replace(/"/g, '')}"`,
    });
  }
}

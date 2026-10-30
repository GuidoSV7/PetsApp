import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ACCOUNT_PET_REPOSITORY, AccountPetError, type AccountPetRepository } from './ports/account-pet-repository.port.js';
import { AccountPetConfig } from './account-pet.config.js';
import type { ClaimGuestDto } from './dto/claim-guest.dto.js';
import { petStateDto } from '../pet/pet-state.mapper.js';

@Injectable()
export class AccountPetService {
  private readonly logger = new Logger(AccountPetService.name);
  constructor(@Inject(ACCOUNT_PET_REPOSITORY) private readonly pets: AccountPetRepository, private readonly config: AccountPetConfig) {}

  claim(userId: string, dto: ClaimGuestDto) {
    return this.execute(async () => {
      const decision = dto.operationId !== undefined || dto.choice !== undefined;
      if (decision && (!dto.operationId || !dto.choice || dto.guestKey !== undefined)) {
        throw new BadRequestException('INVALID_PET_CLAIM');
      }
      const result = decision
        ? await this.pets.resolve(userId, dto.operationId!, dto.choice!)
        : await this.pets.bootstrap(userId, dto.guestKey);
      if (result.status === 'pending') {
        throw new ConflictException({
          statusCode: 409, error: 'Conflict', message: 'PET_CONFLICT',
          operationId: result.operationId,
          options: { keep_account: { petId: result.accountPetId }, keep_guest: { petId: result.guestPetId } },
        });
      }
      this.logger.log('Account pet claim confirmed');
      return result;
    });
  }

  status(userId: string, operationId: string) {
    return this.execute(async () => {
      const result = await this.pets.operationStatus(userId, operationId);
      return result.status === 'pending' ? { status: result.status, operationId: result.operationId } : result;
    });
  }

  state(userId: string) {
    return this.execute(async () => {
      const current = await this.pets.readCurrent(userId);
      if (!current) throw new NotFoundException('PET_NOT_INITIALIZED');
      return petStateDto(current);
    });
  }

  private async execute<T>(work: () => Promise<T>, invalidMutation = 'INVALID_PET_MUTATION'): Promise<T> {
    this.config.assertEnabled();
    try { return await work(); }
    catch (error) {
      this.logger.warn('Account pet request rejected');
      if (!(error instanceof AccountPetError)) throw error;
      switch (error.code) {
        case 'PET_NOT_INITIALIZED': throw new NotFoundException(error.code);
        case 'PET_CONFLICT_STALE':
        case 'PET_OPERATION_DECISION_MISMATCH': throw new ConflictException(error.code);
        case 'INVALID_PET_MUTATION': throw new BadRequestException(invalidMutation);
        default: throw new ForbiddenException(error.code);
      }
    }
  }
}

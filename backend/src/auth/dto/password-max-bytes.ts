import { registerDecorator, type ValidationOptions } from 'class-validator';

/** bcrypt reads at most 72 bytes of the input; longer passwords are rejected. */
export const MAX_PASSWORD_BYTES = 72;

const isWithinPasswordBytes = (value: unknown): boolean =>
  typeof value === 'string' &&
  Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES;

/** S9: rejects passwords longer than 72 UTF-8 bytes with 400. */
export function MaxPasswordBytes(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'maxPasswordBytes',
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: {
        validate: isWithinPasswordBytes,
        defaultMessage: () =>
          `password must not be longer than ${MAX_PASSWORD_BYTES} bytes`,
      },
    });
  };
}

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export const MatchesProperty =
  (property: string, options?: ValidationOptions) =>
  (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'matchesProperty',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedProp] = args.constraints as string[];
          return (
            value === (args.object as Record<string, unknown>)[relatedProp]
          );
        },
        defaultMessage(args: ValidationArguments): string {
          const [relatedProp] = args.constraints as string[];
          return `${args.property} must match ${relatedProp}`;
        },
      },
    });
  };

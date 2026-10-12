import { Transform } from 'class-transformer';
import { IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(3, 50)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

import { IsString } from 'class-validator';

export class RefreshDTO {
  @IsString()
  readonly refreshToken: string;
}

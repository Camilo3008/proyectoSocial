import { type CredencialesDto, type SesionDto } from '@agroprecios/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginCuerpo implements CredencialesDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;
}

export class SesionRespuesta implements SesionDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType: 'Bearer';

  @ApiProperty({ example: '2026-11-16T13:15:00.000Z' })
  expiraEn: string;
}

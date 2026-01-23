import { IsString, IsNumber } from "#class-validator";

export class Config {
  @IsString()
  host!: string;

  @IsString()
  envName!: string;

  @IsNumber()
  environmentId!: number;

  @IsString()
  authToken!: string;
}

import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { DisputeResolution } from '../../../common/enums';

export class ResolveDisputeDto {
  @IsEnum(DisputeResolution)
  resolution: DisputeResolution;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  resolutionNote: string;
}

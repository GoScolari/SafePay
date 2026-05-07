import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { RespondDisputeDto } from './dto/respond-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post(':txId/open')
  @HttpCode(HttpStatus.OK)
  open(
    @Param('txId') txId: string,
    @Body() dto: OpenDisputeDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.disputesService.open(txId, dto, user.id);
  }

  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  respond(
    @Param('id') id: string,
    @Body() dto: RespondDisputeDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.disputesService.respond(id, dto, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.disputesService.findById(id);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.disputesService.resolve(id, dto, user.id);
  }
}

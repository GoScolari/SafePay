import { Controller, Post, Get, Delete, Param, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    return this.filesService.upload(file, user.id);
  }

  @Get(':id/url')
  getUrl(@Param('id') id: string, @CurrentUser() user: any) {
    return this.filesService.getSignedUrl(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.filesService.remove(id, user.id);
  }
}

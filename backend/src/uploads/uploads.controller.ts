import {
    Controller,
    Post,
    Get,
    UseInterceptors,
    UploadedFile,
    Req,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express'; // NestJS wrapper for Multer
import { UploadsService } from './uploads.service';
import { AuthGuard } from '../auth/auth.guard'; // Assuming AuthGuard exists from previous structure

// Define a type for the Request with user attached (if not already global)
interface RequestWithUser extends Request {
    user: { userId: number; email?: string };
}

@Controller('uploads')
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) { }

    @UseGuards(AuthGuard)
    @Post()
    @UseInterceptors(FileInterceptor('file')) // 'file' is the field name in form-data
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Req() req: RequestWithUser,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        // req.user.userId is the userId from the token payload (set by AuthGuard)
        return this.uploadsService.uploadFile(file, req.user.userId);
    }

    @UseGuards(AuthGuard)
    @Get('my-uploads')
    async getMyUploads(@Req() req: RequestWithUser) {
        return this.uploadsService.getUserUploads(req.user.userId);
    }
}

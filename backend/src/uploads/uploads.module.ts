import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule if Guards are exported, or JwtModule etc.

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [UploadsController],
    providers: [UploadsService],
})
export class UploadsModule { }

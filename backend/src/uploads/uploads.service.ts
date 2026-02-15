import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UploadsService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(private readonly db: DatabaseService) {
        const region = process.env.AWS_REGION;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        this.bucketName = process.env.AWS_BUCKET_NAME || '';

        if (!region || !accessKeyId || !secretAccessKey || !this.bucketName) {
            console.warn('AWS credentials not fully set in .env');
        }

        this.s3Client = new S3Client({
            region: region || 'us-east-1', // Fallback to avoid crash
            credentials: {
                accessKeyId: accessKeyId || '',
                secretAccessKey: secretAccessKey || '',
            },
        });
    }

    async uploadFile(file: Express.Multer.File, userId: number) {
        if (!this.bucketName) {
            throw new BadRequestException('AWS_BUCKET_NAME not configured');
        }

        // 1. Generate unique file name
        const fileExtension = file.originalname.split('.').pop();
        const uniqueFileName = `${uuidv4()}-${file.originalname}`;
        const key = `uploads/${uniqueFileName}`;

        // 2. Upload to S3
        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    // ACL: 'public-read', // Uncomment if bucket settings allow ACLs, otherwise use bucket policy or presigned URLs.
                    // For this exercise, we assume the bucket is public or we perform a different access strategy.
                    // Since the user unchecked "Block all public access", they can likely access via object URL if they add a bucket policy, 
                    // OR we can just return the S3 URI.
                }),
            );
        } catch (error) {
            console.error('S3 Upload Error:', error);
            throw new BadRequestException('Failed to upload to S3');
        }

        // 3. Construct Public URL (Assuming standard S3 public access for now)
        // format: https://BUCKET_NAME.s3.REGION.amazonaws.com/KEY
        const region = process.env.AWS_REGION;
        const publicUrl = `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;

        // 4. Determine File Type
        let fileType = 'OTHER';
        if (file.mimetype.startsWith('image/')) fileType = 'IMAGE';
        else if (file.mimetype === 'application/pdf') fileType = 'PDF';
        else if (file.mimetype.startsWith('video/')) fileType = 'VIDEO';

        // 5. Save to Database
        const query = `
      INSERT INTO uploads (user_id, file_url, file_type, file_name)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
        const result = await this.db.query(query, [userId, publicUrl, fileType, file.originalname]);

        return result.rows[0];
    }

    async getUserUploads(userId: number) {
        const query = `
      SELECT * FROM uploads 
      WHERE user_id = $1 
      ORDER BY created_at DESC;
    `;
        const result = await this.db.query(query, [userId]);
        return result.rows;
    }
}

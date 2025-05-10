import { Client } from 'minio';

const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
    secretKey: process.env.MINIO_SECRET_KEY || 'admin123'
});

// Ensure buckets exist and are public
const ensureBucketsExist = async () => {
    try {
        // Ensure messages bucket exists
        const messagesBucketExists = await minioClient.bucketExists('messages');
        if (!messagesBucketExists) {
            await minioClient.makeBucket('messages');
            console.log('Created messages bucket');
        }

        // Set bucket policy to allow public read access
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: '*',
                    Action: ['s3:GetObject'],
                    Resource: ['arn:aws:s3:::messages/*']
                }
            ]
        };

        await minioClient.setBucketPolicy('messages', JSON.stringify(policy));
        console.log('Set bucket policy for public read access');

        // Ensure profile-pictures bucket exists
        const profilePicturesBucketExists = await minioClient.bucketExists('profile-pictures');
        if (!profilePicturesBucketExists) {
            await minioClient.makeBucket('profile-pictures');
            console.log('Created profile-pictures bucket');
        }

        // Set profile-pictures bucket policy
        await minioClient.setBucketPolicy('profile-pictures', JSON.stringify(policy));
        console.log('Set profile-pictures bucket policy for public read access');
    } catch (error) {
        console.error('Error ensuring buckets exist:', error);
    }
};

// Run the bucket check
ensureBucketsExist();

export default minioClient; 
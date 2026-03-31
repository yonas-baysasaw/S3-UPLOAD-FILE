import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuid } from 'uuid'

const s3Upload = async (file) =>{
    const AWS_REGION = process.env.AWS_REGION?.trim()
    const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME?.trim()
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID?.trim()
    const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY?.trim()
    const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN?.trim()

    if (!AWS_REGION || !AWS_BUCKET_NAME) {
        throw new Error('Missing AWS configuration. Set AWS_REGION and AWS_BUCKET_NAME in .env')
    }

    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
        throw new Error('Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env')
    }

    if (!/^(AKIA|ASIA)[A-Z0-9]{16}$/.test(AWS_ACCESS_KEY_ID)) {
        throw new Error('Invalid AWS_ACCESS_KEY_ID format in .env. It should look like AKIA/ASIA followed by 16 uppercase letters/numbers.')
    }

    if (AWS_SECRET_ACCESS_KEY.length !== 40) {
        throw new Error(`Invalid AWS_SECRET_ACCESS_KEY length in .env. Expected 40 characters, got ${AWS_SECRET_ACCESS_KEY.length}.`)
    }

    const s3Client = new S3Client({
        region: AWS_REGION,
        credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            ...(AWS_SESSION_TOKEN ? { sessionToken: AWS_SESSION_TOKEN } : {})
        }
    })

    const key = `uploads/${uuid()}-${file.originalname}`

    const param = {
        Bucket: AWS_BUCKET_NAME,
        Key: key,
        Body:file.buffer,
        ContentType: file.mimetype
    }

    await s3Client.send(new PutObjectCommand(param))

    return {
        Location: `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`,
        Key: key
    }
}

export default s3Upload

import express from 'express'
import multer from 'multer'
import fs from 'fs'
import dotenv from 'dotenv'
import s3Upload from './s3Service.js'

dotenv.config()

const app = express()

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads')
}

const storage = multer.memoryStorage()
const upload = multer({ storage })

app.post('/upload', upload.any(), async (req, res, next) => {
    try {
        const uploadedFile = req.files?.[0]

        if (!uploadedFile) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded.'
            })
        }

        const result = await s3Upload(uploadedFile)

        res.json({
            status: 'success',
            filename: uploadedFile.originalname,
            location: result.Location
        })
    } catch (error) {
        next(error)
    }
})

function getUploadClientError(err) {
    if (!err) return null

    if (err instanceof multer.MulterError) {
        return err.message
    }

    const raw = [err?.message, err?.toString?.()].filter(Boolean).join(' | ')

    if (/multipart/i.test(raw) || /unexpected end of form/i.test(raw) || /unexpected field/i.test(raw)) {
        return err?.message || 'Invalid multipart upload request.'
    }

    return null
}

app.use((err, _req, res, _next) => {
    const uploadClientError = getUploadClientError(err)

    if (uploadClientError) {
        console.warn(`Upload request rejected: ${uploadClientError}`)
        return res.status(400).json({
            status: 'error',
            message: uploadClientError
        })
    }

    console.error(err)

    if (err?.name === 'SignatureDoesNotMatch' || err?.Code === 'SignatureDoesNotMatch') {
        return res.status(401).json({
            status: 'error',
            message: 'AWS signature mismatch. Verify AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY and ensure they belong to the same IAM key pair.'
        })
    }

    if (err?.name === 'AccessDenied' || err?.Code === 'AccessDenied') {
        return res.status(403).json({
            status: 'error',
            message: 'AWS denied s3:PutObject for this IAM user. Attach an IAM policy that allows PutObject on this bucket/prefix.'
        })
    }

    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal server error'
    })
})

app.listen(4000, () => console.log('listening on port 4000'))

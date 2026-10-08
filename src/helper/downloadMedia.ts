import { downloadMediaMessage, type WAMessage } from "@whiskeysockets/baileys";
import { createWriteStream } from "fs";
import { readFile, unlink } from "fs/promises";
import { v4 as UUID } from "uuid";
import sharp from "sharp";

type MediaResult = {
    filename: string
    base64Url: string
}

async function compressImage(inputPath: string, outputPath: string): Promise<void> {
    await sharp(inputPath)
        .resize(1024, null, { 
            withoutEnlargement: true,
            fit: 'inside'
        })
        .jpeg({ quality: 75 })
        .toFile(outputPath)
}

export async function downloadMedia(msg: WAMessage, contentType: string): Promise<MediaResult | undefined> {
    try {
        // set the mimetype and default extension based on the content type
        let mimeType: string | null | undefined
        let defaultExt: string
        let isImage = false
        let isVideo = false

        if (contentType === "imageMessage") {
            mimeType = msg.message?.imageMessage?.mimetype ?? null
            defaultExt = 'jpeg'
            isImage = true
        } else if (contentType === "videoMessage") {
            mimeType = msg.message?.videoMessage?.mimetype ?? null
            defaultExt = 'mp4'
            isVideo = true
        } else {
            return undefined
        }

        // build extension and filename
        const ext = mimeType ? mimeType.split('/')[1] ?? defaultExt : defaultExt
        const tempFilename = `temp_${UUID()}.${ext}`
        const filename = `${UUID()}.${isImage ? 'jpeg' : ext}`
        
        // download media to temp file
        const mediaStream = await downloadMediaMessage(msg, "stream", {})
        const writeStream = createWriteStream(`./storage/media/${tempFilename}`)
        
        // pipe it cuzzo
        mediaStream.pipe(writeStream)
        
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve)
            writeStream.on('error', reject)
            mediaStream.on('error', reject)
        })
        
        // compress image or handle video
        if (isImage) {
            await compressImage(
                `./storage/media/${tempFilename}`,
                `./storage/media/${filename}`
            )
            
            // delete temp file
            await unlink(`./storage/media/${tempFilename}`)
            
            console.log(`[downloadMedia] Image saved and compressed: ${filename} (vision disabled)`)
            
            return {
                filename,
                base64Url: ""
            }
        } else if (isVideo) {
            console.log(`[downloadMedia] Video saved: ${tempFilename} (vision disabled)`)
            
            return {
                filename: tempFilename,
                base64Url: ""
            }
        }
        
        return undefined
    } catch (error) {
        console.error(`[downloadMedia] Failed to download ${contentType}, skipping:`, error)
        return undefined
    }
}

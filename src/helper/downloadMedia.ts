import { downloadMediaMessage, type WAMessage } from "@whiskeysockets/baileys";
import { createWriteStream } from "fs";
import { readFile } from "fs/promises";
import { v4 as UUID } from "uuid";

type MediaResult = {
    filename: string
    base64Url: string
}

export async function downloadMedia(msg: WAMessage, contentType: string): Promise<MediaResult | undefined> {
    try {
        // set the mimetype and default extension based on the content type
        let mimeType: string | null | undefined
        let defaultExt: string

        if (contentType === "imageMessage") {
            mimeType = msg.message?.imageMessage?.mimetype ?? null
            defaultExt = 'jpeg'
        } else if (contentType === "videoMessage") {
            mimeType = msg.message?.videoMessage?.mimetype ?? null
            defaultExt = 'mp4'
        } else {
            return undefined
        }

        // build extension and filename
        const ext = mimeType ? mimeType.split('/')[1] ?? defaultExt : defaultExt
        const filename = `${UUID()}.${ext}`
        const finalMimeType = mimeType ?? (contentType === "imageMessage" ? "image/jpeg" : "video/mp4")
        
        // download media and initialize writeStream
        const mediaStream = await downloadMediaMessage(msg, "stream", {})
        const writeStream = createWriteStream(`./storage/media/${filename}`)
        
        // pipe it cuzzo
        mediaStream.pipe(writeStream)
        
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve)
            writeStream.on('error', reject)
            mediaStream.on('error', reject)
        })
        
        // read the file back and convert to base64
        const fileBuffer = await readFile(`./storage/media/${filename}`)
        const base64 = fileBuffer.toString('base64')
        const base64Url = `data:${finalMimeType};base64,${base64}`
        
        console.log(`[downloadMedia] Media saved: ${filename} (${contentType})`)
        
        return {
            filename,
            base64Url
        }
    } catch (error) {
        console.error(`[downloadMedia] Failed to download ${contentType}, skipping:`, error)
        return undefined
    }
}

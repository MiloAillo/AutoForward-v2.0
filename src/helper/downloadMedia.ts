import { downloadMediaMessage, type WAMessage } from "@whiskeysockets/baileys";
import { createWriteStream } from "fs";
import { v4 as UUID } from "uuid";

export async function downloadMedia(msg: WAMessage, contentType: string): Promise<string | undefined> {
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
        
        console.log(`[downloadMedia] Media saved: ${filename} (${contentType})`)
        return filename
    } catch (error) {
        console.error(`[downloadMedia] Failed to download ${contentType}, skipping:`, error)
        return undefined
    }
}

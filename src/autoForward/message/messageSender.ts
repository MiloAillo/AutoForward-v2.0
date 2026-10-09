import type { WAMessage } from "@whiskeysockets/baileys";
import { readFileSync } from "fs";
import { socket } from "../../../index.ts";

const RATE_LIMIT_MS = 1000;

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function forwardMessages(msgs: WAMessage[], jid: string): Promise<number> {
    const sock = socket.getSocket();
    console.log(`[messageSender] ForwardMessages running with ${msgs.length} message(s)`);

    let sentCount = 0;
    for (let i = 0; i < msgs.length; i++) {
        const msg = msgs[i];
        if (!msg) continue;
        
        try {
            await sock.sendMessage(jid, { forward: msg });
            sentCount++;
            console.log(`[messageSender] Forwarded ${i + 1}/${msgs.length} message(s)`);
            
            if (i < msgs.length - 1) {
                await delay(RATE_LIMIT_MS);
            }
        } catch (error) {
            console.log(`[messageSender] Failed to forward message ${i + 1}, `, error);
        }
    }
    
    return sentCount;
}

export async function writeMessages(texts: string[], jid: string): Promise<number> {
    const sock = socket.getSocket();
    console.log(`[messageSender] writeMessages running with ${texts.length} text(s)`);

    let sentCount = 0;
    for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        if (!text) continue;
        
        try {
            await sock.sendMessage(jid, { text: text });
            sentCount++;
            console.log(`[messageSender] Sent ${i + 1}/${texts.length} text(s)`);
            
            if (i < texts.length - 1) {
                await delay(RATE_LIMIT_MS);
            }
        } catch (error) {
            console.log(`[messageSender] Failed to send text ${i + 1}, `, error);
        }
    }
    
    return sentCount;
}

export async function forwardAndWriteMessages(
    msgs: WAMessage[], 
    texts: string[], 
    jid: string, 
    flow: "forward-first" | "write-first"
): Promise<{ forwardCount: number, textCount: number }> {
    const sock = socket.getSocket();
    console.log(`[messageSender] forwardAndWriteMessages running with ${msgs.length} message(s) and ${texts.length} text(s)`);

    let forwardCount = 0;
    let textCount = 0;

    if (flow === "forward-first") {
        // Forward phase
        for (let i = 0; i < msgs.length; i++) {
            const msg = msgs[i];
            if (!msg) continue;
            
            try {
                await sock.sendMessage(jid, { forward: msg });
                forwardCount++;
                console.log(`[messageSender] Forwarded ${i + 1}/${msgs.length} message(s)`);
                
                if (i < msgs.length - 1) {
                    await delay(RATE_LIMIT_MS);
                }
            } catch (error) {
                console.log(`[messageSender] Failed to forward message ${i + 1}, `, error);
            }
        }
        
        // 2-second pause between phases
        if (msgs.length > 0 && texts.length > 0) {
            await delay(2000);
        }
        
        // Write phase
        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            if (!text) continue;
            
            try {
                await sock.sendMessage(jid, { text: text });
                textCount++;
                console.log(`[messageSender] Sent ${i + 1}/${texts.length} text(s)`);
                
                if (i < texts.length - 1) {
                    await delay(RATE_LIMIT_MS);
                }
            } catch (error) {
                console.log(`[messageSender] Failed to send text ${i + 1}, `, error);
            }
        }
    } else if (flow === "write-first") {
        // Write phase
        for (let i = 0; i < texts.length; i++) {
            const text = texts[i];
            if (!text) continue;
            
            try {
                await sock.sendMessage(jid, { text: text });
                textCount++;
                console.log(`[messageSender] Sent ${i + 1}/${texts.length} text(s)`);
                
                if (i < texts.length - 1) {
                    await delay(RATE_LIMIT_MS);
                }
            } catch (error) {
                console.log(`[messageSender] Failed to send text ${i + 1}, `, error);
            }
        }

        // 2-second pause between phases
        if (texts.length > 0 && msgs.length > 0) {
            await delay(2000);
        }

        // Forward phase
        for (let i = 0; i < msgs.length; i++) {
            const msg = msgs[i];
            if (!msg) continue;
            
            try {
                await sock.sendMessage(jid, { forward: msg });
                forwardCount++;
                console.log(`[messageSender] Forwarded ${i + 1}/${msgs.length} message(s)`);
                
                if (i < msgs.length - 1) {
                    await delay(RATE_LIMIT_MS);
                }
            } catch (error) {
                console.log(`[messageSender] Failed to forward message ${i + 1}, `, error);
            }
        }
    } else {
        console.log(`[messageSender] Critical Error: flow parameter received unknown value.`);
    }
    
    return { forwardCount, textCount };
}

export async function sendMediaWithCaption(
    mediaItems: Array<{
        mediaPath: string,
        mediaType: "image" | "video" | "document",
        caption: string
    }>,
    jid: string
): Promise<number> {
    const sock = socket.getSocket();
    console.log(`[messageSender] sendMediaWithCaption running with ${mediaItems.length} media item(s)`);

    let sentCount = 0;
    for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        if (!item) continue;
        
        const { mediaPath, mediaType, caption } = item;
        
        try {
            const filePath = `./storage/media/${mediaPath}`;
            const mediaBuffer = readFileSync(filePath);
            
            let content: any;
            if (mediaType === "image") {
                content = { image: mediaBuffer, caption };
            } else if (mediaType === "video") {
                content = { video: mediaBuffer, caption };
            } else if (mediaType === "document") {
                // Detect mimetype from filename extension
                let mimetype = "application/octet-stream"
                const ext = mediaPath.split('.').pop()?.toLowerCase()
                
                if (ext === "pdf") {
                    mimetype = "application/pdf"
                } else if (ext === "docx") {
                    mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                } else if (ext === "doc") {
                    mimetype = "application/msword"
                } else if (ext === "xlsx") {
                    mimetype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                } else if (ext === "xls") {
                    mimetype = "application/vnd.ms-excel"
                } else if (ext === "pptx") {
                    mimetype = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                } else if (ext === "ppt") {
                    mimetype = "application/vnd.ms-powerpoint"
                } else if (ext === "txt") {
                    mimetype = "text/plain"
                } else if (ext === "zip") {
                    mimetype = "application/zip"
                } else if (ext === "rar") {
                    mimetype = "application/x-rar-compressed"
                }
                
                content = { document: mediaBuffer, caption, mimetype, fileName: mediaPath };
            }
            
            await sock.sendMessage(jid, content);
            sentCount++;
            console.log(`[messageSender] Sent ${i + 1}/${mediaItems.length} media item(s) (${mediaType})`);
            
            if (i < mediaItems.length - 1) {
                await delay(RATE_LIMIT_MS);
            }
        } catch (error) {
            console.log(`[messageSender] Failed to send media ${i + 1} (${mediaPath}), `, error);
        }
    }
    
    return sentCount;
}
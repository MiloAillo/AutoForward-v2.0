import { isJidGroup, jidDecode, getContentType, type WAMessage, type MessageUpsertType } from "@whiskeysockets/baileys"
import { cacheStorage, prismaStorage } from "../.."
import { downloadMedia } from "../helper/downloadMedia"
import { isCommand } from "../helper/isCommand"
import { directCommand } from "./directCommand"

type messageHandlerType = {
    messages: WAMessage[],
    type: MessageUpsertType
}

export async function messageHandler({ messages, type }: messageHandlerType) {
    if (type !== "notify") return

    for (const msg of messages) {
        if (msg.key.fromMe) continue

        const key = msg.key

        // identifier properties
        const isGroup = isJidGroup(key.remoteJid ?? "")
        const pn = jidDecode(key.participantAlt ?? key.remoteJidAlt)?.user
        const isDirect = isCommand(msg.message?.conversation ?? "")
        const converstation = msg.message?.conversation?.trim()
        const contentType = getContentType(msg.message ?? undefined)

        if (!pn) continue

        // AutoForward
        // direct command from admin
        if (pn === process.env.ADMIN_NUMBER && !isGroup && converstation) {
            if (isDirect) 
                directCommand(msg, converstation)
        }

        // listening group
        if (isGroup && msg.key.remoteJid) {
            try {
                const forwards = await prismaStorage.getForwards(msg.key.remoteJid)
                
                if (forwards.length > 0) {
                    let mediaPath: string | undefined = undefined
                    let mediaBase64: string | undefined = undefined

                    // Handle media messages (images and videos)
                    if (contentType === "imageMessage" || contentType === "videoMessage") {
                        const mediaResult = await downloadMedia(msg, contentType)
                        
                        if (!mediaResult) {
                            console.error("[messageHandler] Media download failed, skipping message")
                            continue
                        }

                        mediaPath = mediaResult.filename
                        mediaBase64 = mediaResult.base64Url
                    }

                    // Append to each forward's own chat history
                    for (const forward of forwards) {
                        try {
                            await prismaStorage.addMessage({
                                forwardItemId: forward.id,
                                msg: msg,
                                mediaPath: mediaPath,
                                mediaBase64: mediaBase64
                            })
                            console.log(`[messageHandler] Message stored for forward item ${forward.id} from ${await cacheStorage.getGroupName(forward.listenId)}`)
                        } catch (error) {
                            console.error(`[messageHandler] Failed to store message for forward item ${forward.id}:`, error)
                        }
                    }
                }
            } catch (error) {
                console.error("[messageHandler] Failed to process message:", error)
            }
        }
    }
}
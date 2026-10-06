import { getContentType, isJidGroup, jidDecode } from "@whiskeysockets/baileys";
import { WASocket } from "./src/classes/WASocket.js";
import { isCommand } from "./src/helper/isCommand.js";
import { directCommand } from "./src/autoForward/directCommand.js";
import { CacheStorage } from "./src/classes/CacheStorage.js";
import OpenAI from 'openai'
import { PrismaStorage } from "./src/classes/PrismaStorage.js";
import { mkdir } from "fs/promises";
import { downloadMedia } from "./src/helper/downloadMedia.js";

// env load
process.loadEnvFile(".env")

if (!process.env.ADMIN_NUMBER) throw Error("ADMIN_NUMBER needed inside .env")
if (!process.env.OPENAI_API_KEY) throw Error("OPENAI_API_KEY needed inside .env")
if (!process.env.OPENAI_BASE_URL) throw Error("OPENAI_BASE_URL needed inside .env")

// Ensure media directory exists
await mkdir('./storage/media', { recursive: true })
console.log("[index] Media directory ensured")

// init
export const socket = new WASocket()
await socket.waitForConnection()
console.log("[index] WASocket initialized")

export const cacheStorage = new CacheStorage()
console.log("[index] CacheStorage initialized")

export const prismaStorage = new PrismaStorage()
console.log("[index] PrismaStorage initialized")

export const modelProvider = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
})

// WASocket message upsert event listener
socket.getSocket().ev.on('messages.upsert', async ({ messages, type }) => {
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

                    // Handle media messages (images and videos)
                    if (contentType === "imageMessage" || contentType === "videoMessage") {
                        mediaPath = await downloadMedia(msg, contentType)
                        
                        if (!mediaPath) {
                            console.error("[index] Media download failed, skipping message")
                            continue
                        }
                    }

                    // Append to each forward's own chat history
                    for (const forward of forwards) {
                        try {
                            await prismaStorage.addMessage({
                                forwardItemId: forward.id,
                                msg: msg,
                                mediaPath: mediaPath
                            })
                            console.log(`[index] Message stored for forward item ${forward.id}`)
                        } catch (error) {
                            console.error(`[index] Failed to store message for forward item ${forward.id}:`, error)
                        }
                    }
                }
            } catch (error) {
                console.error("[index] Failed to process message:", error)
            }
        }
    }
})
import { isJidGroup, jidDecode } from "@whiskeysockets/baileys";
import { WASocket } from "./src/classes/WASocket.js";
import { isCommand } from "./src/helper/isCommand.js";
import { directCommand } from "./src/autoForward/directCommand.js";
import { forward } from "./src/autoForward/forward.js";
import { CacheStorage } from "./src/classes/CacheStorage.js";
import FileStorage from "./src/classes/FileStorage.js";
import OpenAI from 'openai'

// env load
process.loadEnvFile(".env")

if (!process.env.ADMIN_NUMBER) throw Error("ADMIN_NUMBER needed inside .env")
if (!process.env.OPENAI_API_KEY) throw Error("OPENAI_API_KEY needed inside .env")
if (!process.env.OPENAI_BASE_URL) throw Error("OPENAI_BASE_URL needed inside .env")

// init
export const socket = new WASocket()
await socket.waitForConnection()
console.log("[index] WASocket initialized")

export const cacheStorage = new CacheStorage()
console.log("[index] CacheStorage initialized")

export const fileStorage = new FileStorage()
console.log("[index] FileStorage initialized")

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

        if (!pn) continue

        // AutoForward
        // direct command from admin
        if (pn === process.env.ADMIN_NUMBER && !isGroup && converstation) {
            if (isDirect) 
                directCommand(msg, converstation)
        }

        // listening group
        if (isGroup) {
            const listenGroups = await fileStorage.getListenGroups()
            const isListenGroup = listenGroups.includes(msg.key.remoteJid ?? "")
            
            if (isListenGroup) {
                console.log(msg)
                console.log("")
                console.log(converstation)
                
                // await forward(msg)
            }
        }
    }
})
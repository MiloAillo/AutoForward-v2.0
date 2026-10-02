import { isJidGroup, jidDecode } from "@whiskeysockets/baileys";
import { WASocket } from "./src/classes/WASocket.js";
import { isCommand } from "./src/helper/isCommand.js";
import { directCommand } from "./src/autoForward/directCommand.js";
import { CacheStorage } from "./src/classes/CacheStorage.js";
import FileStorage from "./src/classes/FileStorage.js";

// load .env
process.loadEnvFile(".env")
if (!process.env.ADMIN_NUMBER) throw Error("ADMIN_NUMBER needed inside .env")

// initialize classes
export const socket = new WASocket()
await socket.waitForConnection()
console.log("[index.ts] WASocket initialized")

export const cacheStorage = new CacheStorage()
console.log("[index.ts] CacheStorage initialized")

export const fileStorage = new FileStorage()
console.log("[index.ts] FileStorage initialized")

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
        if (pn === process.env.ADMIN_NUMBER && !isGroup && converstation) {
            if (isDirect) 
                directCommand(msg, converstation)


        }
    }
})
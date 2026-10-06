import { getContentType, isJidGroup, jidDecode } from "@whiskeysockets/baileys";
import { WASocket } from "./src/classes/WASocket.js";
import { isCommand } from "./src/helper/isCommand.js";
import { directCommand } from "./src/autoForward/directCommand.js";
import { CacheStorage } from "./src/classes/CacheStorage.js";
import OpenAI from 'openai'
import { PrismaStorage } from "./src/classes/PrismaStorage.js";
import { mkdir } from "fs/promises";
import { downloadMedia } from "./src/helper/downloadMedia.js";
import { messageHandler } from "./src/autoForward/messageHandler.js";
import { msgCronBatchForward } from "./src/autoForward/cron/msgCronBatchForward.js";

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

// WASocket message upsert event listener after socket ready
socket.on("socket-ready", () => {
    console.log("[index] socket-ready event received. Listening to messages upsert now...")
    socket.getSocket().ev.on('messages.upsert', messageHandler)
})

// message batch send every X minutes
msgCronBatchForward()
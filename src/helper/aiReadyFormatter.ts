import type { WAMessage } from "@whiskeysockets/baileys";
import { Prisma, type Chat, type ForwardItem }  from "../../generated/prisma/client"
import { cacheStorage } from "../..";

type ForwardWithRelations = Prisma.ForwardItemGetPayload<{
    include: {
        rules: true,
        chats: true
    }
}>;

export function stripMessage(msg: WAMessage) {
    return {
        key: {
            remoteJid: msg.key.remoteJid,
            id: msg.key.id,
            participant: msg.key.participant,
            fromMe: msg.key.fromMe
        },
        messageTimestamp: msg.messageTimestamp,
        pushName: msg.pushName,
        participant: msg.participant,
        message: msg.message
    };
}

export function chatsOptimizer(chats: Chat[]) {
    const optimizedChats = chats.map(chat => (
        {
            ...chat, 
            msg: stripMessage(chat.msg as unknown as WAMessage)
        }
    ))

    return optimizedChats
}

export function extractImages(chats: Chat[]) {
    const images: string[] = []

    for (const chat of chats) {
        if (chat.mediaBase64 && chat.mediaPath && chat.mediaBase64.length > 0) {
            images.push(chat.mediaBase64)
        }
    }

    // Limit to maximum 5 images to prevent context overflow
    return images.slice(0, 5)
}

export async function aiReadyFormatter(forward: ForwardWithRelations) {
    const cleanedForward = {
        forwardItemId: forward.id,
        forwardItem: {
            fromGroup: await cacheStorage.getGroupName(forward.listenId),
            sendToGroup: await cacheStorage.getGroupName(forward.sendId),
            fromGroupId: forward.listenId,
            sendToGroupId: forward.sendId,
            chats: chatsOptimizer(forward.chats)
        },
        images: extractImages(forward.chats),
        rules: forward.rules
    }

    return cleanedForward
}
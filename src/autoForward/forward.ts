import type { WAMessage } from "@whiskeysockets/baileys";
import { fileStorage, socket, cacheStorage } from "../../index.js";
import { shouldForwardMessage } from "./aiDecision.js";

export async function forward(msg: WAMessage) {
    const sock = socket.getSocket()
    const forwardRules = await fileStorage.getForwardRules()

    if (forwardRules.length === 0) {
        console.log("[forward] No forward rules configured")
        return
    }

    for (const rule of forwardRules) {
        const groupName = await cacheStorage.getGroupName(rule.sendToGroupJID) ?? "[Unknown Group]"
        
        const decision = await shouldForwardMessage(msg, rule.criteria)

        if (decision.shouldForward) {
            try {
                await sock.sendMessage(rule.sendToGroupJID, { forward: msg })
                console.log(`[forward] Forwarded message to ${groupName}`)
            } catch (error) {
                console.error(`[forward] Failed to forward to ${groupName}:`, error)
            }
        } else {
            console.log(`[forward] Skipping message for ${groupName}: ${decision.reason}`)
        }
    }
}
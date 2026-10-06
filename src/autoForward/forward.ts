import type { WAMessage } from "@whiskeysockets/baileys";
import { prismaStorage, socket, cacheStorage } from "../../index.js";
import { shouldForwardMessage } from "./aiDecision.js";

// OUTDATED - TODO: Rewrite with new ForwardItem + SendRule architecture
export async function forward(msg: WAMessage) {
    console.log("[forward] Function temporarily disabled - needs rewrite for new architecture")
    return
    
    /*
    const sock = socket.getSocket()
    const forwardRules = await prismaStorage.getForwards()

    if (forwardRules.length === 0) {
        console.log("[forward] No forward rules configured")
        return
    }

    for (const rule of forwardRules) {
        const groupName = await cacheStorage.getGroupName(rule.sendId) ?? "[Unknown Group]"
        
        const decision = await shouldForwardMessage(msg, rule.rules)

        if (decision.shouldForward) {
            try {
                await sock.sendMessage(rule.sendId, { forward: msg })
                console.log(`[forward] Forwarded message to ${groupName}`)
            } catch (error) {
                console.error(`[forward] Failed to forward to ${groupName}:`, error)
            }
        } else {
            console.log(`[forward] Skipping message for ${groupName}: ${decision.reason}`)
        }
    }
    */
}
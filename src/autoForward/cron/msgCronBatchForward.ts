import nodeCron from "node-cron";
import { prismaStorage } from "../../..";
import { forwardMessages } from "../message/messageSender";
import type { WAMessage } from "@whiskeysockets/baileys";
import { aiReadyFormatter } from "../../helper/aiReadyFormatter";
import { analyzeAndDecide } from "../ai/analyseAndDecide";

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function msgCronBatchForward() {
    nodeCron.schedule("*/1 * * * *", async () => {
        console.log("[msgCronBatchForward] Batch forward initiated")
        
        try {
            const forwards = await prismaStorage.getForwardsWithMessages()

            if (forwards.length === 0) {
                console.log("[msgCronBatchForward] No forwards with messages")
                return
            }

            console.log(`[msgCronBatchForward] Processing ${forwards.length} forward item(s)`)

            for (let i = 0; i < forwards.length; i++) {
                const forward = forwards[i];
                if (!forward) continue;
                
                console.log(`[msgCronBatchForward] Processing forward item ${i + 1}/${forwards.length}`)

                // No rules - forward all messages directly
                if (forward.rules.length === 0) {
                    const msgs = forward.chats.map(chat => chat.msg as any);
                    const sentCount = await forwardMessages(msgs, forward.sendId);
                    
                    // delete them from chat histories
                    const chatIds = forward.chats.map(chat => chat.id);
                    await prismaStorage.deleteMessages(chatIds);
                    
                    console.log(`[msgCronBatchForward] Forwarded ${sentCount}/${msgs.length} messages (no rules)`);
                
                // AI forwarding logic with rules
                } else {
                    const formatted = await aiReadyFormatter(forward)

                    console.log(`[msgCronBatchForward] Rules found. Calling AI to decide...`)
                    await analyzeAndDecide(formatted)
                }

                // 2-second pause before next forward item
                if (i < forwards.length - 1) {
                    await delay(2000);
                }
            }

            console.log(`[msgCronBatchForward] Finished processing ${forwards.length} forward item(s)`)
            
        } catch (error) {
            console.error("[msgCronBatchForward] Batch forward failed:", error)
        }
    })
}

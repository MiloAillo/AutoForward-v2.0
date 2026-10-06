import nodeCron from "node-cron";
import { prismaStorage } from "../../..";

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

            let i = 1
            for (const forward of forwards) {
                console.log(`[msgCronBatchForward] Processing forward item ${i}/${forwards.length}`)

                const chats = forward.chats
                
                // TODO: For each chat message:
                // 1. Check if forward has rules
                // 2. If no rules, forward all messages
                // 3. If has rules, check message against AI with rules + mediaBase64 if present
                // 4. Forward messages that pass
                // 5. Mark as sent with prismaStorage.markAsSent([chatIds])

                for (const chat of chats) {
                    // TODO: Implement forwarding logic
                    console.log(chat)
                }

                i++
            }

            console.log(`[msgCronBatchForward] Finished processing ${forwards.length} forward item(s)`)
            
        } catch (error) {
            console.error("[msgCronBatchForward] Batch forward failed:", error)
        }
    })
}

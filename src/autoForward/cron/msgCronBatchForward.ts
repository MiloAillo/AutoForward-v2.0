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

                // forward all message if no rules
                

                i++
            }

            console.log(`[msgCronBatchForward] Finished processing ${forwards.length} forward item(s)`)
            
        } catch (error) {
            console.error("[msgCronBatchForward] Batch forward failed:", error)
        }
    })
}

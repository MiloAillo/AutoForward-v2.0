import nodeCron from "node-cron";
import { prismaStorage } from "../../../index.ts";

export function msgCronCleanup() {
    const retentionDays = parseInt(process.env.CLEANUP_RETENTION_DAYS || "7")
    
    if (isNaN(retentionDays) || retentionDays < 1) {
        throw new Error(`[msgCronCleanup] Invalid CLEANUP_RETENTION_DAYS: "${process.env.CLEANUP_RETENTION_DAYS}". Must be a positive integer >= 1.`)
    }
    
    console.log(`[msgCronCleanup] Cleanup configured: Delete all messages older than ${retentionDays} days (Weekly Sunday 3 AM)`)

    nodeCron.schedule("0 3 * * 0", async () => {
        console.log("[msgCronCleanup] Weekly cleanup initiated - deleting all old messages")

        try {
            const count = await prismaStorage.deleteAllOldMessages(retentionDays)
            console.log(`[msgCronCleanup] Weekly cleanup completed: ${count} message(s) deleted`)
        } catch (error) {
            console.error("[msgCronCleanup] Weekly cleanup failed:", error)
        }
    })
}

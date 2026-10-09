import nodeCron from "node-cron";
import { prismaStorage } from "../../..";

const CLEANUP_DAYS = 7

export function msgCronCleanup() {
    console.log(`[msgCronCleanup] Cleanup configured: Delete all messages older than ${CLEANUP_DAYS} days (Weekly Sunday 3 AM)`)

    nodeCron.schedule("0 3 * * 0", async () => {
        console.log("[msgCronCleanup] Weekly cleanup initiated - deleting all old messages")

        try {
            const count = await prismaStorage.deleteAllOldMessages(CLEANUP_DAYS)
            console.log(`[msgCronCleanup] Weekly cleanup completed: ${count} message(s) deleted`)
        } catch (error) {
            console.error("[msgCronCleanup] Weekly cleanup failed:", error)
        }
    })
}

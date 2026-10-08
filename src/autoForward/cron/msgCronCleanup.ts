import nodeCron from "node-cron";
import { prismaStorage } from "../../..";

function validateCleanupDays(value: string | undefined, defaultValue: number, name: string): number {
    if (!value) {
        console.log(`[msgCronCleanup] ${name} not set, using default: ${defaultValue} days`)
        return defaultValue
    }

    const parsed = parseInt(value, 10)

    if (isNaN(parsed)) {
        throw new Error(`${name} must be a valid number, got: ${value}`)
    }

    if (parsed < 1) {
        throw new Error(`${name} must be at least 1 day, got: ${parsed}`)
    }

    if (parsed > 365) {
        throw new Error(`${name} cannot exceed 365 days, got: ${parsed}`)
    }

    console.log(`[msgCronCleanup] ${name} set to ${parsed} days`)
    return parsed
}

export function msgCronCleanup() {
    const unsentDays = validateCleanupDays(
        process.env.CLEANUP_UNSENT_DAYS,
        7,
        "CLEANUP_UNSENT_DAYS"
    )

    const allMessagesDays = validateCleanupDays(
        process.env.CLEANUP_ALL_DAYS,
        30,
        "CLEANUP_ALL_DAYS"
    )

    if (unsentDays >= allMessagesDays) {
        throw new Error(
            `CLEANUP_UNSENT_DAYS (${unsentDays}) must be less than CLEANUP_ALL_DAYS (${allMessagesDays})`
        )
    }

    console.log(`[msgCronCleanup] Validation passed. Unsent: ${unsentDays} days, All: ${allMessagesDays} days`)

    nodeCron.schedule("0 3 * * *", async () => {
        console.log("[msgCronCleanup] Daily cleanup initiated - deleting old unsent messages")

        try {
            const count = await prismaStorage.deleteOldUnsentMessages(unsentDays)
            console.log(`[msgCronCleanup] Daily cleanup completed: ${count} unsent message(s) deleted`)
        } catch (error) {
            console.error("[msgCronCleanup] Daily cleanup failed:", error)
        }
    })

    nodeCron.schedule("0 3 * * 0", async () => {
        console.log("[msgCronCleanup] Weekly cleanup initiated - deleting all old messages")

        try {
            const count = await prismaStorage.deleteAllOldMessages(allMessagesDays)
            console.log(`[msgCronCleanup] Weekly cleanup completed: ${count} message(s) deleted`)
        } catch (error) {
            console.error("[msgCronCleanup] Weekly cleanup failed:", error)
        }
    })

    console.log("[msgCronCleanup] Cron jobs scheduled successfully")
}

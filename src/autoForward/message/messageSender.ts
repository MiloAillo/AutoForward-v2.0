import type { WAMessage } from "@whiskeysockets/baileys";
import { socket } from "../../..";

// type messageType = "textMessage" | "forwardMessage" | "imageMessage"

// ai return { action: "forward" | "write" | "both", msgs: WAMessage[] | null,  }
const sock = socket.getSocket()

export async function forwardMessages(msgs: WAMessage[], jid: string) {
    console.log(`[messageSender] ForwardMessages running with ${msgs.length} message(s)`)

    // loop all the message and send each
    let i = 1
    for (const msg of msgs) {
        try {
            await sock.sendMessage(jid, { forward: msg })
            console.log(`[messageSender] Forwarded ${i}/${msgs.length} message(s)`)
        } catch (error) {
            console.log(`[messageSender] Failed to forward message ${i}, `, error)
        } finally {
            i++
        }
    }
}

// can modify this to have a harcoded where from and a bunch of nice thing
export async function writeMessages(texts: string[], jid: string) {
    console.log(`[messageSender] writeMessages running with ${texts.length} text(s)`)

    // loop all the message and send each
    let i = 1
    for (const text of texts) {
        try {
            await sock.sendMessage(jid, { text: text })
            console.log(`[messageSender] Sent ${i}/${texts.length} text(s)`)
        } catch (error) {
            console.log(`[messageSender] Failed to send text ${i}, `, error)
        } finally {
            i++
        }
    }
}

// can modify this to have a harcoded where from and a bunch of nice thing
export async function forwardAndWriteMessages(msgs: WAMessage[], texts: string[], jid: string, flow: "forward-first" | "write-first") {
    console.log(`[messageSender] forwardAndWriteMessages running with ${msgs.length} message(s) and ${texts.length} text(s)`)

    if (flow === "forward-first") {
        // loop all the message and send each
        let i = 1
        for (const msg of msgs) {
            try {
                await sock.sendMessage(jid, { forward: msg })
                console.log(`[messageSender] Forwarded ${i}/${msgs.length} message(s)`)
            } catch (error) {
                console.log(`[messageSender] Failed to forward message ${i}, `, error)
            } finally {
                i++
            }
        }
        
        // loop all the message and send each
        i = 1
        for (const text of texts) {
            try {
                await sock.sendMessage(jid, { text: text })
                console.log(`[messageSender] Sent ${i}/${texts.length} text(s)`)
            } catch (error) {
                console.log(`[messageSender] Failed to send text ${i}, `, error)
            } finally {
                i++
            }
        }
    } else if (flow === "write-first") {
        // loop all the message and send each
        let i = 1
        for (const text of texts) {
            try {
                await sock.sendMessage(jid, { text: text })
                console.log(`[messageSender] Sent ${i}/${text.length} text(s)`)
            } catch (error) {
                console.log(`[messageSender] Failed to send text ${i}, `, error)
            } finally {
                i++
            }
        }

        // loop all the message and send each
        i = 1
        for (const msg of msgs) {
            try {
                await sock.sendMessage(jid, { forward: msg })
                console.log(`[messageSender] Forwarded ${i}/${msgs.length} message(s)`)
            } catch (error) {
                console.log(`[messageSender] Failed to forward message ${i}, `, error)
            } finally {
                i++
            }
        }
    } else {
        console.log(`[messageSender] Critical Error: flow parameter received unknown value.`)
    }
}
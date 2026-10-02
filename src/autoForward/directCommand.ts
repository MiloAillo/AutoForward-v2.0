import type { WAMessage, GroupMetadata } from "@whiskeysockets/baileys";
import { cacheStorage, fileStorage, socket } from "../../index.js";

export async function directCommand(msg: WAMessage, converstation: string) {
    const sock = socket.getSocket()
    const jid = msg.key.remoteJid!

    console.log(msg, converstation)

    // !help                =>  Output All Commands Available
    if (converstation === "!help") {
        sock.sendMessage(jid, { text: "this is help" }, { quoted: msg })
    }

    // !list                =>  Give all groups and their index
    if (converstation === "!list") {
        const groups = await cacheStorage.getGroups()
        let text = ""

        Object.entries(groups).forEach(([jid, group], index) => {
            text += `${index + 1}. ${group.subject} (${jid})\n`
        })

        sock.sendMessage(jid, { text: text }, { quoted: msg })
    }

    // !listenTo            =>  Set group to listen to according to the group id
    if (converstation.split(" ")[0] === "!listenTo") {
        const groupJID = converstation.split(" ")[1]
        
        if (!groupJID) {
            sock.sendMessage(jid, { text: "I can't find the group JID you want me to listen to." }, { quoted: msg })
            return
        }

        const groupName = await cacheStorage.getGroupName(groupJID ?? "")

        if (!groupName) {
            sock.sendMessage(jid, { text: "I dont think that group JID exist." }, { quoted: msg })
            return
        }

        try {
            await fileStorage.addGroup(groupJID)

            sock.sendMessage(jid, { text: `I am now listening for message in ${groupName}` }, { quoted: msg })
        } catch (error) {
            sock.sendMessage(jid, { text: `I think i am listening to that group already` }, { quoted: msg })            
        }
    }

    // !sendTo              =>  Set group to sendTo according to the group id and the criteria to send


    // !check               => complete status of the current state
    if (converstation === "!check") {
        let listenGroupsMSG = ""

        const groupsJID = await fileStorage.getListenGroups()

        if (groupsJID.length > 0) {
            listenGroupsMSG += "I am listening to this group below:\n"

            for (const [i, groupJID] of groupsJID.entries()) {
                const groupName = await cacheStorage.getGroupName(groupJID) ?? "[Non Exist]"

                listenGroupsMSG += `${i + 1}. ${groupName} (${groupJID})\n`
            }
        } else {
            listenGroupsMSG += "I am not listening to any group right now."
        }

        sock.sendMessage(jid, { text: listenGroupsMSG }, { quoted: msg })
    }
}
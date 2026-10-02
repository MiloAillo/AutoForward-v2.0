import type { WAMessage } from "@whiskeysockets/baileys";
import { cacheStorage, fileStorage, socket } from "../../index.js";

export async function directCommand(msg: WAMessage, converstation: string) {
    const sock = socket.getSocket()
    const jid = msg.key.remoteJid!

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
    if (converstation.split(" ")[0] === "!sendTo") {
        const parts = converstation.split(" ")
        const groupJID = parts[1]
        const criteria = parts.slice(2).join(" ")
        
        if (!groupJID) {
            sock.sendMessage(jid, { text: "I can't find the group JID you want me to send to." }, { quoted: msg })
            return
        }

        if (!criteria) {
            sock.sendMessage(jid, { text: "Please provide a criteria for forwarding messages." }, { quoted: msg })
            return
        }

        const groupName = await cacheStorage.getGroupName(groupJID)

        if (!groupName) {
            sock.sendMessage(jid, { text: "I dont think that group JID exist." }, { quoted: msg })
            return
        }

        try {
            await fileStorage.addForwardRule(groupJID, criteria)

            sock.sendMessage(jid, { text: `I will now forward messages to ${groupName} based on criteria: "${criteria}"` }, { quoted: msg })
        } catch (error) {
            sock.sendMessage(jid, { text: `I think that group already has a forward rule set.` }, { quoted: msg })            
        }
    }

    // !removeSendTo        =>  Remove forward rule for a specific group
    if (converstation.split(" ")[0] === "!removeSendTo") {
        const groupJID = converstation.split(" ")[1]
        
        if (!groupJID) {
            sock.sendMessage(jid, { text: "I can't find the group JID you want me to remove." }, { quoted: msg })
            return
        }

        try {
            const groupName = await cacheStorage.getGroupName(groupJID) ?? groupJID

            await fileStorage.removeForwardRule(groupJID)

            sock.sendMessage(jid, { text: `I removed the forward rule for ${groupName}` }, { quoted: msg })
        } catch (error) {
            sock.sendMessage(jid, { text: `I don't think that group has a forward rule.` }, { quoted: msg })            
        }
    }

    // !removeListenTo      =>  Remove group from listen list
    if (converstation.split(" ")[0] === "!removeListenTo") {
        const groupJID = converstation.split(" ")[1]
        
        if (!groupJID) {
            sock.sendMessage(jid, { text: "I can't find the group JID you want me to stop listening to." }, { quoted: msg })
            return
        }

        try {
            const groupName = await cacheStorage.getGroupName(groupJID) ?? groupJID

            await fileStorage.removeListenGroup(groupJID)

            sock.sendMessage(jid, { text: `I stopped listening to ${groupName}` }, { quoted: msg })
        } catch (error) {
            sock.sendMessage(jid, { text: `I don't think I'm listening to that group.` }, { quoted: msg })            
        }
    }


    // !check               => complete status of the current state
    if (converstation === "!check") {
        let statusMSG = ""

        const groupsJID = await fileStorage.getListenGroups()
        const forwardRules = await fileStorage.getForwardRules()

        // Listen Groups Section
        if (groupsJID.length > 0) {
            statusMSG += "I am listening to these groups:\n"

            for (const [i, groupJID] of groupsJID.entries()) {
                const groupName = await cacheStorage.getGroupName(groupJID) ?? "[Non Exist]"

                statusMSG += `${i + 1}. ${groupName} (${groupJID})\n`
            }
        } else {
            statusMSG += "I am not listening to any group right now.\n"
        }

        statusMSG += "\n"

        // Forward Rules Section
        if (forwardRules.length > 0) {
            statusMSG += "I am forwarding messages to these groups:\n"

            for (const [i, rule] of forwardRules.entries()) {
                const groupName = await cacheStorage.getGroupName(rule.sendToGroupJID) ?? "[Non Exist]"

                statusMSG += `${i + 1}. ${groupName} (${rule.sendToGroupJID})\n   Criteria: "${rule.criteria}"\n`
            }
        } else {
            statusMSG += "I am not forwarding messages to any group right now."
        }

        sock.sendMessage(jid, { text: statusMSG }, { quoted: msg })
    }
}
import type { WAMessage } from "@whiskeysockets/baileys";
import { cacheStorage, prismaStorage, socket } from "../../../index.ts";
import { parseCreateRule } from "../../helper/parseCreateRule.ts";

export async function directCommand(msg: WAMessage, converstation: string) {
    const sock = socket.getSocket()
    const jid = msg.key.remoteJid!

    // !help                =>  Output All Commands Available
    if (converstation === ".help") {
        const helpText = `Available Commands:

GENERAL:
.help - Show this help message
.list - List all WhatsApp groups with their JIDs

RULE MANAGEMENT:
.createRule <title> | <description> | <rule>
  Create a new reusable AI rule for message filtering
  Example: .createRule Urgent | Forward urgent only | Only forward messages containing 'urgent' or 'ASAP'
  Limits: title max 50 chars, description max 200 chars

.getRules
  List all created rules (ID, title, description)

.getRule <ruleId>
  Show full details of a specific rule including where it's used
  Example: .getRule 1

.removeRule <ruleId>
  Delete a rule (blocked if used in any forward items)
  Example: .removeRule 1

FORWARD MANAGEMENT:
.createForward <listenJID> <sendJID> [ruleId1 ruleId2 ...]
  Create a forward item to route messages from one group to another
  Example: .createForward 120363@g.us 120364@g.us 1 2
  No rules = forwards ALL messages
  With rules = only forwards if AI approves

.getForwards
  List all forward items with group names and rules

.getForward <forwardId>
  Show full details of a specific forward item
  Example: .getForward 1

.deleteForward <forwardId>
  Delete a forward item
  Example: .deleteForward 1

.linkRule <forwardId> <ruleId>
  Add a rule to an existing forward item
  Example: .linkRule 1 2

.unlinkRule <forwardId> <ruleId>
  Remove a rule from a forward item
  Example: .unlinkRule 1 2`

        sock.sendMessage(jid, { text: helpText }, { quoted: msg })
    }

    // !list                =>  Give all groups and their index
    if (converstation === ".list") {
        const groups = await cacheStorage.getGroups()
        let text = ""

        Object.entries(groups).forEach(([jid, group], index) => {
            text += `${index + 1}. ${group.subject} (${jid})\n`
        })

        sock.sendMessage(jid, { text: text }, { quoted: msg })
    }

    // .createRule          =>  Create a new reusable SendRule
    if (converstation.startsWith(".createRule")) {
        const parsed = parseCreateRule(converstation)

        if (!parsed) {
            console.error("[directCommand] Failed to parse .createRule command")
            sock.sendMessage(jid, { 
                text: "Invalid format. Usage:\n.createRule <title> | <description> | <rule>\n\nExample:\n.createRule Urgent | Forward urgent only | Only forward messages containing 'urgent' or 'ASAP'\n\nLimits: title max 50 chars, description max 200 chars, no pipes (|) allowed in content" 
            }, { quoted: msg })
            return
        }

        try {
            const newRule = await prismaStorage.createRule(parsed)

            sock.sendMessage(jid, { 
                text: `Rule created successfully!\n\nID: ${newRule.id}\nTitle: ${newRule.title}\nDescription: ${newRule.description}` 
            }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to create rule:", error)
            sock.sendMessage(jid, { 
                text: `Failed to create rule. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    if (converstation.startsWith(".removeRule")) {
        const parts = converstation.split(" ")
        const ruleIdStr = parts[1]

        if (!ruleIdStr) {
            console.error("[directCommand] Invalid .removeRule command - no rule ID provided")
            sock.sendMessage(jid, { 
                text: "Invalid format. Usage:\n.removeRule <ruleId>\n\nExample:\n.removeRule 1" 
            }, { quoted: msg })
            return
        }

        const ruleId = parseInt(ruleIdStr)

        if (isNaN(ruleId)) {
            console.error("[directCommand] Invalid .removeRule command - rule ID is not a number")
            sock.sendMessage(jid, { 
                text: "Rule ID must be a number.\n\nUsage:\n.removeRule <ruleId>" 
            }, { quoted: msg })
            return
        }

        try {
            const deletedRule = await prismaStorage.deleteRule(ruleId)

            sock.sendMessage(jid, { 
                text: `Rule deleted successfully!\n\nID: ${deletedRule.id}\nTitle: ${deletedRule.title}` 
            }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to delete rule:", error)
            sock.sendMessage(jid, { 
                text: `Failed to delete rule. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    if (converstation.startsWith(".getRules")) {
        try {
            const rules = await prismaStorage.getRules()

            if (rules.length === 0) {
                sock.sendMessage(jid, { 
                    text: "No rules found. Create one with:\n.createRule <title> | <description> | <rule>" 
                }, { quoted: msg })
                return
            }

            let text = "All Rules:\n\n"
            rules.forEach((rule, index) => {
                text += `${index + 1}. [ID: ${rule.id}] ${rule.title}\n   ${rule.description}\n\n`
            })

            sock.sendMessage(jid, { text: text.trim() }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to get rules:", error)
            sock.sendMessage(jid, { 
                text: `Failed to get rules. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    if (converstation.startsWith(".getRule") && !converstation.startsWith(".getRules")) {
        const parts = converstation.split(" ")
        const ruleIdStr = parts[1]

        if (!ruleIdStr) {
            console.error("[directCommand] Invalid .getRule command - no rule ID provided")
            sock.sendMessage(jid, { 
                text: "Invalid format. Usage:\n.getRule <ruleId>\n\nExample:\n.getRule 1" 
            }, { quoted: msg })
            return
        }

        const ruleId = parseInt(ruleIdStr)

        if (isNaN(ruleId)) {
            console.error("[directCommand] Invalid .getRule command - rule ID is not a number")
            sock.sendMessage(jid, { 
                text: "Rule ID must be a number.\n\nUsage:\n.getRule <ruleId>" 
            }, { quoted: msg })
            return
        }

        try {
            const rule = await prismaStorage.getRule(ruleId)

            if (!rule) {
                sock.sendMessage(jid, { 
                    text: `Rule with ID ${ruleId} not found.` 
                }, { quoted: msg })
                return
            }

            let text = `Rule Details:\n\n`
            text += `ID: ${rule.id}\n`
            text += `Title: ${rule.title}\n`
            text += `Description: ${rule.description}\n\n`
            text += `Rule Prompt:\n${rule.rule}\n\n`
            
            if (rule.forwardItems && rule.forwardItems.length > 0) {
                text += `Used in ${rule.forwardItems.length} forward item(s):\n`
                rule.forwardItems.forEach((item, index) => {
                    text += `${index + 1}. [ID: ${item.id}] ${item.listenId} → ${item.sendId}\n`
                })
            } else {
                text += `Not used in any forward items yet.`
            }

            sock.sendMessage(jid, { text: text }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to get rule:", error)
            sock.sendMessage(jid, { 
                text: `Failed to get rule. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    if (converstation.startsWith(".createForward")) {
        const parts = converstation.split(" ").filter(p => p.length > 0)
        
        // .createForward <listenJID> <sendJID> [ruleId1 ruleId2 ...]
        if (parts.length < 3) {
            console.error("[directCommand] Invalid .createForward command - not enough arguments")
            sock.sendMessage(jid, { 
                text: "Invalid format. Usage:\n.createForward <listenJID> <sendJID> [ruleId1 ruleId2 ...]\n\nExample:\n.createForward 120363@g.us 120364@g.us 1 2\n\nNo rules = forwards ALL messages\nWith rules = only forwards if AI approves" 
            }, { quoted: msg })
            return
        }

        const listenJID = parts[1]
        const sendJID = parts[2]

        if (!listenJID || !sendJID) {
            console.error("[directCommand] Invalid .createForward command - missing JIDs")
            sock.sendMessage(jid, { 
                text: "Both listen and send JIDs are required." 
            }, { quoted: msg })
            return
        }

        const ruleIds = parts.slice(3).map(id => parseInt(id)).filter(id => !isNaN(id))

        // Validate JIDs exist in group list
        const listenGroupName = await cacheStorage.getGroupName(listenJID)
        const sendGroupName = await cacheStorage.getGroupName(sendJID)

        if (!listenGroupName) {
            console.error("[directCommand] Listen JID not found in group list")
            sock.sendMessage(jid, { 
                text: `Listen group JID not found: ${listenJID}\n\nUse .list to see available groups.` 
            }, { quoted: msg })
            return
        }

        if (!sendGroupName) {
            console.error("[directCommand] Send JID not found in group list")
            sock.sendMessage(jid, { 
                text: `Send group JID not found: ${sendJID}\n\nUse .list to see available groups.` 
            }, { quoted: msg })
            return
        }

        try {
            const forwardItem = await prismaStorage.addForwardItem({
                listenId: listenJID,
                sendId: sendJID,
                rules: ruleIds
            })

            let text = `Forward item created successfully!\n\n`
            text += `ID: ${forwardItem.id}\n`
            text += `Listen: ${listenGroupName}\n`
            text += `Send to: ${sendGroupName}\n\n`

            if (forwardItem.rules.length > 0) {
                text += `Rules (${forwardItem.rules.length}):\n`
                forwardItem.rules.forEach((rule, index) => {
                    text += `${index + 1}. [${rule.id}] ${rule.title}\n`
                })
            } else {
                text += `No rules - will forward ALL messages`
            }

            sock.sendMessage(jid, { text }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to create forward item:", error)
            sock.sendMessage(jid, { 
                text: `Failed to create forward item. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    if (converstation.startsWith(".getForwards")) {
        try {
            const forwards = await prismaStorage.getForwards()

            if (forwards.length === 0) {
                sock.sendMessage(jid, { 
                    text: "No forward items found. Create one with:\n.createForward <listenJID> <sendJID> [ruleIds]" 
                }, { quoted: msg })
                return
            }

            let text = `All Forward Items (${forwards.length}):\n\n`

            for (const forward of forwards) {
                const listenName = await cacheStorage.getGroupName(forward.listenId) ?? `[Unknown: ${forward.listenId}]`
                const sendName = await cacheStorage.getGroupName(forward.sendId) ?? `[Unknown: ${forward.sendId}]`

                text += `${forward.id}. ${listenName} → ${sendName}\n`
                
                if (forward.rules.length > 0) {
                    text += `   Rules: ${forward.rules.map(r => r.title).join(', ')}\n`
                } else {
                    text += `   No rules (forwards all messages)\n`
                }
                text += `\n`
            }

            sock.sendMessage(jid, { text: text.trim() }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to get forward items:", error)
            sock.sendMessage(jid, { 
                text: `Failed to get forward items. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    if (converstation.startsWith(".getForward") && !converstation.startsWith(".getForwards")) {
        const parts = converstation.split(" ")
        const forwardIdStr = parts[1]

        if (!forwardIdStr) {
            console.error("[directCommand] Invalid .getForward command - no forward ID provided")
            sock.sendMessage(jid, { 
                text: "Invalid format. Usage:\n.getForward <forwardId>\n\nExample:\n.getForward 1" 
            }, { quoted: msg })
            return
        }

        const forwardId = parseInt(forwardIdStr)

        if (isNaN(forwardId)) {
            console.error("[directCommand] Invalid .getForward command - forward ID is not a number")
            sock.sendMessage(jid, { 
                text: "Forward ID must be a number.\n\nUsage:\n.getForward <forwardId>" 
            }, { quoted: msg })
            return
        }

        try {
            const forward = await prismaStorage.getForward(forwardId)

            if (!forward) {
                sock.sendMessage(jid, { 
                    text: `Forward item with ID ${forwardId} not found.` 
                }, { quoted: msg })
                return
            }

            const listenName = await cacheStorage.getGroupName(forward.listenId) ?? `[Unknown: ${forward.listenId}]`
            const sendName = await cacheStorage.getGroupName(forward.sendId) ?? `[Unknown: ${forward.sendId}]`

            let text = `Forward Item Details:\n\n`
            text += `ID: ${forward.id}\n`
            text += `Listen: ${listenName}\n`
            text += `Send to: ${sendName}\n\n`

            if (forward.rules.length > 0) {
                text += `Rules (${forward.rules.length}):\n`
                forward.rules.forEach((rule, index) => {
                    text += `${index + 1}. [ID: ${rule.id}] ${rule.title}\n`
                    text += `   ${rule.description}\n`
                    text += `   Prompt: ${rule.rule.substring(0, 100)}${rule.rule.length > 100 ? '...' : ''}\n\n`
                })
            } else {
                text += `No rules attached.\nThis forward item will forward ALL messages.`
            }

            sock.sendMessage(jid, { text: text.trim() }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to get forward item:", error)
            sock.sendMessage(jid, { 
                text: `Failed to get forward item. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    if (converstation.startsWith(".deleteForward")) {
        const parts = converstation.split(" ")
        const forwardIdStr = parts[1]

        if (!forwardIdStr) {
            console.error("[directCommand] Invalid .deleteForward command - no forward ID provided")
            sock.sendMessage(jid, { 
                text: "Invalid format. Usage:\n.deleteForward <forwardId>\n\nExample:\n.deleteForward 1" 
            }, { quoted: msg })
            return
        }

        const forwardId = parseInt(forwardIdStr)

        if (isNaN(forwardId)) {
            console.error("[directCommand] Invalid .deleteForward command - forward ID is not a number")
            sock.sendMessage(jid, { 
                text: "Forward ID must be a number.\n\nUsage:\n.deleteForward <forwardId>" 
            }, { quoted: msg })
            return
        }

        try {
            const deletedForward = await prismaStorage.deleteForwardItem(forwardId)

            const listenName = await cacheStorage.getGroupName(deletedForward.listenId) ?? `[Unknown: ${deletedForward.listenId}]`
            const sendName = await cacheStorage.getGroupName(deletedForward.sendId) ?? `[Unknown: ${deletedForward.sendId}]`

            sock.sendMessage(jid, { 
                text: `Forward item deleted successfully!\n\nID: ${deletedForward.id}\n${listenName} → ${sendName}` 
            }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to delete forward item:", error)
            sock.sendMessage(jid, { 
                text: `Failed to delete forward item. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    if (converstation.startsWith(".linkRule")) {
        const parts = converstation.split(" ")
        const forwardIdStr = parts[1]
        const ruleIdStr = parts[2]

        if (!forwardIdStr || !ruleIdStr) {
            console.error("[directCommand] Invalid .linkRule command - missing arguments")
            sock.sendMessage(jid, { 
                text: "Invalid format. Usage:\n.linkRule <forwardId> <ruleId>\n\nExample:\n.linkRule 1 2" 
            }, { quoted: msg })
            return
        }

        const forwardId = parseInt(forwardIdStr)
        const ruleId = parseInt(ruleIdStr)

        if (isNaN(forwardId) || isNaN(ruleId)) {
            console.error("[directCommand] Invalid .linkRule command - IDs must be numbers")
            sock.sendMessage(jid, { 
                text: "Both forward ID and rule ID must be numbers.\n\nUsage:\n.linkRule <forwardId> <ruleId>" 
            }, { quoted: msg })
            return
        }

        try {
            const updatedForward = await prismaStorage.linkRule(forwardId, ruleId)

            const listenName = await cacheStorage.getGroupName(updatedForward.listenId) ?? `[Unknown: ${updatedForward.listenId}]`
            const sendName = await cacheStorage.getGroupName(updatedForward.sendId) ?? `[Unknown: ${updatedForward.sendId}]`

            const linkedRule = updatedForward.rules.find(r => r.id === ruleId)

            sock.sendMessage(jid, { 
                text: `Rule linked successfully!\n\nForward: ${listenName} → ${sendName}\nRule: [${ruleId}] ${linkedRule?.title ?? 'Unknown'}\n\nTotal rules: ${updatedForward.rules.length}` 
            }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to link rule:", error)
            sock.sendMessage(jid, { 
                text: `Failed to link rule. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    if (converstation.startsWith(".unlinkRule")) {
        const parts = converstation.split(" ")
        const forwardIdStr = parts[1]
        const ruleIdStr = parts[2]

        if (!forwardIdStr || !ruleIdStr) {
            console.error("[directCommand] Invalid .unlinkRule command - missing arguments")
            sock.sendMessage(jid, { 
                text: "Invalid format. Usage:\n.unlinkRule <forwardId> <ruleId>\n\nExample:\n.unlinkRule 1 2" 
            }, { quoted: msg })
            return
        }

        const forwardId = parseInt(forwardIdStr)
        const ruleId = parseInt(ruleIdStr)

        if (isNaN(forwardId) || isNaN(ruleId)) {
            console.error("[directCommand] Invalid .unlinkRule command - IDs must be numbers")
            sock.sendMessage(jid, { 
                text: "Both forward ID and rule ID must be numbers.\n\nUsage:\n.unlinkRule <forwardId> <ruleId>" 
            }, { quoted: msg })
            return
        }

        try {
            const updatedForward = await prismaStorage.unlinkRule(forwardId, ruleId)

            const listenName = await cacheStorage.getGroupName(updatedForward.listenId) ?? `[Unknown: ${updatedForward.listenId}]`
            const sendName = await cacheStorage.getGroupName(updatedForward.sendId) ?? `[Unknown: ${updatedForward.sendId}]`

            sock.sendMessage(jid, { 
                text: `Rule unlinked successfully!\n\nForward: ${listenName} → ${sendName}\nRule ID: ${ruleId}\n\nRemaining rules: ${updatedForward.rules.length}` 
            }, { quoted: msg })
        } catch (error) {
            console.error("[directCommand] Failed to unlink rule:", error)
            sock.sendMessage(jid, { 
                text: `Failed to unlink rule. Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }, { quoted: msg })
        }
    }

    // ...

    // OUTDATED - TODO: Rewrite with new command structure using prismaStorage
    // All commands below are disabled until rewrite
    
    /*
    // !listenTo            =>  Set group to listen to according to the group id
    if (converstation.split(" ")[0] === ".listenTo") {
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
    if (converstation.split(" ")[0] === ".sendTo") {
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
    if (converstation.split(" ")[0] === ".removeSendTo") {
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
    if (converstation.split(" ")[0] === ".removeListenTo") {
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
    if (converstation === ".check") {
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
    */
}
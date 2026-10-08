import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { WAMessage } from "@whiskeysockets/baileys";
import { PrismaClient } from "../../generated/prisma/client"

type createRuleType = {
    title: string
    description: string
    rule: string
}

type deleteRuleType = number

type addForwardItemType = {
    listenId: string,
    sendId: string,
    rules: number[]
}

type deleteForwardType = number

type addMessageType = {
    forwardItemId: number,
    msg: WAMessage,
    mediaPath?: string | undefined
    mediaBase64?: string | undefined
}

type markAsSentType = number[]

export class PrismaStorage {
    private prisma: PrismaClient

    constructor() {
        const adapter = new PrismaMariaDb({
            host: process.env.DATABASE_HOST ?? "",
            user: process.env.DATABASE_USER ?? "",
            password: process.env.DATABASE_PASSWORD ?? "",
            database: process.env.DATABASE_NAME ?? ""
        })

        this.prisma = new PrismaClient({ adapter })
    }

    async createRule({ title, description, rule }: createRuleType) {
        try {
            const newRule = await this.prisma.sendRule.create({
                data: { title, description, rule }
            })

            console.log(`[PrismaStorage] Created rule: ${newRule.title} (ID: ${newRule.id})`)
            return newRule
        } catch (error) {
            console.error(`[PrismaStorage] Failed to create rule:`, error)
            throw error
        }
    }

    async deleteRule(id: deleteRuleType) {
        try {
            const rule = await this.prisma.sendRule.findUnique({
                where: { id },
                include: { forwardItems: true }
            })

            if (!rule) {
                throw new Error(`Rule with ID ${id} not found`)
            }

            if (rule.forwardItems.length > 0) {
                throw new Error(`Cannot delete rule "${rule.title}" - it is used by ${rule.forwardItems.length} forward item(s)`)
            }

            const deletedRule = await this.prisma.sendRule.delete({
                where: { id }
            })

            console.log(`[PrismaStorage] Deleted rule: ${deletedRule.title} (ID: ${deletedRule.id})`)
            return deletedRule
        } catch (error) {
            console.error(`[PrismaStorage] Failed to delete rule:`, error)
            throw error
        }
    }

    async getRules() {
        try {
            const rules = await this.prisma.sendRule.findMany({
                select: {
                    id: true,
                    title: true,
                    description: true
                }
            })

            console.log(`[PrismaStorage] Fetched ${rules.length} rules`)
            return rules
        } catch (error) {
            console.error(`[PrismaStorage] Failed to fetch rules:`, error)
            throw error
        }
    }

    async getRule(id: number) {
        try {
            const rule = await this.prisma.sendRule.findUnique({
                where: { id },
                include: {
                    forwardItems: {
                        select: {
                            id: true,
                            listenId: true,
                            sendId: true
                        }
                    }
                }
            })

            if (rule) {
                console.log(`[PrismaStorage] Fetched rule: ${rule.title} (ID: ${rule.id})`)
            } else {
                console.log(`[PrismaStorage] Rule with ID ${id} not found`)
            }

            return rule
        } catch (error) {
            console.error(`[PrismaStorage] Failed to fetch rule:`, error)
            throw error
        }
    }

    async addForwardItem({ listenId, sendId, rules }: addForwardItemType) {
        try {
            const newForwardItem = await this.prisma.forwardItem.create({
                data: {
                    listenId,
                    sendId,
                    rules: {
                        connect: rules.map(id => ({ id }))
                    }
                },
                include: {
                    rules: true
                }
            })

            console.log(`[PrismaStorage] Created forward item: ${newForwardItem.listenId} → ${newForwardItem.sendId} (ID: ${newForwardItem.id})`)
            return newForwardItem
        } catch (error) {
            console.error(`[PrismaStorage] Failed to create forward item:`, error)
            throw error
        }
    }

    async deleteForwardItem(id: deleteForwardType) {
        try {
            const deletedForwardItem = await this.prisma.forwardItem.delete({
                where: { id },
                include: {
                    rules: true
                }
            })

            console.log(`[PrismaStorage] Deleted forward item: ${deletedForwardItem.listenId} → ${deletedForwardItem.sendId} (ID: ${deletedForwardItem.id})`)
            return deletedForwardItem
        } catch (error) {
            console.error(`[PrismaStorage] Failed to delete forward item:`, error)
            throw error
        }
    }

    async getForwards(listenId?: string) {
        try {
            const forwards = await this.prisma.forwardItem.findMany({
                where: listenId ? { listenId } : {},
                select: {
                    id: true,
                    listenId: true,
                    sendId: true,
                    rules: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            })

            console.log(`[PrismaStorage] Fetched ${forwards.length} forward items${listenId ? ` for listenId: ${listenId}` : ''}`)
            return forwards
        } catch (error) {
            console.error(`[PrismaStorage] Failed to fetch forward items:`, error)
            throw error
        }
    }

    async getForward(id: number) {
        try {
            const forward = await this.prisma.forwardItem.findUnique({
                where: { id },
                include: {
                    rules: true
                }
            })

            if (forward) {
                console.log(`[PrismaStorage] Fetched forward item: ${forward.listenId} → ${forward.sendId} (ID: ${forward.id})`)
            } else {
                console.log(`[PrismaStorage] Forward item with ID ${id} not found`)
            }

            return forward
        } catch (error) {
            console.error(`[PrismaStorage] Failed to fetch forward item:`, error)
            throw error
        }
    }

    async linkRule(forwardId: number, ruleId: number) {
        try {
            const updatedForwardItem = await this.prisma.forwardItem.update({
                where: { id: forwardId },
                data: {
                    rules: {
                        connect: { id: ruleId }
                    }
                },
                include: {
                    rules: true
                }
            })

            console.log(`[PrismaStorage] Linked rule ${ruleId} to forward item ${forwardId}`)
            return updatedForwardItem
        } catch (error) {
            console.error(`[PrismaStorage] Failed to link rule:`, error)
            throw error
        }
    }

    async unlinkRule(forwardId: number, ruleId: number) {
        try {
            const updatedForwardItem = await this.prisma.forwardItem.update({
                where: { id: forwardId },
                data: {
                    rules: {
                        disconnect: { id: ruleId }
                    }
                },
                include: {
                    rules: true
                }
            })

            console.log(`[PrismaStorage] Unlinked rule ${ruleId} from forward item ${forwardId}`)
            return updatedForwardItem
        } catch (error) {
            console.error(`[PrismaStorage] Failed to unlink rule:`, error)
            throw error
        }
    }

    async addMessage({ forwardItemId, msg, mediaPath, mediaBase64 }: addMessageType) {
        try {
            const newMessage = await this.prisma.chat.create({
                data: {
                    forwardItemId,
                    msg: msg as any,
                    mediaPath: mediaPath ?? null,
                    mediaBase64: mediaBase64 ?? null,
                    isSent: false
                }
            })

            console.log(`[PrismaStorage] Added message to forward item ${forwardItemId} (Message ID: ${newMessage.id})`)
            return newMessage
        } catch (error) {
            console.error(`[PrismaStorage] Failed to add message:`, error)
            throw error
        }
    }

    async markAsSent(messageIds: markAsSentType) {
        try {
            const result = await this.prisma.chat.updateMany({
                where: {
                    id: { in: messageIds }
                },
                data: {
                    isSent: true
                }
            })

            console.log(`[PrismaStorage] Marked ${result.count} message(s) as sent`)
            return result.count
        } catch (error) {
            console.error(`[PrismaStorage] Failed to mark messages as sent:`, error)
            throw error
        }
    }

    async deleteMessages(messageIds: number[]) {
        try {
            const result = await this.prisma.chat.deleteMany({
                where: {
                    id: { in: messageIds }
                }
            })

            console.log(`[PrismaStorage] Deleted ${result.count} message(s) from chat history`)
            return result.count
        } catch (error) {
            console.error(`[PrismaStorage] Failed to delete messages:`, error)
            throw error
        }
    }

    async getChatsByIds(messageIds: number[]) {
        try {
            const chats = await this.prisma.chat.findMany({
                where: {
                    id: { in: messageIds }
                },
                orderBy: {
                    datetime: 'asc'
                }
            })

            console.log(`[PrismaStorage] Fetched ${chats.length} chat(s) by IDs`)
            return chats
        } catch (error) {
            console.error(`[PrismaStorage] Failed to fetch chats by IDs:`, error)
            throw error
        }
    }

    async getUnsentMessages() {
        try {
            const messages = await this.prisma.chat.findMany({
                where: {
                    isSent: false
                },
                include: {
                    forwardItem: {
                        include: {
                            rules: true
                        }
                    }
                },
                orderBy: {
                    datetime: 'asc'
                }
            })

            console.log(`[PrismaStorage] Fetched ${messages.length} unsent message(s)`)
            return messages
        } catch (error) {
            console.error(`[PrismaStorage] Failed to fetch unsent messages:`, error)
            throw error
        }
    }

    async getForwardsWithUnsentMessages() {
        try {
            const forwards = await this.prisma.forwardItem.findMany({
                where: {
                    chats: {
                        some: {
                            isSent: false
                        }
                    }
                },
                include: {
                    rules: true,
                    chats: {
                        where: {
                            isSent: false
                        },
                        orderBy: {
                            datetime: 'asc'
                        }
                    }
                }
            })

            console.log(`[PrismaStorage] Fetched ${forwards.length} forward item(s) with unsent messages`)
            return forwards
        } catch (error) {
            console.error(`[PrismaStorage] Failed to fetch forwards with unsent messages:`, error)
            throw error
        }
    }

    async getForwardsWithMessages() {
        try {
            const forwards = await this.prisma.forwardItem.findMany({
                where: {
                    chats: {
                        some: {}
                    }
                },
                include: {
                    rules: true,
                    chats: {
                        orderBy: {
                            datetime: 'asc'
                        }
                    }
                }
            })

            console.log(`[PrismaStorage] Fetched ${forwards.length} forward item(s) with messages`)
            return forwards
        } catch (error) {
            console.error(`[PrismaStorage] Failed to fetch forwards with messages:`, error)
            throw error
        }
    }

    async disconnect() {
        try {
            await this.prisma.$disconnect()
            console.log(`[PrismaStorage] Disconnected from database`)
        } catch (error) {
            console.error(`[PrismaStorage] Failed to disconnect:`, error)
            throw error
        }
    }
}

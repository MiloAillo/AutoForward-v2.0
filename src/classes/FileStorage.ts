import type { PathLike } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { v4 as uuid } from 'uuid'

type ListenGroupsType = string[]

type ForwardRule = {
    id: string
    sendToGroupJID: string
    criteria: string
}

type ForwardRulesType = ForwardRule[]

class FileStorage {
    private listenGroups: PathLike
    private forwardRules: PathLike

    constructor() {
        this.listenGroups = "./storage/listenGroups.json"
        this.forwardRules = "./storage/forwardRules.json"
    }

    private async ensureStorageExists(): Promise<void> {
        const dir = path.dirname(this.listenGroups.toString())
        
        try {
            await fs.access(dir)
        } catch {
            await fs.mkdir(dir, { recursive: true })
        }

        try {
            await fs.access(this.listenGroups)
        } catch {
            await fs.writeFile(this.listenGroups, JSON.stringify([]), 'utf-8')
        }

        try {
            await fs.access(this.forwardRules)
        } catch {
            await fs.writeFile(this.forwardRules, JSON.stringify([]), 'utf-8')
        }
    }
    
    async getListenGroups(): Promise<ListenGroupsType> {
        await this.ensureStorageExists()

        const listenGroups = await fs.readFile(this.listenGroups, 'utf-8')
        const parsed = JSON.parse(listenGroups) as ListenGroupsType

        console.log(`[FileStorage] fetched listen groups`)

        return parsed
    }

    async deleteGroup(index: number): Promise<void> {
        const groups = await this.getListenGroups()

        if (index < 0 || index >= groups.length) {
            throw new Error(`GROUP_INDEX_OUT_OF_BOUNDS: Index ${index} is out of bounds for array length ${groups.length}`)
        }

        groups.splice(index, 1)
        await fs.writeFile(this.listenGroups, JSON.stringify(groups, null, 2), 'utf-8')

        console.log(`[FileStorage] deleted group at index ${index}`)
    }

    async addGroup(group: string): Promise<void> {
        const groups = await this.getListenGroups()

        if (groups.includes(group)) {
            throw new Error(`GROUP_ALREADY_EXISTS: Group "${group}" already exists in listen groups`)
        }

        groups.push(group)
        await fs.writeFile(this.listenGroups, JSON.stringify(groups, null, 2), 'utf-8')

        console.log(`[FileStorage] added group "${group}"`)
    }

    async deleteAllGroups(): Promise<void> {
        await this.ensureStorageExists()
        await fs.writeFile(this.listenGroups, JSON.stringify([]), 'utf-8')

        console.log(`[FileStorage] deleted all groups`)
    }

    async removeListenGroup(groupJID: string): Promise<void> {
        const groups = await this.getListenGroups()

        const index = groups.indexOf(groupJID)
        if (index === -1) {
            throw new Error(`LISTEN_GROUP_NOT_FOUND: Group "${groupJID}" is not in listen groups`)
        }

        groups.splice(index, 1)
        await fs.writeFile(this.listenGroups, JSON.stringify(groups, null, 2), 'utf-8')

        console.log(`[FileStorage] removed listen group "${groupJID}"`)
    }

    async getForwardRules(): Promise<ForwardRulesType> {
        await this.ensureStorageExists()

        const forwardRules = await fs.readFile(this.forwardRules, 'utf-8')
        const parsed = JSON.parse(forwardRules) as ForwardRulesType

        console.log(`[FileStorage] fetched forward rules`)

        return parsed
    }

    async addForwardRule(sendToGroupJID: string, criteria: string): Promise<void> {
        const rules = await this.getForwardRules()

        const existingRule = rules.find(rule => rule.sendToGroupJID === sendToGroupJID)
        if (existingRule) {
            throw new Error(`FORWARD_RULE_ALREADY_EXISTS: Group "${sendToGroupJID}" already has a forward rule`)
        }

        const newRule: ForwardRule = {
            id: uuid(),
            sendToGroupJID,
            criteria
        }

        rules.push(newRule)
        await fs.writeFile(this.forwardRules, JSON.stringify(rules, null, 2), 'utf-8')

        console.log(`[FileStorage] added forward rule for group "${sendToGroupJID}" with criteria "${criteria}"`)
    }

    async removeForwardRule(sendToGroupJID: string): Promise<void> {
        const rules = await this.getForwardRules()

        const index = rules.findIndex(rule => rule.sendToGroupJID === sendToGroupJID)
        if (index === -1) {
            throw new Error(`FORWARD_RULE_NOT_FOUND: No forward rule found for group "${sendToGroupJID}"`)
        }

        rules.splice(index, 1)
        await fs.writeFile(this.forwardRules, JSON.stringify(rules, null, 2), 'utf-8')

        console.log(`[FileStorage] removed forward rule for group "${sendToGroupJID}"`)
    }

    async deleteAllForwardRules(): Promise<void> {
        await this.ensureStorageExists()
        await fs.writeFile(this.forwardRules, JSON.stringify([]), 'utf-8')

        console.log(`[FileStorage] deleted all forward rules`)
    }
}

export default FileStorage
import type { PathLike } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

type ListenGroupsType = string[]

class FileStorage {
    private listenGroups: PathLike

    constructor() {
        this.listenGroups = "./storage/listenGroups.json"
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
}

export default FileStorage
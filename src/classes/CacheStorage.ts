import NodeCache from "node-cache";
import { socket } from "../../index.js";
import type { GroupMetadata } from "@whiskeysockets/baileys";

export class CacheStorage {
    private groups: NodeCache;

    constructor() {
        this.groups = new NodeCache({ stdTTL: 5 * 60, useClones: false });
    }

    /**
     * Fetches and caches all participating groups.
     */
    async getGroups(): Promise<Record<string, GroupMetadata>> {
        let cachedGroups = this.groups.get<Record<string, GroupMetadata>>('groups');

        if (!cachedGroups) {
            const sock = socket.getSocket();
            if (!sock) {
                throw new Error("Socket is not initialized or connected.");
            }

            cachedGroups = await sock.groupFetchAllParticipating();
            this.groups.set('groups', cachedGroups);
        }

        return cachedGroups;
    }

    /**
     * Retrieves a specific group's subject/name by JID.
     */
    async getGroupName(jid: string): Promise<string | undefined> {
        const groups = await this.getGroups();
        return groups[jid]?.subject;
    }

    /**
     * Clears cached group data manually (useful on events or updates).
     */
    clearGroupCache(): void {
        this.groups.del('groups');
    }
}
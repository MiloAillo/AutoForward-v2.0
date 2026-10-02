import NodeCache from "node-cache";
import type { Boom } from "@hapi/boom";
import makeWASocket, { Browsers, DisconnectReason, fetchLatestWaWebVersion, useMultiFileAuthState } from "@whiskeysockets/baileys";
import type { GroupMetadata, WASocket as BaileysSocket } from "@whiskeysockets/baileys";
import P from 'pino'
import qrcode from 'qrcode-terminal'
import { v4 as uuid } from 'uuid'

export class WASocket {
    private socket!: BaileysSocket
    private id!: string
    
    private authState!: Awaited<ReturnType<typeof useMultiFileAuthState>>
    private groupCache: NodeCache
    private logger: ReturnType<typeof P>
    private waVersion?: Awaited<ReturnType<typeof fetchLatestWaWebVersion>>
    private isInitialized = false
    private initPromise: Promise<void>

    constructor() {
        this.groupCache = new NodeCache({ stdTTL: 15 * 60, useClones: false })
        this.logger = P({ level: "silent" })
        this.initPromise = this.init().catch(err => {
            console.error(`[ ${this.id} WASocket] Initialization failed:`, err)
            process.exit(1)
        })
    }

    async waitForConnection(): Promise<void> {
        await this.initPromise
        return new Promise((resolve) => {
            if (this.isInitialized && this.socket) {
                resolve()
            } else {
                const checkConnection = ({ connection }: { connection?: string }) => {
                    if (connection === 'open') {
                        this.socket.ev.off('connection.update', checkConnection)
                        resolve()
                    }
                }
                this.socket.ev.on('connection.update', checkConnection)
            }
        })
    }

    async init() {
        if (this.socket) {
            this.socket.ev.removeAllListeners('connection.update')
            this.socket.ev.removeAllListeners('creds.update')
            this.socket.ev.removeAllListeners('groups.update')
            this.socket.ev.removeAllListeners('group-participants.update')
            this.socket.end(undefined)
        }

        this.id = uuid()

        if (!this.authState) {
            this.authState = await useMultiFileAuthState('auth')
        }

        if (!this.waVersion) {
            this.waVersion = await fetchLatestWaWebVersion()
        }

        const socket = makeWASocket({
            auth: this.authState.state,
            version: this.waVersion.version,
            browser: Browsers.appropriate("Auto Forward"),
            logger: this.logger,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            cachedGroupMetadata: async (jid) => 
                this.groupCache.get(jid) as GroupMetadata | undefined
        })

        this.socket = socket
        this.isInitialized = true
        this.registerEvents()
    }

    private registerEvents() {
        this.socket.ev.on('groups.update', async ([event]) => {
            if (!event?.id) return
            const metadata = await this.socket.groupMetadata(event.id)
            this.groupCache.set(event.id, metadata)
        })

        this.socket.ev.on('group-participants.update', async (event) => {
            if (!event?.id) return
            const metadata = await this.socket.groupMetadata(event.id)
            this.groupCache.set(event.id, metadata)
        })

        this.socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                qrcode.generate(qr, { small: true })
            }

            if (connection === 'open') {
                console.log(`[${this.id} WASocket] WhatsApp Connection Ready`)
            }

            if (connection === "close") {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut

                if (shouldReconnect) {
                    console.log(`[${this.id} WASocket] Reconnecting... (status: ${statusCode})`)
                    this.init().catch(err => {
                        console.error(`[${this.id} WASocket] Reconnection failed:`, err)
                        process.exit(1)
                    })
                } else {
                    console.log(`[WASocket ${this.id}] Logged out. Delete auth folder and restart.`)
                    process.exit(0)
                }
            }
        })

        this.socket.ev.on('creds.update', this.authState.saveCreds)
    }

    public getSocket(): BaileysSocket {
        if (!this.isInitialized || !this.socket) {
            throw new Error(`[${this.id ?? "Not Initialized"} WASocket] Socket not initialized. Wait for connection to open.`)
        }
        return this.socket
    }

    public async destroy() {
        if (this.socket) {
            this.socket.ev.removeAllListeners('connection.update')
            this.socket.ev.removeAllListeners('creds.update')
            this.socket.ev.removeAllListeners('groups.update')
            this.socket.ev.removeAllListeners('group-participants.update')
            this.socket.end(undefined)
        }
        this.groupCache.close()
        console.log(`[${this.id} WASocket] Cleanup complete`)
    }
}
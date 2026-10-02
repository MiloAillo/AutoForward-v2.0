export function isCommand(msg: string) {
    const isPrefix = "!" === msg.split("")[0]
    const notStandalone = msg.length !== 1

    return isPrefix && notStandalone
}
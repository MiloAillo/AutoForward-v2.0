import type { WAMessage } from "@whiskeysockets/baileys";
import { fileStorage, socket, cacheStorage, modelProvider } from "../../index.js";
import type OpenAI from "openai";

export async function forward(msg: WAMessage) {
    const sock = socket.getSocket()
    const forwardRules = await fileStorage.getForwardRules()

    if (forwardRules.length === 0) {
        console.log("[forward] No forward rules configured")
        return
    }

    for (const rule of forwardRules) {
        const groupName = await cacheStorage.getGroupName(rule.sendToGroupJID) ?? "[Unknown Group]"
            
        const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
            {
                type: "function",
                function: {
                name: "sendMessage",
                description: "Send a message back to the WhatsApp chat when the user request requires a response.",
                parameters: {
                    type: "object",
                    properties: {
                    text: {
                        type: "string",
                        description: "The complete text response to send to the user.",
                    },
                    },
                    required: ["text"],
                },
                },
            },
            {
                type: "function",
                function: {
                name: "skipMessage",
                description: "Skip responding to the message if it fails criteria (e.g. spam, irrelevant, or non-actionable).",
                parameters: {
                    type: "object",
                    properties: {
                    reason: {
                        type: "string",
                        description: "Brief reason why the message is skipped.",
                    },
                    },
                    required: ["reason"],
                },
                },
            },
        ];

        const response = await modelProvider.chat.completions.create({
            model: "ultimate",
            tools: tools,
            tool_choice: "required",
            messages: [
                {
                    role: "system",
                    content: `You are a WhatsApp bot decision engine. 
                        Criteria to send: ${rule.criteria}.
                        Criteria to skip: if it doesnt met the criteria or the chat is empty`
                },
                {
                    role: "user",
                    content: msg.message?.conversation ?? ""
                }
            ]
        })

        const toolCall = response.choices[0]?.message?.tool_calls?.[0]

        if (!toolCall || toolCall.type !== "function") {
            console.log("[forward] Critical Model Failure. No tool call returned.")
            return
        }

        const functionName = toolCall.function.name;

        switch (functionName) {
            case "sendMessage": {
                try {
                    await sock.sendMessage(rule.sendToGroupJID, { forward: msg })
                    console.log(`[forward] Forwarded message to ${groupName}`)
                } catch (error) {
                    console.error(`[forward] Failed to forward to ${groupName}:`, error)
                }

                break;
            }

            case "skipMessage": {
                console.log(`[forward] Skipping message for ${groupName}`);

                break;
            }

            default:
                console.warn("[forward] Unknown function called:", functionName);
        }
    }
}
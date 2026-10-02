import type { WAMessage } from "@whiskeysockets/baileys";
import { modelProvider } from "../../index.js";
import type OpenAI from "openai";

type DecisionResult = {
    shouldForward: boolean
    reason?: string
}

export async function shouldForwardMessage(msg: WAMessage, criteria: string): Promise<DecisionResult> {
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
                description: "Skip responding to the message if it fails criteria",
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
        model: process.env.AI_MODEL_NAME || "ultimate",
        tools: tools,
        tool_choice: "required",
        messages: [
            {
                role: "system",
                content: `You are a WhatsApp bot decision engine. 
                    Criteria to send: ${criteria}.
                    Criteria to skip: if it doesnt met the criteria or the chat is empty.`
            },
            {
                role: "user",
                content: msg.message?.conversation ?? ""
            }
        ]
    })

    const toolCall = response.choices[0]?.message?.tool_calls?.[0]

    if (!toolCall || toolCall.type !== "function") {
        console.log("[aiDecision] Critical Model Failure. No tool call returned.")
        return { shouldForward: false, reason: "Model failure" }
    }

    const functionName = toolCall.function.name;

    switch (functionName) {
        case "sendMessage": {
            return { shouldForward: true }
        }

        case "skipMessage": {
            const args = JSON.parse(toolCall.function.arguments)
            return { shouldForward: false, reason: args.reason }
        }

        default:
            console.warn("[aiDecision] Unknown function called:", functionName);
            return { shouldForward: false, reason: "Unknown function" }
    }
}

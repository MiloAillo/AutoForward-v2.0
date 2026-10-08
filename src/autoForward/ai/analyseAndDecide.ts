import type OpenAI from "openai";
import type { aiReadyFormatter } from "../../helper/aiReadyFormatter";
import { modelProvider, prismaStorage } from "../../..";
import { forwardMessages, sendMediaWithCaption, writeMessages } from "../message/messageSender";
import type { WAMessage } from "@whiskeysockets/baileys";

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "forwardMessages",
            description: "Forward original WhatsApp messages unchanged to the target group",
            parameters: {
                type: "object",
                properties: {
                    messageIds: {
                        type: "array",
                        items: { type: "number" },
                        description: "Database IDs of messages to forward"
                    }
                },
                required: ["messageIds"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "writeMessages",
            description: "Send AI-written text messages (no media)",
            parameters: {
                type: "object",
                properties: {
                    texts: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of text messages to send"
                    }
                },
                required: ["texts"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "writeMessagesWithMedia",
            description: "Send AI-written text messages with media files attached (caption required)",
            parameters: {
                type: "object",
                properties: {
                    mediaItems: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                mediaPath: {
                                    type: "string",
                                    description: "The media file name from the message (e.g., 'image_1728234567.jpg')"
                                },
                                caption: {
                                    type: "string",
                                    description: "Text caption to send with the media"
                                }
                            },
                            required: ["mediaPath", "caption"]
                        },
                        description: "Array of media items with captions"
                    }
                },
                required: ["mediaItems"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "sendMedia",
            description: "Send media files without any caption (media only)",
            parameters: {
                type: "object",
                properties: {
                    mediaPaths: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of media file names to send (e.g., ['image_1728234567.jpg', 'video_1728234568.mp4'])"
                    }
                },
                required: ["mediaPaths"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "skipMessages",
            description: "Skip sending anything. [ONLY USE THIS WHEN YOU DONT HAVE ANYTHING TO WRITE OR SEND]",
            parameters: {
                type: "object",
                properties: {
                    reason: {
                        type: "string",
                        description: "Brief explanation of why you skipped"
                    }
                },
                required: ["reason"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "markMessagesAsSent",
            description: "mark messages as sent (acknowledged), so you know which have been sent in the future [ALWAYS CALL THIS IF FORWARDING OR SENDING MESSAGES]",
            parameters: {
                type: "object",
                properties: {
                    messageIds: {
                        type: "array",
                        items: { type: "number" },
                        description: "Database IDs of messages to mark it as sent"
                    }
                },
                required: ["messageIds"]
            }
        }
    }
] 

export async function analyzeAndDecide(object: Awaited<ReturnType<typeof aiReadyFormatter>>) {
    console.log(`[analyseAndDecide] Fetching model response`)

    try {
        const response = await modelProvider.chat.completions.create({
            model: process.env.AI_MODEL_NAME || "ultimate",
            tools: tools,
            tool_choice: "required",
            messages: [
                {
                    role: "system",
                    content: `You are an intelligent WhatsApp message router and analyzer. Your job is to:
1. Analyze messages from a source group
2. Decide which messages to forward to a target group based on rules
3. Transform or summarize messages when needed
4. Track conversation state across multiple batches
5. Avoid duplicate information

AVAILABLE ACTIONS:

• forwardMessages(messageIds[]) - Forward original messages unchanged
  Use when: Message is relevant and doesn't need modification

• writeMessages(texts[]) - Send your own AI-written messages
  Use when: Summarizing, adding context, or explaining information

• writeMessagesWithMedia(mediaItems[]) - Send media with modified captions
  Use when: Image/video is relevant but caption needs rewriting

• sendMedia(mediaPaths[]) - Send media without captions
  Use when: Image/video is self-explanatory, no text needed

• markMessagesAsSent(messageIds[]) - Mark messages as processed
  REQUIRED: Call this for any message you forward, summarize, or reference
  Purpose: Prevents duplicate forwarding in future batches

• skipMessages(reason) - Skip this entire batch
  Use when: Waiting for more context (e.g., question without answer)
  Messages will reappear in next batch

MESSAGE STATE TRACKING:

Each message has an "isSent" field:
- isSent: false → New/unprocessed message
- isSent: true → Already forwarded/processed in a previous batch

IMPORTANT: Check isSent before forwarding to avoid duplicates!

DECISION FRAMEWORK:

1. Read all messages and check their isSent status
2. Check if messages match the forwarding rules
3. Decide action:
   - FORWARD if relevant and isSent: false, no modification needed
   - SUMMARIZE if multiple related messages or referencing already-sent info
   - SKIP if incomplete context (waiting for more messages)
   - ALWAYS markMessagesAsSent for processed messages

FORWARDING RULES:

${object.rules.map((rule, i) => `[Rule ${i+1}] ${rule.title}
Description: ${rule.description}
Instructions: ${rule.rule}`).join('\n\n')}

Messages that don't match ANY rule should be marked as sent without forwarding.

COMMON SCENARIOS:

1. Question & Answer Pairing:
   Batch 1: "What's the weather?" (isSent: false)
   → skipMessages("Waiting for answer")
   
   Batch 2: "What's the weather?" (isSent: false), "Sunny 25°C" (isSent: false)
   → writeMessages(["Q: Weather? A: Sunny 25°C"]) + markMessagesAsSent([both])

2. Duplicate Prevention:
   Message [1] "Meeting at 3pm" (isSent: true)
   Message [5] "When is the meeting?" (isSent: false)
   → writeMessages(["Meeting is at 3pm (previously shared)"]) + markMessagesAsSent([5])
   → DON'T forward message [1] again!

3. Spam Filtering:
   Message "BUY NOW! 50% OFF!" (isSent: false)
   → markMessagesAsSent([msg_id]) without forwarding
   → DON'T use skipMessages (would reappear)

CRITICAL RULES:

1. ALWAYS call markMessagesAsSent for processed messages
2. Check isSent: true to avoid duplicate forwards
3. Use skipMessages ONLY when waiting for more context
4. Analyze images when present (vision enabled)
5. Follow forwarding rules strictly
6. When in doubt, prefer summarizing over direct forwarding`
                },
                {
                    role: "user",
                    content: [
                        {type: "text", text: JSON.stringify(object.forwardItem.chats)},
                        ...object.images.map(image => ({
                            type: "image_url" as const,
                            image_url: {
                                url: image
                            }
                        }))
                    ]
                }
            ]
        })

        const toolCalls = response.choices[0]?.message?.tool_calls

        if (!toolCalls || toolCalls.length === 0) {
            console.log("[analyseAndDecide] Critical Model Failure. No tool call returned.")
            return
        }
    
        for (const toolCall of toolCalls) {
            if (toolCall.type !== "function") {
                console.log("[analyseAndDecide] Critical Model Failure. toolCall is not a function.")
                continue
            }
    
            const functionName = toolCall.function.name
            const args = JSON.parse(toolCall.function.arguments)
    
            switch (functionName) {
                case "forwardMessages":
                    const messageIds = args.messageIds as number[]
                    const chats = await prismaStorage.getChatsByIds(messageIds)
                    const msgs = chats.map(chat => chat.msg as unknown as WAMessage)
                    
                    console.log(`[AnalyseAndDecide] Forwarding ${msgs.length} message(s)`)
                    await forwardMessages(msgs, object.forwardItem.sendToGroupId)
                    break
            
                case "writeMessages":
                    const texts = args.texts as string[]
    
                    console.log(`[AnalyseAndDecide] Sending ${texts.length} text(s)`)
                    await writeMessages(texts, object.forwardItem.sendToGroupId)
                    break
    
                case "writeMessagesWithMedia":
                    const rawItems = args.mediaItems as {mediaPath: string, caption: string}[]
                    
                    // Look up mediaType from original chats
                    const items = rawItems.map(item => {
                        const chat = object.forwardItem.chats.find(c => c.mediaPath === item.mediaPath)
                        const mediaType = chat?.msg?.message?.videoMessage ? "video" : "image"
                        
                        return {
                            mediaPath: item.mediaPath,
                            mediaType: mediaType as "image" | "video",
                            caption: item.caption
                        }
                    })
    
                    console.log(`[AnalyseAndDecide] Sending ${items.length} media with caption(s)`)
                    await sendMediaWithCaption(items, object.forwardItem.sendToGroupId)
                    break
    
                case "sendMedia":
                    const mediaPaths = args.mediaPaths as string[]
                    
                    // Look up mediaType from original chats
                    const mediaItems = mediaPaths.map(mediaPath => {
                        const chat = object.forwardItem.chats.find(c => c.mediaPath === mediaPath)
                        const mediaType = chat?.msg?.message?.videoMessage ? "video" : "image"
                        
                        return {
                            mediaPath: mediaPath,
                            mediaType: mediaType as "image" | "video",
                            caption: ""  // Empty caption for media-only
                        }
                    })
                    
                    console.log(`[AnalyseAndDecide] Sending ${mediaItems.length} media without caption`)
                    await sendMediaWithCaption(mediaItems, object.forwardItem.sendToGroupId)
                    break
    
                case "markMessagesAsSent":
                    const ids = args.messageIds as number[]
    
                    await prismaStorage.markAsSent(ids)
                    console.log(`[AnalyseAndDecide] Marking ${ids.length} message(s) as sent`)
                    break
    
                case "skipMessages":
                    const reason = args.reason as string
    
                    console.log(`[analyseAndDecide] ${object.forwardItem.chats.length} message(s) turned down. Reason: ${reason}`)
                    break

                default:
                    console.log(`[analyseAndDecide] Critical Model Failure. toolCall is an unknown value`)
                    break
                }
        }
    } catch (error) {
        console.log(`[analyseAndDecide] Critical Error. Failed to fetch model response. Error:`, error)
    }
}
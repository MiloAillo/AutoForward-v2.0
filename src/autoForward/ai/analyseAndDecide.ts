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
            description: "Forward original WhatsApp messages unchanged to the target group. Messages are automatically marked as sent after forwarding.",
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
            description: "Send AI-written text messages (no media). Use this to summarize, combine, or rewrite messages.",
            parameters: {
                type: "object",
                properties: {
                    texts: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of text messages to send"
                    },
                    sourceMessageIds: {
                        type: "array",
                        items: { type: "number" },
                        description: "Database IDs of the source messages you are summarizing/processing (will be auto-marked as sent)"
                    }
                },
                required: ["texts", "sourceMessageIds"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "writeMessagesWithMedia",
            description: "Send AI-written text messages with media files attached (caption required). Media messages are automatically marked as sent after sending.",
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
            description: "Send media files without any caption (media only). Media messages are automatically marked as sent after sending.",
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
            description: "Manually mark messages as sent without forwarding them (e.g., for spam/irrelevant messages). Use this for messages that don't match rules or should be filtered out.",
            parameters: {
                type: "object",
                properties: {
                    messageIds: {
                        type: "array",
                        items: { type: "number" },
                        description: "Database IDs of messages to mark as sent without forwarding"
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
  Messages are automatically marked as sent after forwarding

• writeMessages(texts[], sourceMessageIds[]) - Send your own AI-written messages
  Provide sourceMessageIds to mark the original messages you're summarizing as sent

• writeMessagesWithMedia(mediaItems[]) - Send media with modified captions
  Media messages are automatically marked as sent after sending

• sendMedia(mediaPaths[]) - Send media without captions
  Media messages are automatically marked as sent after sending

• markMessagesAsSent(messageIds[]) - Mark messages as sent WITHOUT forwarding them
  Use for spam/irrelevant messages that don't match rules

• skipMessages(reason) - Skip this entire batch
  Use when: Waiting for more context (e.g., question without answer)
  Messages will reappear in next batch

MESSAGE STATE TRACKING:

All messages in this batch are UNSENT (isSent: false) and need to be processed.

After processing messages, they are automatically marked as sent:
- forwardMessages() → auto-marks forwarded messages
- writeMessages() → auto-marks source messages (via sourceMessageIds)
- sendMedia() / writeMessagesWithMedia() → auto-marks media messages

If you need context from previous batches, you won't have access to it in this system. Make decisions based only on the current batch of unsent messages.

MULTIPLE MESSAGES & FRAGMENTATION:

When you receive multiple messages (3+ messages in a batch):
- Analyze if they're related or about different topics
- Prefer summarization over forwarding individual messages
- Group messages by topic/subject before processing

Signs to SUMMARIZE instead of forward:
- 3+ short messages in quick succession
- Multiple topics discussed across messages
- Fragmented conversation (one thought split across multiple messages)
- List-like items (borrowing multiple things, multiple announcements)

Example:
Messages: "Bawa laptop", "Charger juga", "Kunci lab", "Hari ini UKK lab 1"
→ DON'T forward 4 separate messages
→ DO summarize: writeMessages(["📝 Dibawa: laptop, charger, kunci lab\n📅 Info: UKK hari ini di lab 1"])

When multiple topics appear:
- Group by topic and create organized summary
- Use clear formatting (emojis, sections, bullet points)
- Combine related information into coherent messages

QUESTION & ANSWER HANDLING:

If you detect a message that appears to be asking for information or seeking a response:
- First batch: Use skipMessages("Waiting for answer/response")
- Next batch: Once response appears, decide:
  * Short Q&A → forwardMessages (both original messages)
  * Long/complex Q&A → writeMessages (your summary including BOTH question and answer)

Question indicators (loose guidance, not strict rules):
- Ends with "?" 
- Seeks information, clarification, or confirmation
- Conversational tone suggesting response expected

DO NOT treat as questions:
- Rhetorical questions in announcements ("Siapa yang mau ikut? Daftar di link")
- Questions immediately followed by answer in same message
- Informational statements that happen to contain "?"

DECISION FRAMEWORK:

1. Read all messages in the batch (all are unsent, need processing)
2. Detect if batch contains unanswered questions → skipMessages if so
3. Evaluate message volume and fragmentation:
   - 3+ messages → strongly consider summarization
   - Multiple topics → group by topic and summarize
   - Fragmented conversation → combine into coherent summary
4. Check if messages match the forwarding rules
5. Decide action:
   - SKIP if incomplete context (question without answer)
   - FORWARD if 1-2 clear, simple messages
   - SUMMARIZE if 3+ messages, multiple topics, or lengthy Q&A pairs
   - MARK SENT for spam/irrelevant (without forwarding)

FORWARDING RULES:

${object.rules.map((rule, i) => `[Rule ${i+1}] ${rule.title}
Description: ${rule.description}
Instructions: ${rule.rule}`).join('\n\n')}

Messages that don't match ANY rule should be marked as sent without forwarding.

COMMON SCENARIOS:

1. Question & Answer Pairing:
   Batch 1: "Kapan deadline tugas?" (unsent) ← Appears to be seeking answer
   → skipMessages("Waiting for answer about deadline")
   
   Batch 2: "Kapan deadline tugas?" (unsent), "Jumat besok jam 11:59" (unsent)
   → Short exchange: forwardMessages([both])
   → OR if its a bit lengthy: writeMessages(["Q: Kapan deadline? A: Jumat jam 11:59"], sourceMessageIds: [both])
   
   You decide: forward originals vs summarize based on length/complexity

2. Spam Filtering:
   Message "BUY NOW! 50% OFF!" (unsent)
   → markMessagesAsSent([msg_id]) without forwarding
   → DON'T use skipMessages (would reappear)

3. Complete Action Flow - Automatic Marking:
   All sending actions automatically mark messages as sent - you don't need to call markMessagesAsSent separately!
   
   Example 1 - Summarizing:
   → writeMessages(["Summary text"], sourceMessageIds: [1, 2, 3])
   → Messages [1, 2, 3] are auto-marked as sent ✓
   
   Example 2 - Forwarding:
   → forwardMessages([5, 6])
   → Messages [5, 6] are auto-marked as sent ✓
   
   Example 3 - Media with caption:
   → writeMessagesWithMedia([{mediaPath: "img.jpg", caption: "Text"}])
   → Media message is auto-marked as sent ✓
   
   Only use markMessagesAsSent() manually for spam/irrelevant messages you want to ignore without forwarding.

CRITICAL RULES:

1. Messages are automatically marked as sent after sending - no manual marking needed
2. All messages in the batch are unsent and need processing
3. Make decisions based only on current batch - no historical context available
4. Use skipMessages when:
   - Waiting for question to be answered
   - Waiting for more context/conversation to develop
5. Question detection is LOOSE and context-aware:
   - Not strict pattern matching
   - Consider conversational context
   - Rhetorical questions in announcements ≠ questions
6. Message volume guidance:
   - 1-2 messages: Consider forwarding if clear
   - 3+ messages: Strongly prefer summarization
   - Multiple topics: Group and summarize per topic
   - Fragmented thoughts: Combine into coherent message
7. Follow forwarding rules strictly
8. When deciding between forward vs summarize: consider length, clarity, and message count`
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
            console.log("[analyseAndDecide] Marking all messages as sent to prevent infinite loop.")
            
            const allMessageIds = object.forwardItem.chats.map(chat => chat.id)
            await prismaStorage.markAsSent(allMessageIds)
            
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
                    
                    // Automatically mark forwarded messages as sent
                    await prismaStorage.markAsSent(messageIds)
                    console.log(`[AnalyseAndDecide] Auto-marked ${messageIds.length} forwarded message(s) as sent`)
                    break
            
                case "writeMessages":
                    const texts = args.texts as string[]
                    const sourceMessageIds = args.sourceMessageIds as number[] | undefined
    
                    console.log(`[AnalyseAndDecide] Sending ${texts.length} text(s)`)
                    await writeMessages(texts, object.forwardItem.sendToGroupId)
                    
                    // Automatically mark source messages as sent
                    if (sourceMessageIds && sourceMessageIds.length > 0) {
                        await prismaStorage.markAsSent(sourceMessageIds)
                        console.log(`[AnalyseAndDecide] Auto-marked ${sourceMessageIds.length} source message(s) as sent`)
                    }
                    break
    
                case "writeMessagesWithMedia":
                    const rawItems = args.mediaItems as {mediaPath: string, caption: string}[]
                    
                    // Look up mediaType from original chats and collect message IDs
                    const items = rawItems.map(item => {
                        const chat = object.forwardItem.chats.find(c => c.mediaPath === item.mediaPath)
                        const mediaType = chat?.msg?.message?.videoMessage ? "video" : "image"
                        
                        return {
                            mediaPath: item.mediaPath,
                            mediaType: mediaType as "image" | "video",
                            caption: item.caption
                        }
                    })
                    
                    // Collect message IDs for the media being sent
                    const mediaMessageIds = rawItems
                        .map(item => object.forwardItem.chats.find(c => c.mediaPath === item.mediaPath)?.id)
                        .filter((id): id is number => id !== undefined)
    
                    console.log(`[AnalyseAndDecide] Sending ${items.length} media with caption(s)`)
                    await sendMediaWithCaption(items, object.forwardItem.sendToGroupId)
                    
                    // Automatically mark media messages as sent
                    if (mediaMessageIds.length > 0) {
                        await prismaStorage.markAsSent(mediaMessageIds)
                        console.log(`[AnalyseAndDecide] Auto-marked ${mediaMessageIds.length} media message(s) as sent`)
                    }
                    break
    
                case "sendMedia":
                    const mediaPaths = args.mediaPaths as string[]
                    
                    // Look up mediaType from original chats and collect message IDs
                    const mediaItems = mediaPaths.map(mediaPath => {
                        const chat = object.forwardItem.chats.find(c => c.mediaPath === mediaPath)
                        const mediaType = chat?.msg?.message?.videoMessage ? "video" : "image"
                        
                        return {
                            mediaPath: mediaPath,
                            mediaType: mediaType as "image" | "video",
                            caption: ""  // Empty caption for media-only
                        }
                    })
                    
                    // Collect message IDs for the media being sent
                    const sendMediaMessageIds = mediaPaths
                        .map(mediaPath => object.forwardItem.chats.find(c => c.mediaPath === mediaPath)?.id)
                        .filter((id): id is number => id !== undefined)
                    
                    console.log(`[AnalyseAndDecide] Sending ${mediaItems.length} media without caption`)
                    await sendMediaWithCaption(mediaItems, object.forwardItem.sendToGroupId)
                    
                    // Automatically mark media messages as sent
                    if (sendMediaMessageIds.length > 0) {
                        await prismaStorage.markAsSent(sendMediaMessageIds)
                        console.log(`[AnalyseAndDecide] Auto-marked ${sendMediaMessageIds.length} media message(s) as sent`)
                    }
                    break
    
                case "markMessagesAsSent":
                    const ids = args.messageIds as number[]
    
                    await prismaStorage.markAsSent(ids)
                    console.log(`[AnalyseAndDecide] Manually marking ${ids.length} message(s) as sent`)
                    break
    
                case "skipMessages":
                    const reason = args.reason as string
    
                    console.log(`[analyseAndDecide] ${object.forwardItem.chats.length} message(s) skipped. Reason: ${reason}`)
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
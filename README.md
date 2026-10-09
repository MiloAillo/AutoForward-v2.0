# AutoForward v2.1b

Intelligent WhatsApp message routing bot powered by AI that can forward, summarize, or send files between groups based on customizable rules. Built with TypeScript and MySQL, it features sophisticated message analysis, batch processing, and complete media support (AI Vision is currently not supported.).

## Changelog
- Reusable rules with many-to-many relationships between listen groups and send groups.
- Migration from file based storage to Prisma ORM + MySQL database.
- Image, video, and document support.
- Replaced forward only mechanism to AI + rules driven to have the ability to summarize, send media, or forward multiple messages.
- implement cron job batch processing and cleanup with customisable time period

## Limitation
AI Vision currently not supported. Meaning any media message (image, video, documents) will not be processed directly to the AI.
The model can still see that there is a media message present but is unable to process what is inside.
The model can still forward or send the media message itself with the help of the file name and the unsent messages around it as additional context.

## Next Fix & Update
- Code refactor
- Cleanup saved files
- Assess if AI Vision support is viable

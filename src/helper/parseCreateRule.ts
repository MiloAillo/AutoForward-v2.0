export function parseCreateRule(text: string): { title: string; description: string; rule: string } | null {
    const content = text.replace(/^\.createRule\s+/, '').trim()
    
    if (!content) return null
    
    const parts = content.split('|').map(s => s.trim())
    
    if (parts.length !== 3) return null
    
    const [title, description, rule] = parts
    
    if (!title || !description || !rule) return null
    if (title.length > 50) return null
    if (description.length > 200) return null
    
    return { title, description, rule }
}
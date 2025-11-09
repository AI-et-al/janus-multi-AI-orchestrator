import 'dotenv/config';
import OpenAI from 'openai';
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
}
export const openai = new OpenAI({ apiKey });
export async function simpleChat(system, user) {
    const res = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
        ]
    });
    return res.choices[0]?.message?.content ?? '';
}
//# sourceMappingURL=openai.js.map
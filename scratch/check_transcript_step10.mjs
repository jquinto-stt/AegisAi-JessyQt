import fs from 'fs';
const content = fs.readFileSync('C:\\Users\\Jessy\\.gemini\\antigravity-ide\\brain\\987b6b84-8da6-433f-83ac-4ae9a3ed7359\\.system_generated\\logs\\transcript_full.jsonl', 'utf-8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('step_index":2828')) {
    const obj = JSON.parse(line);
    const text = obj.content;
    const step10Idx = text.indexOf('### Step 10');
    console.log(text.substring(step10Idx, step10Idx + 1200));
    break;
  }
}

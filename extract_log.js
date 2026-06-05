const fs = require('fs');

const logPath = 'C:/Users/Admin/.gemini/antigravity/brain/5d6ebdc5-8a41-486e-bbc7-704c2cd7414a/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(logPath, 'utf8').split('\n');

let fullOriginalContent = "";

for (let line of lines) {
    if (!line) continue;
    try {
        const j = JSON.parse(line);
        if (j.type === 'VIEW_FILE' && j.content) {
            // view_file output looks like "1: line1\n2: line2"
            // Let's strip the line numbers and append
            const cleanContent = j.content.split('\n').map(l => {
                const match = l.match(/^\d+:(.*)$/);
                return match ? match[1] : l;
            }).join('\n');
            
            fullOriginalContent += cleanContent + '\n';
        }
    } catch(e) {}
}

fs.writeFileSync('d:/Projects/CamoSignal/CamoSignal/reconstructed_original.liquid', fullOriginalContent);
console.log('Done!');

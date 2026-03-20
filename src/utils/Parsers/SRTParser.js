export const SRTParser = {
    async parse(file) {
        const text = typeof file.text === 'function' ? await file.text() : file;
        
        // Normalize line endings
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Split by blocks separated by double newlines
        const blocks = normalizedText.split(/\n{2,}/);
        const subs = [];
        
        const timeToSecs = (str) => {
            if (!str) return 0;
            const parts = str.split(':');
            if (parts.length < 3) return 0;
            const secsParts = parts[2].split(',');
            const hrs = parseInt(parts[0], 10);
            const mins = parseInt(parts[1], 10);
            const secs = parseInt(secsParts[0], 10);
            const ms = secsParts[1] ? parseInt(secsParts[1], 10) : 0;
            return (hrs * 3600) + (mins * 60) + secs + (ms / 1000);
        };
        
        for (const block of blocks) {
            if (!block.trim()) continue;
            
            const lines = block.split('\n');
            if (lines.length < 3) continue;
            
            // Second line should contain the timecode
            const timeLine = lines[1];
            if (!timeLine.includes('-->')) continue;
            
            const [startStr, endStr] = timeLine.split(/\s*-->\s*/);
            
            // Rest of the lines are the text
            const textLines = lines.slice(2).join(' ').trim();
            const cleanText = textLines.replace(/<[^>]*>/g, ''); // Strip simple html like <i> / </i>
            
            if (cleanText) {
                subs.push({
                    start: timeToSecs(startStr),
                    end: timeToSecs(endStr),
                    text: cleanText
                });
            }
        }
        
        return subs;
    }
};

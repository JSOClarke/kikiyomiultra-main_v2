import * as fflate from 'fflate';

export const EPUBParser = {
    hashCode(str) {
        let hash = 0, i, chr;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    },
    countWords(text) {
        if (!text) return 0;
        if (window.Intl && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
            const segments = segmenter.segment(text);
            let count = 0;
            for (const { isWordLike } of segments) if (isWordLike) count++;
            return count;
        }
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    },
    segmentText(allText, splitAtCommas = false) {
        const subs = [];
        const segmenter = new Intl.Segmenter('ja', { granularity: 'sentence' });
        const segments = segmenter.segment(allText);
        let time = 0;
        for (const { segment } of segments) {
            const text = segment.trim();
            if (text.length <= 1) continue;

            let subSegments = [text];
            if (splitAtCommas) {
                const delims = /([、，,;；。．.！？!?])/;
                const parts = text.split(delims);
                subSegments = [];
                let current = "";
                for (let i = 0; i < parts.length; i++) {
                    current += parts[i];
                    if (delims.test(parts[i]) || i === parts.length - 1) {
                        if (current.trim()) {
                            subSegments.push(current.trim());
                            current = "";
                        }
                    }
                }
                if (current.trim()) subSegments.push(current.trim());
            }

            for (const sub of subSegments) {
                subs.push({ start: time, end: time + 1, text: sub });
                time += 1;
            }
        }
        return { subs, duration: time };
    },
    resolve(base, path) {
        if (!path) return "";
        if (path.indexOf("://") > -1) return path;
        const full = (base + "/" + path).replace(/\/+/g, "/").replace(/^\//, "");
        const parts = full.split("/");
        const stack = [];
        for (const p of parts) {
            if (p === "..") stack.pop();
            else if (p !== ".") stack.push(p);
        }
        return stack.join("/");
    },
    async parse(file, splitAtCommas = false) {
        console.log("EPUBParser: Starting parse for", file.name);
        const meta = { id: "e_" + Math.abs(this.hashCode(file.name)), title: file.name.replace(/\.epub$/i, ''), subs: [], chapters: [], cover: null, isTextOnly: true };
        try {
            const buffer = await file.arrayBuffer();
            const zip = fflate.unzipSync(new Uint8Array(buffer));
            const parser = new DOMParser();
            
            // 1. Find rootfile (OPF)
            const containerKey = Object.keys(zip).find(k => k.toLowerCase() === 'meta-inf/container.xml');
            if (!containerKey) throw new Error("META-INF/container.xml not found");
            
            const containerDoc = parser.parseFromString(fflate.strFromU8(zip[containerKey]), "text/xml");
            const rootfile = containerDoc.getElementsByTagName("rootfile")[0];
            if (!rootfile) throw new Error("Could not find rootfile in container.xml");
            
            const opfPath = rootfile.getAttribute("full-path");
            const opfKey = Object.keys(zip).find(k => k.toLowerCase() === opfPath.toLowerCase());
            if (!opfKey) throw new Error("OPF file not found: " + opfPath);

            const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
            const opfDoc = parser.parseFromString(fflate.strFromU8(zip[opfKey]), "text/xml");
            console.log("EPUBParser: OPF loaded from", opfKey);

            // 2. Parse Metadata
            const titleNode = opfDoc.getElementsByTagName("dc:title")[0] || opfDoc.getElementsByTagName("title")[0];
            if (titleNode) meta.title = titleNode.textContent.trim();
            
            // 3. Find Cover
            const coverMeta = opfDoc.querySelector('meta[name="cover"]');
            if (coverMeta) {
                const coverId = coverMeta.getAttribute("content");
                const coverItem = opfDoc.getElementById(coverId) || opfDoc.querySelector(`item[id="${coverId}"]`);
                if (coverItem) {
                    const coverPath = this.resolve(opfDir, decodeURIComponent(coverItem.getAttribute("href")));
                    const zipKey = Object.keys(zip).find(k => k.toLowerCase() === coverPath.toLowerCase());
                    if (zipKey) {
                        const ext = coverPath.split('.').pop().toLowerCase();
                        meta.cover = { blob: new Blob([zip[zipKey]], { type: `image/${ext === 'png' ? 'png' : 'jpeg'}` }) };
                    }
                }
            }

            // 4. Parse Spine & Manifest
            const manifest = {};
            const items = opfDoc.getElementsByTagName("item");
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                manifest[item.getAttribute("id")] = { 
                    href: decodeURIComponent(item.getAttribute("href")), 
                    type: item.getAttribute("media-type") 
                };
            }

            const itemrefs = opfDoc.getElementsByTagName("itemref");
            const spineIds = [];
            for (let i = 0; i < itemrefs.length; i++) {
                spineIds.push(itemrefs[i].getAttribute("idref"));
            }
            console.log("EPUBParser: Found", spineIds.length, "spine items");

            // 5. Extract Content
            let allText = "";
            for (const idref of spineIds) {
                const item = manifest[idref];
                if (item) {
                    const relPath = this.resolve(opfDir, item.href);
                    const zipKey = Object.keys(zip).find(k => k.toLowerCase() === relPath.toLowerCase());
                    
                    if (zipKey) {
                        const doc = parser.parseFromString(fflate.strFromU8(zip[zipKey]), "text/html");
                        doc.querySelectorAll("rt, ruby button, script, style").forEach(node => node.remove());
                        let text = (doc.body ? doc.body.textContent : doc.documentElement.textContent)
                            .replace(/\s+/g, ' ')
                            .trim();
                        if (text) allText += text + " ";
                    }
                }
            }

            // Fallback: If no text was extracted via spine, try finding any xhtml/html files
            if (!allText.trim()) {
                console.warn("EPUBParser: Spine extraction failed, trying fallback...");
                const contentKeys = Object.keys(zip).filter(k => /\.x?html?$/i.test(k)).sort();
                for (const key of contentKeys) {
                    const doc = parser.parseFromString(fflate.strFromU8(zip[key]), "text/html");
                    doc.querySelectorAll("rt, script, style").forEach(node => node.remove());
                    const text = (doc.body ? doc.body.textContent : doc.documentElement.textContent).trim();
                    if (text) allText += text + " ";
                }
            }

            if (!allText.trim()) throw new Error("No text content found in any files inside the EPUB.");
            console.log("EPUBParser: Extracted text length:", allText.length);

            // 6. Segment into sentences & phrases
            const { subs, duration } = this.segmentText(allText, splitAtCommas);
            meta.subs = subs;
            meta.duration = duration;
            
            // 7. Count Words
            meta.totalWords = this.countWords(allText);
            meta.readWords = 0;
            
            console.log("EPUBParser: Final segment count:", meta.subs.length, "Word count:", meta.totalWords);

        } catch (e) { 
            console.error("EPUB Parse Error:", e);
            throw e;
        }
        return meta;
    }
};

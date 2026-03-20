import { Book, Subtitle } from '../types';
import * as fflate from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import * as jsmediatags from 'jsmediatags';

export interface ParseConfig {
  file: File;
  type: 'epub' | 'audiobook' | 'srt'; 
  audioFile?: File; // If parsing an srt, we might want to attach it to an audiobook
  splitByCommas?: boolean;
}

export interface WorkerMessage<T = any> {
  type: 'START' | 'PROGRESS' | 'SUCCESS' | 'ERROR';
  payload?: T;
  progress?: number; 
  error?: string;
}

const ctx: Worker = self as any;

// --- UTILS ---
const Utils = {
    async read(file: File, start: number, len: number) {
        if (start >= file.size) throw new Error("OOB");
        const chunk = file.slice(start, start + len);
        return new DataView(await chunk.arrayBuffer());
    },
    readStr(view: DataView, offset: number, len: number) {
        return new TextDecoder().decode(new Uint8Array(view.buffer, offset, len));
    },
    timeToSec(tStr: string) {
        const [h, m, s] = tStr.replace(',', '.').split(':');
        return parseFloat(h)*3600 + parseFloat(m)*60 + parseFloat(s);
    }
};

// --- AUDIO COVER EXTRACTOR ---
async function extractAudioCover(file: File): Promise<Blob | undefined> {
    return new Promise((resolve) => {
        jsmediatags.read(file, {
            onSuccess: function(tag) {
                const picture = tag.tags.picture;
                if (picture) {
                    const buffer = new Uint8Array(picture.data);
                    resolve(new Blob([buffer], { type: picture.format }));
                } else {
                    resolve(undefined);
                }
            },
            onError: function(error) {
                console.warn("jsmediatags error", error);
                resolve(undefined);
            }
        });
    });
}

// --- Segmenter Fallback for Worker ---
function segmentText(allText: string, breakByCommas: boolean = false): { subs: Subtitle[], duration: number } {
    const subs: Subtitle[] = [];
    let time = 0;
    
    // Explicit Database of Japanese and Standard Quote Boundaries
    const openBrackets = new Set(['「', '『', '（', '(', '【', '《', '〈', '〔', '“', '‘']);
    const closeBrackets = new Set(['」', '』', '）', ')', '】', '》', '〉', '〕', '”', '’']);
    
    // Explicit Splitting Points
    const sentenceEnders = new Set(['。', '！', '？', '!', '?']);
    const commaSplitters = new Set(['、', ',']);
    
    let currentSegment = "";
    let nestingLevel = 0;
    let ambiguousQuoteIn = false;
    
    for (let i = 0; i < allText.length; i++) {
        const char = allText[i];
        currentSegment += char;
        
        // Track Nesting Depth natively to build AST-like Structural Nodes
        if (char === '"' || char === "'") {
           ambiguousQuoteIn = !ambiguousQuoteIn;
           if (ambiguousQuoteIn) nestingLevel++; else nestingLevel = Math.max(0, nestingLevel - 1);
        } else if (openBrackets.has(char)) {
            nestingLevel++;
        } else if (closeBrackets.has(char)) {
            nestingLevel = Math.max(0, nestingLevel - 1);
        }
        
        // Only evaluate terminal punctuation if we are strictly OUTSIDE of all quote blocks
        if (nestingLevel === 0) {
            const isEnder = sentenceEnders.has(char);
            const isComma = breakByCommas && commaSplitters.has(char);
            
            if (isEnder || isComma) {
                // Peek ahead: Buffer consecutive punctuation marks cleanly (e.g. "？！", "。」")
                let nextIter = i + 1;
                let flush = true;
                if (nextIter < allText.length) {
                    const nextChar = allText[nextIter];
                    if (sentenceEnders.has(nextChar) || commaSplitters.has(nextChar) || closeBrackets.has(nextChar)) {
                        flush = false; 
                    }
                }
                
                if (flush) {
                    const trimmed = currentSegment.trim();
                    if (trimmed.length > 1) {
                        subs.push({ id: `sub_${time}`, startTime: time, endTime: time + 1, text: trimmed, isRead: false });
                        time += 1;
                    }
                    currentSegment = "";
                }
            }
        }
    }
    
    // Flush any remaining orphans unconditionally at EOF
    const finalTrimmed = currentSegment.trim();
    if (finalTrimmed.length > 1) {
        subs.push({ id: `sub_${time}`, startTime: time, endTime: time + 1, text: finalTrimmed, isRead: false });
        time += 1;
    }
    
    return { subs, duration: time };
}

// --- SRT PARSER ---
async function parseSrt(file: File): Promise<Subtitle[]> {
    const text = await file.text();
    const lineBreak = '\n';
    const patternString = "(\\d+)" + lineBreak + "(\\d{2}:\\d{2}:\\d{2},\\d{3}) --> (\\d{2}:\\d{2}:\\d{2},\\d{3})" + lineBreak + "((?:(?!\\d+" + lineBreak + ").)*)";
    const pattern = new RegExp(patternString, "gs");
    const normalizedText = text.replace(/\r\n/g, lineBreak);
    const matches = [...normalizedText.matchAll(pattern)];
    return matches.map((m, i) => ({
        id: `sub_${i}`,
        startTime: Utils.timeToSec(m[2]),
        endTime: Utils.timeToSec(m[3]),
        text: m[4].trim(),
        isRead: false
    }));
}

// --- M4B PARSER ---
const M4BParser = {
    async parse(file: File) {
        const context = { file: file, meta: { coverUrl: '', coverBlob: null as Blob | null, chapters: [] as any[] } };
        try {
            const moov = await this.findAtom(context, 0, file.size, 'moov');
            if (!moov) return context.meta;

            const udta = await this.findAtom(context, moov.contentStart, moov.end, 'udta');
            if (udta) {
                const chpl = await this.findAtom(context, udta.contentStart, udta.end, 'chpl');
                if (chpl) await this.parseChpl(context, chpl);
                
                const metaAtom = await this.findAtom(context, udta.contentStart, udta.end, 'meta');
                if (metaAtom) {
                    const ilst = await this.findAtom(context, metaAtom.contentStart + 4, metaAtom.end, 'ilst');
                    if (ilst) await this.parseIlst(context, ilst);
                }
            }
            await this.parseTracks(context, moov);
        } catch (e) { console.warn("M4B Parse Error", e); }
        return context.meta;
    },
    async findAtom(ctx: any, start: number, end: number, targetName: string): Promise<any> {
        let cur = start;
        while (cur < end) {
            if (cur + 8 > ctx.file.size) break;
            const h = await Utils.read(ctx.file, cur, 8);
            let size = h.getUint32(0);
            const type = Utils.readStr(h, 4, 4);
            let headerSize = 8;
            let actualSize = size;
            if (size === 1) {
                const h2 = await Utils.read(ctx.file, cur + 8, 8);
                actualSize = Number(h2.getBigUint64(0)); headerSize = 16;
            } else if (size === 0) actualSize = end - cur;
            if (type === targetName) return { start: cur, contentStart: cur + headerSize, end: cur + actualSize, size: actualSize };
            cur += actualSize;
        }
        return null;
    },
    async parseChpl(ctx: any, atom: any) {
        const view = await Utils.read(ctx.file, atom.contentStart, atom.size - 8);
        const count = view.getUint32(4);
        let ptr = 8; const dec = new TextDecoder('utf-8');
        for(let i=0; i<count; i++) {
            if (ptr >= view.byteLength) break;
            const startTs = Number(view.getBigUint64(ptr)) / 10000000; ptr += 8;
            const len = view.getUint8(ptr); ptr++;
            let title = dec.decode(new Uint8Array(view.buffer, ptr, len)); ptr += len;
            ctx.meta.chapters.push({ start: startTs, title });
        }
    },
    async parseIlst(ctx: any, atom: any) {
        let cur = atom.contentStart;
        while (cur < atom.end) {
            if (cur + 8 > ctx.file.size) break;
            const h = await Utils.read(ctx.file, cur, 8);
            const size = h.getUint32(0);
            const type = Utils.readStr(h, 4, 4);
            if (size === 0) break;
            if (type === 'covr') {
                const dataAtom = await this.findAtom(ctx, cur + 8, cur + size, 'data');
                if (dataAtom) {
                    const head = await Utils.read(ctx.file, dataAtom.start, 16);
                    const flag = head.getUint32(8);
                    let mime = (flag === 14) ? 'image/png' : 'image/jpeg';
                    const imgStart = dataAtom.start + 16;
                    const imgSize = dataAtom.size - 16;
                    const blob = ctx.file.slice(imgStart, imgStart + imgSize);
                    ctx.meta.coverBlob = new Blob([blob], { type: mime });
                }
            }
            cur += size;
        }
    },
    async parseTracks(ctx: any, moovAtom: any) {
        let cur = moovAtom.contentStart;
        while (cur < moovAtom.end) {
            const h = await Utils.read(ctx.file, cur, 8);
            const size = h.getUint32(0);
            const type = Utils.readStr(h, 4, 4);
            if (size === 0) break;
            if (type === 'trak') await this.inspectTrak(ctx, { start: cur, contentStart: cur + 8, end: cur + size });
            cur += size;
        }
    },
    async inspectTrak(ctx: any, trak: any) {
        const mdia = await this.findAtom(ctx, trak.contentStart, trak.end, 'mdia'); if (!mdia) return;
        const hdlr = await this.findAtom(ctx, mdia.contentStart, mdia.end, 'hdlr'); if (!hdlr) return;
        const hdlrView = await Utils.read(ctx.file, hdlr.contentStart, hdlr.size - 8);
        const subType = Utils.readStr(hdlrView, 8, 4);
        if (subType === 'text' || subType === 'sbtl') await this.parseTextTrack(ctx, mdia);
    },
    async parseTextTrack(ctx: any, mdia: any) {
        const minf = await this.findAtom(ctx, mdia.contentStart, mdia.end, 'minf'); if (!minf) return;
        const stbl = await this.findAtom(ctx, minf.contentStart, minf.end, 'stbl'); if (!stbl) return;
        const stts = await this.findAtom(ctx, stbl.contentStart, stbl.end, 'stts');
        const stsz = await this.findAtom(ctx, stbl.contentStart, stbl.end, 'stsz');
        const stsc = await this.findAtom(ctx, stbl.contentStart, stbl.end, 'stsc');
        const co = await this.findAtom(ctx, stbl.contentStart, stbl.end, 'stco') || await this.findAtom(ctx, stbl.contentStart, stbl.end, 'co64');
        if (!stts || !stsz || !stsc || !co) return;

        const mdhd = await this.findAtom(ctx, mdia.contentStart, mdia.end, 'mdhd');
        const mdhdView = await Utils.read(ctx.file, mdhd.contentStart, 24);
        const ver = mdhdView.getUint8(0);
        const timescale = mdhdView.getUint32(ver === 1 ? 20 : 12);

        const sttsView = await Utils.read(ctx.file, stts.contentStart, stts.size-8);
        const sttsCount = sttsView.getUint32(4);
        let durations = [], ptr = 8;
        for(let i=0; i<sttsCount; i++) {
            const c = sttsView.getUint32(ptr), d = sttsView.getUint32(ptr+4); ptr+=8;
            for(let j=0; j<c; j++) durations.push(d);
        }

        const stszView = await Utils.read(ctx.file, stsz.contentStart, stsz.size-8);
        const uSz = stszView.getUint32(4), sCnt = stszView.getUint32(8);
        let sizes = [];
        if (uSz !== 0) { for(let i=0; i<sCnt; i++) sizes.push(uSz); }
        else { ptr = 12; for(let i=0; i<sCnt; i++) { sizes.push(stszView.getUint32(ptr)); ptr+=4; } }

        let chunks = [];
        const coView = await Utils.read(ctx.file, co.contentStart, co.size-8);
        const coCnt = coView.getUint32(4); ptr = 8;
        const typeView = await Utils.read(ctx.file, co.start+4, 4);
        const coType = Utils.readStr(typeView, 0, 4);
        for(let i=0; i<coCnt; i++) { 
            if(coType==='stco') { chunks.push(coView.getUint32(ptr)); ptr+=4; }
            else { chunks.push(Number(coView.getBigUint64(ptr))); ptr+=8; }
        }

        const stscView = await Utils.read(ctx.file, stsc.contentStart, stsc.size-8);
        const stscCnt = stscView.getUint32(4);
        let stscE = []; ptr=8;
        for(let i=0; i<stscCnt; i++) { stscE.push({f:stscView.getUint32(ptr), c:stscView.getUint32(ptr+4)}); ptr+=12; }

        let currTime=0, sIdx=0, stscIdx=0; const dec = new TextDecoder('utf-8');
        for(let cIdx=0; cIdx<chunks.length; cIdx++) {
            if(stscIdx<stscE.length-1 && (cIdx+1)>=stscE[stscIdx+1].f) stscIdx++;
            const nSamp = stscE[stscIdx].c;
            let offset = chunks[cIdx];
            for(let i=0; i<nSamp; i++) {
                if(sIdx>=sCnt) break;
                const sz=sizes[sIdx], dur=durations[sIdx];
                if(sz>2) {
                    const txtView = await Utils.read(ctx.file, offset, sz);
                    const txtLen = txtView.getUint16(0);
                    let title = (txtLen===sz-2) ? dec.decode(new Uint8Array(txtView.buffer, 2, txtLen)) : dec.decode(new Uint8Array(txtView.buffer, 0, sz));
                    title = title.replace(/[\x00-\x1F]/g,'').replace(/\s*encd.*$/i,'').trim();
                    // These are basically subtitles!
                    ctx.meta.chapters.push({start: currTime/timescale, end: (currTime+dur)/timescale, text: title, isRead: false});
                }
                currTime+=dur; offset+=sz; sIdx++;
            }
        }
    }
};

// --- EPUB PARSER ---
const EPUBParser = {
    resolve(base: string, path: string) {
        if (!path) return "";
        if (path.indexOf("://") > -1) return path;
        const full = (base + "/" + path).replace(/\/+/g, "/").replace(/^\//, "");
        const parts = full.split("/");
        const stack: string[] = [];
        for (const p of parts) {
            if (p === "..") stack.pop();
            else if (p !== ".") stack.push(p);
        }
        return stack.join("/");
    },
    async parse(file: File, splitByCommas: boolean = false) {
        const meta = { title: file.name.replace(/\.epub$/i, ''), subs: [] as Subtitle[], coverUrl: '', coverBlob: null as Blob | null, duration: 0 };
        const buffer = await file.arrayBuffer();
        const zip = fflate.unzipSync(new Uint8Array(buffer as ArrayBuffer));
        
        ctx.postMessage({ type: 'PROGRESS', progress: 10 });
        
        const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

        const containerKey = Object.keys(zip).find(k => k.toLowerCase() === 'meta-inf/container.xml');
        if (!containerKey) throw new Error("META-INF/container.xml not found");

        const containerXml = fflate.strFromU8(zip[containerKey]);
        const containerObj = xmlParser.parse(containerXml);
        
        let opfPath = '';
        const rootfiles = containerObj.container?.rootfiles?.rootfile;
        if (Array.isArray(rootfiles)) opfPath = rootfiles[0]['@_full-path'];
        else if (rootfiles) opfPath = rootfiles['@_full-path'];
        
        if (!opfPath) throw new Error("Could not find rootfile path");

        const opfKey = Object.keys(zip).find(k => k.toLowerCase() === opfPath.toLowerCase());
        if (!opfKey) throw new Error("OPF file not found: " + opfPath);

        const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
        const opfXml = fflate.strFromU8(zip[opfKey]);
        const opfObj = xmlParser.parse(opfXml);

        ctx.postMessage({ type: 'PROGRESS', progress: 20 });

        // Metadata extraction
        const metadata = opfObj.package?.metadata;
        let coverId = '';
        if (metadata) {
            if (metadata['dc:title']) {
                meta.title = typeof metadata['dc:title'] === 'string' ? metadata['dc:title'] : metadata['dc:title']['#text'] || meta.title;
            }
            
            const metaNodes = Array.isArray(metadata.meta) ? metadata.meta : (metadata.meta ? [metadata.meta] : []);
            const coverMeta = metaNodes.find((m: any) => m && m['@_name'] === 'cover');
            if (coverMeta && coverMeta['@_content']) {
                coverId = coverMeta['@_content'];
            }
        }

        // Cover resolution (simplified for worker)
        const manifestNode = opfObj.package?.manifest?.item;
        const manifestArr = Array.isArray(manifestNode) ? manifestNode : (manifestNode ? [manifestNode] : []);
        
        let coverItem = null;
        if (coverId) {
            coverItem = manifestArr.find((item: any) => item && item['@_id'] === coverId);
        }
        if (!coverItem) {
            coverItem = manifestArr.find((item: any) => item && (item['@_properties']?.includes('cover-image') || item['@_id']?.toLowerCase().includes('cover') || item['@_href']?.toLowerCase().includes('cover')));
        }

        if (coverItem) {
            const coverPath = this.resolve(opfDir, decodeURIComponent(coverItem['@_href']));
            const zipKey = Object.keys(zip).find(k => k.toLowerCase() === coverPath.toLowerCase());
            if (zipKey) {
                const ext = coverPath.split('.').pop()?.toLowerCase();
                // @ts-ignore
                const coverBlob = new Blob([zip[zipKey]], { type: `image/${ext === 'png' ? 'png' : 'jpeg'}` });
                meta.coverBlob = coverBlob;
            }
        }

        ctx.postMessage({ type: 'PROGRESS', progress: 40 });

        // Spine extraction
        const spineArr = Array.isArray(opfObj.package?.spine?.itemref) ? opfObj.package?.spine?.itemref : [opfObj.package?.spine?.itemref];
        let allText = "";

        for (let i = 0; i < spineArr.length; i++) {
            const idref = spineArr[i]?.['@_idref'];
            if (!idref) continue;
            
            const item = manifestArr.find((it: any) => it['@_id'] === idref);
            if (item) {
                const relPath = this.resolve(opfDir, item['@_href']);
                const zipKey = Object.keys(zip).find(k => k.toLowerCase() === relPath.toLowerCase());
                if (zipKey) {
                    const html = fflate.strFromU8(zip[zipKey]);
                    // Extremely aggressive HTML stripping regex since no DOMParser in web workers
                    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                    let bodyStr = bodyMatch ? bodyMatch[1] : html;
                    
                    bodyStr = bodyStr.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                                     .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
                                     .replace(/<rt>.*?<\/rt>/gi, "") // remove ruby furigana
                                     .replace(/<rp>.*?<\/rp>/gi, "") // remove ruby parentheses
                                     .replace(/<\/?(div|p|br|h[1-6]|li|tr|td)[^>]*>/gi, " ") // replace block-level elements with a space
                                     .replace(/<[^>]+>/g, "") // remove all other inline tags completely (no gap injected)
                                     .replace(/\s+/g, ' ')
                                     .replace(/&#160;/g, ' ')
                                     .replace(/&nbsp;/g, ' ')
                                     .trim();

                    if (bodyStr) allText += bodyStr + " ";
                }
            }
            if (i % 5 === 0) { // report progress incrementally
                ctx.postMessage({ type: 'PROGRESS', progress: 40 + Math.floor((i / spineArr.length) * 40) });
            }
        }

        ctx.postMessage({ type: 'PROGRESS', progress: 85 });
        
        const { subs, duration } = segmentText(allText, splitByCommas);
        meta.subs = subs;
        meta.duration = duration;
        
        return meta;
    }
};

ctx.addEventListener('message', async (event: MessageEvent<ParseConfig>) => {
  const config = event.data;
  
  try {
    ctx.postMessage({ type: 'START', progress: 0 });
    
    let parsedBook: Book;

    if (config.type === 'epub') {
        const meta = await EPUBParser.parse(config.file);
        parsedBook = {
            id: config.file.name.replace(/\W/g, '_'),
            title: meta.title,
            author: 'Unknown Author',
            coverUrl: '',
            coverBlob: meta.coverBlob || undefined,
            subtitles: meta.subs,
            originalSubtitles: meta.subs,
            splitByCommas: false,
            duration: meta.duration,
            type: 'epub'
        } as Book;
    } else if (config.type === 'audiobook') { // M4B or MP3
        const m4bMeta = await M4BParser.parse(config.file);
        
        let coverBlob = m4bMeta.coverBlob || undefined;
        if (!coverBlob) {
            coverBlob = await extractAudioCover(config.file);
        }

        // M4B text tracks are stored in chapters for Kikiyomi
        const subs: Subtitle[] = (m4bMeta.chapters || []).map((c: any, i: number) => ({
            id: `m4b_sub_${i}`,
            startTime: c.start,
            endTime: c.end || c.start + 5, // Approximate end time if missing
            text: c.text || c.title,
            isRead: false
        }));

        // Estimate duration if missing
        const duration = subs.length > 0 ? subs[subs.length - 1].endTime : 0;

        parsedBook = {
            id: config.file.name.replace(/\W/g, '_'),
            title: config.file.name.replace(/\.(m4b|mp3|m4a|flac)$/i, ''),
            author: 'Unknown Author',
            coverUrl: '',
            coverBlob: coverBlob,
            audioUrl: '',
            subtitles: subs,
            duration: duration,
            type: 'audiobook'
        };
    } else if (config.type === 'srt') {
        const subs = await parseSrt(config.file);
        const duration = subs.length > 0 ? subs[subs.length - 1].endTime : 0;

        let coverBlob = undefined;
        if (config.audioFile) {
            coverBlob = await extractAudioCover(config.audioFile);
        }

        parsedBook = {
            id: config.file.name.replace(/\W/g, '_'),
            title: config.file.name.replace(/\.srt$/i, ''),
            author: 'Parsed from SRT',
            coverUrl: '',
            coverBlob: coverBlob,
            audioUrl: '',
            subtitles: subs,
            duration: duration,
            type: 'audiobook'
        };
    } else {
        throw new Error("Unsupported file type: " + config.type);
    }
    
    ctx.postMessage({ type: 'PROGRESS', progress: 100 });
    ctx.postMessage({ type: 'SUCCESS', payload: parsedBook });

  } catch (error) {
    console.error("Worker Error:", error);
    if (error instanceof Error) {
       ctx.postMessage({ type: 'ERROR', error: error.message });
    } else {
       ctx.postMessage({ type: 'ERROR', error: 'Unknown parsing error occurred.' });
    }
  }
});

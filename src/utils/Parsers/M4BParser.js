import { Utils } from '../Utils';

export const M4BParser = {
    async parse(file) {
        const context = { file: file, meta: { cover: null, tags: {}, chapters: [] } };
        try {
            const moov = await this.findAtom(context, 0, file.size, 'moov');
            if (!moov) return context.meta;

            // Chapters & Meta
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
            
            // Text Tracks
            await this.parseTracks(context, moov);
        } catch (e) { console.warn("M4B Parse Error", e); }
        return context.meta;
    },
    async findAtom(ctx, start, end, targetName) {
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
    async parseChpl(ctx, atom) {
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
    async parseIlst(ctx, atom) {
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
                    ctx.meta.cover = { blob: ctx.file.slice(imgStart, imgStart + imgSize), mime };
                }
            } else if (['©nam','©ART','©alb'].includes(type)) {
                const dataAtom = await this.findAtom(ctx, cur + 8, cur + size, 'data');
                if (dataAtom) {
                    const txtLen = dataAtom.size - 16;
                    if (txtLen > 0) {
                        const txtView = await Utils.read(ctx.file, dataAtom.contentStart + 8, txtLen);
                        const val = Utils.readStr(txtView, 0, txtLen);
                        const map = {'©nam':'Title'};
                        if (map[type]) ctx.meta.tags[map[type]] = val;
                    }
                }
            }
            cur += size;
        }
    },
    async parseTracks(ctx, moovAtom) {
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
    async inspectTrak(ctx, trak) {
        const mdia = await this.findAtom(ctx, trak.contentStart, trak.end, 'mdia'); if (!mdia) return;
        const hdlr = await this.findAtom(ctx, mdia.contentStart, mdia.end, 'hdlr'); if (!hdlr) return;
        const hdlrView = await Utils.read(ctx.file, hdlr.contentStart, hdlr.size - 8);
        const subType = Utils.readStr(hdlrView, 8, 4);
        if (subType === 'text' || subType === 'sbtl') await this.parseTextTrack(ctx, mdia);
    },
    async parseTextTrack(ctx, mdia) {
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
        const coType = Utils.readStr({buffer:(await Utils.read(ctx.file, co.start+4, 4)).buffer},0,4);
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
                    ctx.meta.chapters.push({start: currTime/timescale, title});
                }
                currTime+=dur; offset+=sz; sIdx++;
            }
        }
    }
};

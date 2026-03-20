import { Utils } from '../Utils';

export const ID3Parser = {
    async parse(file) {
        const meta = { cover: null, tags: {}, chapters: [] };
        const h = await Utils.read(file, 0, 10);
        if (Utils.readStr(h, 0, 3) !== 'ID3') return meta;
        const fnSize = (h.getUint8(6)<<21)|(h.getUint8(7)<<14)|(h.getUint8(8)<<7)|h.getUint8(9);
        let pos = 10; const limit = 10 + fnSize;
        while (pos < limit) {
            const fh = await Utils.read(file, pos, 10);
            const id = Utils.readStr(fh, 0, 4);
            const size = fh.getUint32(4);
            if (id.charCodeAt(0) === 0) break;
            if (id === 'APIC') {
                const fBuf = await Utils.read(file, pos+10, size);
                const view = new DataView(fBuf.buffer);
                let ptr = 0, mime = "";
                ptr++; 
                while(ptr<size && view.getUint8(ptr)!==0) { mime += String.fromCharCode(view.getUint8(ptr)); ptr++; }
                ptr++; ptr++; 
                while(ptr<size && view.getUint8(ptr)!==0) ptr++; 
                ptr++;
                while(ptr<size && view.getUint8(ptr)===0) ptr++; 
                meta.cover = { blob: file.slice(pos+10+ptr, pos+10+size), mime: mime || 'image/jpeg' };
            } else if (id === 'TIT2') {
                const fBuf = await Utils.read(file, pos+10, size);
                const dec = new TextDecoder('utf-8');
                meta.tags.Title = dec.decode(new Uint8Array(fBuf.buffer).slice(1)).replace(/\0/g,'');
            }
            pos += 10 + size;
        }
        return meta;
    }
};

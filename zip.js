/* Minimal ZIP (STORE) writer: UTF-8 filenames/content, CRC32, no dependencies. */
(function (root) {
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const b of bytes) { crc ^= b; for (let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function zip(files) {
    const enc = new TextEncoder(), parts = [], directory = []; let offset = 0, size = 0;
    const block = length => { const b = new Uint8Array(length); return [b,new DataView(b.buffer)]; };
    const entries = Object.entries(files);
    if (entries.length > 65535) throw new Error('Too many files');
    for (const [filename, content] of entries) {
      const name = enc.encode(filename), data = enc.encode('\ufeff' + content), crc = crc32(data);
      const [local,l] = block(30); l.setUint32(0,0x04034b50,true); l.setUint16(4,20,true); l.setUint16(6,0x800,true); l.setUint16(12,33,true); l.setUint32(14,crc,true); l.setUint32(18,data.length,true); l.setUint32(22,data.length,true); l.setUint16(26,name.length,true);
      parts.push(local,name,data);
      const [central,c] = block(46); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x800,true); c.setUint16(14,33,true); c.setUint32(16,crc,true); c.setUint32(20,data.length,true); c.setUint32(24,data.length,true); c.setUint16(28,name.length,true); c.setUint32(42,offset,true);
      directory.push(central,name); offset += local.length + name.length + data.length; size += central.length + name.length;
    }
    const [end,e] = block(22); e.setUint32(0,0x06054b50,true); e.setUint16(8,entries.length,true); e.setUint16(10,entries.length,true); e.setUint32(12,size,true); e.setUint32(16,offset,true);
    return new Blob([...parts,...directory,end],{ type:'application/zip' });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { zip, crc32 };
  else root.StudioZip = { zip };
})(typeof globalThis !== 'undefined' ? globalThis : this);

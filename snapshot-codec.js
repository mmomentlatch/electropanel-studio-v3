(function(root){
  "use strict";
  const utf=new TextEncoder(), decode=new TextDecoder();
  function base64(bytes) { let s="";for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,""); }
  async function transform(bytes,stream,limit) {
    const reader=new Blob([bytes]).stream().pipeThrough(stream).getReader(), chunks=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error("Size limit");}chunks.push(value);}
    return new Uint8Array(await new Blob(chunks).arrayBuffer());
  }
  async function encode(data){const plain=utf.encode(JSON.stringify(data));if(plain.length>512000)throw Error("Size limit");return typeof CompressionStream==="function"?"z."+base64(await transform(plain,new CompressionStream("gzip"),512000)):"j."+base64(plain);}
  async function unpack(value){if(typeof value!=="string"||value.length>700000||!/^[zj]\.[A-Za-z0-9_-]+$/.test(value))throw Error("Invalid snapshot");const raw=Uint8Array.from(atob(value.slice(2).replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));const bytes=value.startsWith("z.")?await transform(raw,new DecompressionStream("gzip"),512000):raw;if(bytes.length>512000)throw Error("Size limit");return JSON.parse(decode.decode(bytes));}
  if(typeof module==="object"&&module.exports)module.exports={encode,unpack};else root.PanelSnapshotCodec={encode,unpack};
})(globalThis);

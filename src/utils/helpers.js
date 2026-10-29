import { platformApi } from "../platform/platformApi.js";

export function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"]/g, function(character) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character];
  });
}

export function createRuntimeHelpers({ D, pill }) {
  function hash(){ var h="0123456789abcdef", s=""; for(var i=0;i<4;i++) s+=h[Math.floor(Math.random()*16)]; var t=""; for(i=0;i<4;i++) t+=h[Math.floor(Math.random()*16)]; return s+"…"+t; }
  function nowT(){ var n=new Date(); return n.toTimeString().slice(0,8); }
  function ledgerAdd(ev, ctx){
    var entryHash = hash();
    var timestamp = "24 Oct "+nowT();
    D.ledger.unshift([timestamp, ev, ctx, entryHash]);
    platformApi.addLedgerEntry(ev, ctx).catch(err => {
      console.warn("Failed to persist ledger entry in MongoDB:", err.message);
    });
  }
  function sevPill(s){ return pill({High:"act",Exposed:"act",Medium:"risk",Low:"ok",Limited:"risk",Minimal:"ok"}[s]||"n", s); }
  return { hash, nowT, ledgerAdd, sevPill };
}

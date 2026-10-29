export function renderTopbar({ I, S }) {
  return '<header class="top"><button class="ibtn menu-btn" data-act="menu" aria-label="Open navigation">'+I.menu+'</button><div class="crumb" id="crumb"></div>'+
  '<button class="search" data-act="cmd" aria-label="Search">'+I.search.replace('<svg','<svg width="15" height="15"')+'<span>Search or jump to…</span><kbd>⌘K</kbd></button>'+
  '<div class="jur" role="group" aria-label="Jurisdiction lens">'+["DPDP","GDPR","CCPA"].map(function(j){ return '<button data-act="jur" data-arg="'+j+'" aria-pressed="'+(S.jur===j)+'">'+j+'</button>'; }).join("")+'</div>'+
  '<button class="ibtn" data-act="theme" aria-label="Toggle theme">'+I.moon+'</button><button class="ibtn" data-go="ledger" aria-label="Proof Ledger">'+I.chain+'</button><button class="ibtn" data-act="notif" aria-label="Notifications">'+I.bell+'<span class="pip"></span></button></header>';
}

export function createMarkupHelpers({ S, esc, I }) {
  function pill(k, t){ return '<span class="v '+k+'">'+esc(t)+'</span>'; }
  function tag(t, k){ return '<span class="tag '+(k||"")+'">'+esc(t)+'</span>'; }
  function bar(v, k){ return '<div class="pb"><div class="bar '+(k||"")+'"><span style="width:'+v+'%"></span></div><span class="mono">'+v+'%</span></div>'; }
  function card(title, body, right, nopad){ return '<section class="card">'+(title?'<div class="card-h"><h3>'+title+'</h3><div class="r">'+(right||"")+'</div></div>':"")+(nopad?body:'<div class="card-b">'+body+'</div>')+'</section>'; }
  function kpi(label, val, sub, color){ return '<div class="card kpi" style="--k:'+(color||"transparent")+'"><small>'+label+'</small><b>'+val+'</b><span>'+sub+'</span></div>'; }
  function table(cols, rows, act){ return '<div class="tw"><table class="t"><thead><tr>'+cols.map(function(c){return "<th>"+c+"</th>";}).join("")+'</tr></thead><tbody>'+
    rows.map(function(r, i){ return '<tr'+(act?' class="click" data-act="'+act+'" data-arg="'+i+'"':'')+'>'+r.map(function(c){ return "<td>"+c+"</td>"; }).join("")+'</tr>'; }).join("")+'</tbody></table></div>'; }
  function tabs(view, list){ var cur = S.tab[view] || list[0][0];
    return '<div class="tabs" role="tablist">'+list.map(function(t){ return '<button role="tab" aria-selected="'+(t[0]===cur)+'" data-act="tab" data-arg="'+view+'|'+t[0]+'">'+t[1]+'</button>'; }).join("")+'</div>'; }
  function curTab(view, def){ return S.tab[view] || def; }
  function head(eyebrow, h, p, acts){ return '<div class="ph"><div><div class="eyebrow">'+eyebrow+'</div><h1>'+h+'</h1>'+(p?'<p>'+p+'</p>':'')+'</div><div class="acts">'+(acts||"")+'</div></div>'; }
  function btn(t, act, arg, cls, ic){ return '<button class="btn '+(cls||"")+'" data-act="'+act+'"'+(arg!=null?' data-arg="'+esc(arg)+'"':'')+'>'+(ic?I[ic]:"")+t+'</button>'; }
  function stl(st){ return {ok:"ok",risk:"risk",act:"act"}[st]||"n"; }
  return { pill, tag, bar, card, kpi, table, tabs, curTab, head, btn, stl };
}

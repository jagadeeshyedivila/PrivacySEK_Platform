export function renderSidebar({ D, I, MARK, NAV, S }) {
  var nav = NAV.map(function(g){ return (g[0]?'<h6>'+g[0]+'</h6>':'') + g[1].map(function(i){
    var extra = i[3]==="star" ? '<span class="star">★</span>' : i[3] ? '<span class="badge">'+i[3]+'</span>' : '';
    return '<button data-go="'+i[0]+'">'+I[i[2]]+'<span>'+i[1]+'</span>'+extra+'</button>'; }).join(""); }).join("");
  return '<nav class="rail" id="rail" aria-label="Main"><div class="rail-top">'+MARK+'<span class="word">Privacy<b>SEK</b></span></div>'+
  '<button class="org" data-act="bu"><span class="olg">'+D.org.short+'</span><span><b>'+D.org.name+'</b><small id="bu-l">'+D.org.bu[S.bu]+'</small></span><span style="color:var(--rail-dim)">⌄</span></button>'+
  '<div class="nav">'+nav+'</div><div class="rail-foot"><span class="ava">'+D.org.user.init+'</span><span><b>'+D.org.user.name+'</b><small>'+D.org.user.role+'</small></span></div></nav>';
}

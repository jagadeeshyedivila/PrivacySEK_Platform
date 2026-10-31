export function renderSidebar({ D, I, MARK, NAV, S }) {
  var isCollapsed = Boolean(S && S.sidebarCollapsed);
  var nav = NAV.map(function(g){
    var heading = g[0] ? '<h6 class="nav-section-title">'+g[0]+'</h6>' : '';
    return heading + g[1].map(function(i){
      var extra = i[3]==="star" ? '<span class="star">★</span>' : i[3] ? '<span class="badge">'+i[3]+'</span>' : '';
      var tooltipExtra = i[3]==="star" ? ' <span class="star">★</span>' : i[3] ? ' <span class="badge">'+i[3]+'</span>' : '';
      var tooltip = '<span class="rail-tooltip" role="tooltip">'+i[1]+tooltipExtra+'</span>';
      return '<button data-go="'+i[0]+'" data-nav-id="'+i[0]+'" aria-label="'+i[1]+'" title="'+i[1]+'">'+
        I[i[2]]+
        '<span class="nav-label">'+i[1]+'</span>'+
        extra+
        tooltip+
      '</button>';
    }).join("");
  }).join("");

  var toggleIcon = isCollapsed ? (I.chevronRight || I.arrow) : (I.chevronLeft || I.arrow);
  var toggleLabel = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
  var toggleTitle = isCollapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)";

  return '<nav class="rail'+(isCollapsed?' collapsed':'')+'" id="rail" aria-label="Main">'+
    '<div class="rail-top">'+
      '<div class="rail-brand">'+MARK+'<span class="word">Privacy<b>SEK</b></span></div>'+
      '<button class="ibtn rail-collapse-btn" data-act="toggle-sidebar" aria-label="'+toggleLabel+'" title="'+toggleTitle+'">'+toggleIcon+'</button>'+
    '</div>'+
    '<button class="org" data-act="bu" title="'+D.org.name+' · '+D.org.bu[S.bu]+'"><span class="olg">'+D.org.short+'</span><span class="org-meta"><b>'+D.org.name+'</b><small id="bu-l">'+D.org.bu[S.bu]+'</small></span><span class="org-caret" style="color:var(--rail-dim)">⌄</span></button>'+
    '<div class="nav">'+nav+'</div>'+
    '<div class="rail-foot" title="'+D.org.user.name+' ('+D.org.user.role+')"><span class="ava">'+D.org.user.init+'</span><span class="user-meta"><b>'+D.org.user.name+'</b><small>'+D.org.user.role+'</small></span></div>'+
  '</nav>';
}

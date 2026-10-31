const P = function(p){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; };
export const I = {
 home:P('<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>'), search:P('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>'),
 flow:P('<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7.5l3 8M16 7.5l-3 8"/>'),
 map:P('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'), user:P('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
 doc:P('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'), check:P('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 12l3 3 5-6"/>'),
 cookie:P('<path d="M12 3a9 9 0 109 9 3 3 0 01-3-3 3 3 0 01-3-3 3 3 0 01-3-3z"/><circle cx="9" cy="11" r="1"/><circle cx="14" cy="15" r="1"/><circle cx="9" cy="16" r="1"/>'),
 shield:P('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'), clock:P('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>'),
 truck:P('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>'), inbox:P('<path d="M4 13l2-8h12l2 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>'),
 alert:P('<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5h.01"/>'), clip:P('<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>'),
 chain:P('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'), chart:P('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
 spark:P('<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>'), grad:P('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>'), globe:P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
 plug:P('<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4"/>'), gear:P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 01-4 0v-.1A1.6 1.6 0 009 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003 14H3a2 2 0 010-4h.1A1.6 1.6 0 004.6 9a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009 4.6V4a2 2 0 014 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1A1.6 1.6 0 0019.4 9H20a2 2 0 010 4h-.1a1.6 1.6 0 00-.5 2z"/>'),
 bell:P('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>'), moon:P('<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>'), menu:P('<path d="M4 7h16M4 12h16M4 17h16"/>'),
 x:P('<path d="M6 6l12 12M18 6L6 18"/>'), plus:P('<path d="M12 5v14M5 12h14"/>'), play:P('<path d="M7 4l13 8-13 8z"/>'), down:P('<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>'), lock:P('<rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 018 0v3"/>'),
 chevronLeft:P('<path d="M15 18l-6-6 6-6"/>'), chevronRight:P('<path d="M9 18l6-6 6-6"/>'),
 arrow:P('<path d="M5 12h14M13 6l6 6-6 6"/>'), db:P('<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>')
};
export const MARK = '<svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#14B8A6"/><path d="M27.6 13.2c-1.6-2.3-4.3-3.7-7.4-3.7-4.6 0-7.9 2.7-7.9 6.3 0 3.4 3.1 4.8 7.6 5.8" fill="none" stroke="#0B1220" stroke-width="3.6" stroke-linecap="round"/><path d="M19.9 21.6c4.5 1 7.8 2.4 7.8 5.9 0 3.6-3.4 6.2-8 6.2-3.2 0-6-1.4-7.6-3.8" fill="none" stroke="#FFFFFF" stroke-width="3.6" stroke-linecap="round"/><circle cx="29.2" cy="30.6" r="2.1" fill="#0B1220"/></svg>';

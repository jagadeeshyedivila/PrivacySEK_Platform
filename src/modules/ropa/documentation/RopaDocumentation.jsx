import { renderRecordList, moreTags } from "../shared/RecordList.js";

export function createDocumentationRenderer(context) {
  const { esc, tag } = context;
  const cfg = {
    cols: [
      { label: "Name", cell: r => '<b>' + esc(r.name) + '</b>', text: r => r.name },
      { label: "Link", cell: r => '<span class="mono rp-small cell-truncate">' + esc((r.link || "").replace(/^https:\/\//, "")) + '</span>', text: r => r.link },
      { label: "Linked to", cell: r => moreTags(tag, r.linked, 3), text: r => (r.linked || []).join(" ") }
    ],
    filters: []
  };
  return function renderDocumentation() {
    return renderRecordList(context, "doc", cfg);
  };
}

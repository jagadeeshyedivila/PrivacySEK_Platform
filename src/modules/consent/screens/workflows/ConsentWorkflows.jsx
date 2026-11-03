import { CP_ICONS } from '../../consentIcons.js';

// Date on one line, time beneath it, so date columns stay narrow
function dateTimeCell(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    '<small class="cp-cell-time">' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '</small>';
}

export function calculateWorkflowIssues(w) {
  const issues = [];
  if (!w || !w.nodes) return issues;
  const n = w.nodes;
  if (!n.some(x => x.type === 'start')) issues.push('Add a Start node to begin the workflow.');
  if (!n.some(x => x.type === 'end')) issues.push('Add an End node to terminate the workflow.');

  n.forEach(x => {
    if (x.type !== 'start' && !w.edges.some(e => e[1] === x.id)) {
      issues.push(`"${x.label}" has no incoming connection.`);
    }
    if (x.type !== 'end' && !w.edges.some(e => e[0] === x.id)) {
      issues.push(`"${x.label}" has no outgoing connection.`);
    }
    if (!['start', 'end', 'condition'].includes(x.type)) {
      if (!x.action) issues.push(`"${x.label}": select an integration action.`);
      if (!x.conn) issues.push(`"${x.label}": select an active connection.`);
    }
  });
  return issues;
}

export function createWorkflowsRenderer(context) {
  const { state, runtime, ui, safe, formatDate, formatDateTime, canEdit } = context;

  const NODE_TYPE_ICONS = {
    start: CP_ICONS.play,
    end: CP_ICONS.stop,
    condition: CP_ICONS.branch,
    webhook: CP_ICONS.webhook,
    salesforce: CP_ICONS.cloud,
    hubspot: CP_ICONS.hub,
    zapier: CP_ICONS.zap
  };

  function renderEditor() {
    const w = ui.activeWorkflow;
    if (!w) {
      return `
        <div class="card empty" style="text-align:center;padding:40px;color:var(--text-2)">
          No workflow selected.
          <br><br>
          <button class="btn sm" data-act="cp-back-to-workflows">
            <span class="cp-btn-icon">${CP_ICONS.arrowLeft}</span> Back to Workflows
          </button>
        </div>
      `;
    }

    const iss = calculateWorkflowIssues(w);
    const isEditable = canEdit();
    const dir = ui.workflowDir || 'h';

    const nodeTypes = [
      ['start', 'Start', CP_ICONS.play],
      ['end', 'End', CP_ICONS.stop],
      ['condition', 'Condition', CP_ICONS.branch],
      ...state.integrations.map(i => [
        i[0],
        i[1].replace(/^[^\s]+\s+/, '') + (i[2] ? ' (soon)' : ''),
        NODE_TYPE_ICONS[i[0]] || CP_ICONS.webhook
      ])
    ];

    return `
      <div class="cp-header-row">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn sm o" data-act="cp-back-to-workflows">
            <span class="cp-btn-icon">${CP_ICONS.arrowLeft}</span> Back
          </button>
          <h2 class="cp-header-title">
            ${safe(w.name || 'New Workflow')}
            <span class="cp-badge ${w.status === 'Active' ? 'b-Active' : 'b-Draft'}">${safe(w.status)}</span>
          </h2>
        </div>

        <div class="cp-header-controls">
          <button
            class="cp-badge ${iss.length ? 'b-Reject' : 'b-Yes'}"
            style="cursor:pointer;padding:6px 12px;font-size:12px;border:none"
            data-act="cp-workflow-issues-modal"
            title="Click to view issues"
          >
            <span class="cp-btn-icon">${iss.length ? CP_ICONS.alert : CP_ICONS.check}</span>
            <span>${iss.length} issue${iss.length === 1 ? '' : 's'}</span>
          </button>

          <span class="cp-badge b-Disabled" style="padding:6px 12px;font-size:12px">
            <span class="cp-btn-icon">${CP_ICONS.branch}</span>
            <span>${w.nodes.length} nodes · ${w.edges.length} edges</span>
          </span>

          <div class="cp-seg-control">
            <button
              class="cp-seg-btn ${dir === 'h' ? 'active' : ''}"
              data-act="cp-workflow-dir"
              data-arg="h"
              title="Horizontal Canvas"
            >
              <span class="cp-btn-icon">${CP_ICONS.horizontal}</span> Horizontal
            </button>
            <button
              class="cp-seg-btn ${dir === 'v' ? 'active' : ''}"
              data-act="cp-workflow-dir"
              data-arg="v"
              title="Vertical Canvas"
            >
              <span class="cp-btn-icon">${CP_ICONS.vertical}</span> Vertical
            </button>
          </div>

          <button
            class="btn sm p"
            ${iss.length > 0 || !isEditable ? 'disabled title="Resolve all validation issues to save"' : ''}
            data-act="cp-workflow-save"
          >
            <span class="cp-btn-icon">${CP_ICONS.publish}</span> Save Workflow
          </button>
        </div>
      </div>

      <!-- Node Palette -->
      <div class="card" style="padding:16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <b style="font-size:13px;color:var(--text)">Node Palette</b>
          <small class="dim" style="font-size:12px">Click any node to append it to your canvas</small>
        </div>
        <div class="cp-palette">
          ${nodeTypes.map(p => {
            const isSoon = p[1].includes('(soon)');
            const isStartTaken = p[0] === 'start' && w.nodes.some(x => x.type === 'start');
            const isDisabled = isSoon || isStartTaken || !isEditable;
            const cleanLabel = p[1].replace(/\s+\(soon\)$/, '');

            return `
              <button
                class="cp-palette-btn ${p[0]}"
                ${isDisabled ? 'disabled' : ''}
                data-act="cp-workflow-add-node"
                data-arg="${safe(p[0])}|${safe(cleanLabel)}"
              >
                <span class="cp-palette-icon">${p[2] || CP_ICONS.play}</span>
                <span>${safe(p[1])}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Interactive Canvas -->
      <div class="cp-workflow-canvas ${dir === 'v' ? 'vertical' : ''}">
        ${w.nodes.length ? w.nodes.map(n => {
          const isSelected = ui.connectingNodeId === n.id;
          const nodeCategoryDesc = {
            start: 'Workflow entry trigger',
            end: 'Workflow termination',
            condition: 'Branch decision rules'
          }[n.type] || 'Third-party cloud sync';

          const nodeIcon = NODE_TYPE_ICONS[n.type] || CP_ICONS.webhook;
          const isConnectorActive = ui.connectingNodeId && ui.connectingNodeId !== n.id && n.type !== 'start';

          return `
            <div class="cp-node ${safe(n.type)} ${isSelected ? 'selected' : ''}">
              <div class="cp-node-header">
                <div style="display:flex;align-items:center;gap:6px">
                  <span class="cp-node-type-icon">${nodeIcon}</span>
                  <b>${safe(n.label)}</b>
                </div>
                ${isEditable ? `
                  <button
                    class="cp-node-delete-btn"
                    data-act="cp-workflow-delete-node"
                    data-arg="${safe(n.id)}"
                    title="Remove node"
                  >
                    ${CP_ICONS.x}
                  </button>
                ` : ''}
              </div>
              <span class="cp-node-desc">${safe(nodeCategoryDesc)}</span>

              ${!['start', 'end', 'condition'].includes(n.type) ? `
                <select data-act="cp-workflow-node-action" data-arg="${safe(n.id)}" aria-label="Select action">
                  <option value="">Select action...</option>
                  ${['Create Contact', 'Update Contact', 'Add to List', 'Send Request'].map(a => `
                    <option value="${a}" ${n.action === a ? 'selected' : ''}>${a}</option>
                  `).join('')}
                </select>

                <select data-act="cp-workflow-node-conn" data-arg="${safe(n.id)}" aria-label="Select connection">
                  <option value="">Select connection...</option>
                  <option value="Demo ${safe(n.label)}" ${n.conn === `Demo ${n.label}` ? 'selected' : ''}>
                    Demo ${safe(n.label)} (Connected)
                  </option>
                </select>
              ` : ''}

              <div class="cp-node-actions">
                ${n.type !== 'end' && isEditable ? `
                  <button
                    class="btn sm ${isSelected ? 'p' : 'o'}"
                    style="padding:3px 8px;font-size:11.5px"
                    data-act="cp-workflow-connect-start"
                    data-arg="${safe(n.id)}"
                  >
                    <span class="cp-btn-icon">${CP_ICONS.connect}</span>
                    <span>${isSelected ? 'Pick target…' : 'Connect'}</span>
                  </button>
                ` : '<span></span>'}

                ${isConnectorActive && isEditable ? `
                  <button
                    class="btn sm p"
                    style="padding:3px 8px;font-size:11.5px;background:#10b981;color:#fff"
                    data-act="cp-workflow-connect-end"
                    data-arg="${safe(n.id)}"
                  >
                    <span class="cp-btn-icon">${CP_ICONS.check}</span> Connect here
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('') : `
          <div class="cp-canvas-empty">
            <div class="cp-empty-icon">${CP_ICONS.branch}</div>
            <b>Canvas is empty</b>
            <p>Add a <b>Start</b> node from the palette above to design your automated consent synchronization workflow.</p>
          </div>
        `}
      </div>

      <!-- Connections Listing -->
      <div class="card" style="padding:16px;margin-top:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <b style="font-size:13.5px;color:var(--text)">Configured Node Connections</b>
          <span class="cp-badge b-Disabled">${w.edges.length} active edge${w.edges.length === 1 ? '' : 's'}</span>
        </div>
        ${w.edges.length ? `
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:8px">
            ${w.edges.map((e, idx) => {
              const sourceNode = w.nodes.find(n => n.id === e[0]);
              const targetNode = w.nodes.find(n => n.id === e[1]);
              return `
                <div class="cp-edge-pill">
                  <div style="display:flex;align-items:center;gap:8px;font-size:13px">
                    <span class="cp-edge-node">${safe(sourceNode?.label || e[0])}</span>
                    <span class="cp-edge-arrow">${CP_ICONS.arrowRight}</span>
                    <span class="cp-edge-node">${safe(targetNode?.label || e[1])}</span>
                  </div>
                  ${isEditable ? `
                    <button
                      class="cp-edge-delete-btn"
                      data-act="cp-workflow-delete-edge"
                      data-arg="${idx}"
                      title="Delete connection"
                    >
                      ${CP_ICONS.x}
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <small class="dim">No node connections created yet. Click "Connect" on a source node and then "Connect here" on the destination node.</small>
        `}
      </div>
    `;
  }

  return function renderConsentWorkflows() {
    if (ui.workflowView === 'editor' && ui.activeWorkflow) {
      return renderEditor();
    }

    const q = (ui.workflowSearch || '').trim().toLowerCase();
    const isEditable = canEdit();

    const filtered = state.workflows.filter(w => {
      if (!q) return true;
      return w.name.toLowerCase().includes(q) || w.status.toLowerCase().includes(q);
    });

    const totalWf = state.workflows.length;
    const activeWf = state.workflows.filter(w => w.status === 'Active').length;
    const totalNodes = state.workflows.reduce((acc, w) => acc + (w.nodes?.length || 0), 0);

    return `
      <!-- Top Metrics Summary -->
      <div class="cp-grid-4" style="margin-bottom:14px">
        <div class="card" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Total Workflows</span>
            <span class="cp-stat-icon" style="color:var(--accent)">${CP_ICONS.branch}</span>
          </div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:var(--text)">${totalWf}</div>
          <small class="dim" style="font-size:11.5px">Automation pipelines</small>
        </div>

        <div class="card" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Active Automations</span>
            <span class="cp-stat-icon" style="color:#10b981">${CP_ICONS.check}</span>
          </div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:var(--text)">${activeWf}</div>
          <small class="dim" style="font-size:11.5px">Live event triggers</small>
        </div>

        <div class="card" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Execution Nodes</span>
            <span class="cp-stat-icon" style="color:#3b82f6">${CP_ICONS.layout}</span>
          </div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:var(--text)">${totalNodes}</div>
          <small class="dim" style="font-size:11.5px">Configured logic steps</small>
        </div>

        <div class="card" style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="dim" style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">Sync Engine</span>
            <span class="cp-stat-icon" style="color:#8b5cf6">${CP_ICONS.zap}</span>
          </div>
          <div style="font-size:24px;font-weight:700;margin-top:6px;color:var(--text)">Healthy</div>
          <small class="dim" style="font-size:11.5px">Real-time webhook queue</small>
        </div>
      </div>

      <!-- Header & Toolbar -->
      <div class="cp-header-row">
        <div style="display:flex;align-items:center;gap:10px">
          <h2 class="cp-header-title">Workflow Records</h2>
          <span class="cp-records-badge">${filtered.length} pipeline${filtered.length === 1 ? '' : 's'}</span>
        </div>
        <div class="cp-header-controls">
          <div class="cp-records-search-wrap" style="width:230px;min-width:0">
            <span class="cp-records-search-icon">${CP_ICONS.search}</span>
            <input
              type="search"
              class="cp-records-search-input"
              placeholder="Search workflows..."
              value="${safe(ui.workflowSearch || '')}"
              data-input-act="cp-workflow-search"
              aria-label="Search workflows"
            />
            ${ui.workflowSearch ? `
              <button class="cp-records-search-clear" data-act="cp-workflow-clear-search" aria-label="Clear search">
                ${CP_ICONS.x}
              </button>
            ` : ''}
          </div>
          <button
            class="btn sm p"
            ${isEditable ? '' : 'disabled title="Read-only mode"'}
            data-act="cp-workflow-new"
          >
            <span class="cp-btn-icon">${CP_ICONS.plus}</span> Create Workflow
          </button>
        </div>
      </div>

      <!-- Table Card -->
      <div class="card cp-records-card" style="padding:0;overflow:hidden">
        <div class="cp-table-wrap">
          <table class="t cp-records-table cp-table-auto">
            <thead>
              <tr>
                <th>ID</th>
                <th>Workflow Name</th>
                <th>Status</th>
                <th>Nodes</th>
                <th>Created At</th>
                <th>Last Updated</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length ? filtered.map(w => `
                <tr>
                  <td class="cp-cell-mono">${safe(w.id)}</td>
                  <td>
                    <a
                      href="javascript:void(0)"
                      class="cp-id-link"
                      data-act="cp-workflow-open"
                      data-arg="${safe(w.id)}"
                      style="font-size:13.5px"
                    >
                      ${safe(w.name)}
                    </a>
                  </td>
                  <td>
                    <span class="cp-badge ${w.status === 'Active' ? 'b-Active' : 'b-Draft'}">${safe(w.status)}</span>
                  </td>
                  <td>
                    <span class="cp-badge b-Disabled" style="font-size:11px">
                      <span class="cp-btn-icon">${CP_ICONS.branch}</span> ${w.nodes.length} nodes
                    </span>
                  </td>
                  <td class="dim cp-cell-mono">${dateTimeCell(w.created)}</td>
                  <td class="dim cp-cell-mono">${dateTimeCell(w.updated)}</td>
                  <td style="text-align:right;white-space:nowrap">
                    <button class="btn sm o" data-act="cp-workflow-open" data-arg="${safe(w.id)}" style="padding:4px 8px;font-size:12px" title="Edit workflow">
                      <span class="cp-btn-icon">${CP_ICONS.edit}</span> Edit
                    </button>
                    ${isEditable ? `
                      <button
                        class="btn sm o"
                        data-act="cp-workflow-delete"
                        data-arg="${safe(w.id)}"
                        style="padding:4px 8px;font-size:12px;color:#ef4444;margin-left:4px"
                        title="Delete workflow"
                      >
                        <span class="cp-btn-icon" style="color:#ef4444">${CP_ICONS.trash}</span>
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="7">
                    <div class="cp-empty-state">
                      <div class="cp-empty-icon">${CP_ICONS.branch}</div>
                      <b>No Workflows Found</b>
                      <p>No automation workflows match your search query.</p>
                      <button class="btn sm o" data-act="cp-workflow-clear-search">Clear Search</button>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };
}

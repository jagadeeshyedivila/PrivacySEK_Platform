const fs = require('fs');
let code = fs.readFileSync('src/modules/cookies/actions/scannerActions.js', 'utf8');

// 1. Update syncBackendData to handle both array and object formats for backendHistory
const syncTarget = `      if (Array.isArray(backendHistory) && backendHistory.length > 0) {
        // Merge backend scans into state.scans
        for (const bScan of backendHistory) {`;

const syncReplace = `      const scanList = Array.isArray(backendHistory) ? backendHistory : (backendHistory?.scans || []);
      if (scanList.length > 0) {
        // Merge backend scans into state.scans
        for (const bScan of scanList) {`;

code = code.replace(syncTarget, syncReplace);

// 2. Update cookieRows in cc-view-scan-report
const cookieRowsTarget = `    const cookieRows = cookies.map((c, idx) => \`
      <tr class="cc-report-cookie-row" data-search="\${safe(\`\${c.name} \${c.domain} \${c.provider} \${c.category}\`).toLowerCase()}" data-category="\${safe(c.category)}">
        <td style="width:26%;">
          <span class="cc-report-cookie-title" title="\${safe(c.name)}">\${safe(c.name)}</span>
          <span class="cc-report-cookie-meta" title="\${safe(c.path)} · \${safe(c.duration)}">\${safe(c.path)} · \${safe(c.duration)}</span>
        </td>
        <td style="width:20%;font-family:var(--f-mono);font-size:11px;">
          <span class="cc-report-cell-truncate" title="\${safe(c.domain)}">\${safe(c.domain)}</span>
        </td>
        <td style="width:14%;">
          <span class="cc-report-cell-truncate" title="\${safe(c.provider || "Unknown")}">\${safe(c.provider || "Unknown")}</span>
        </td>
        <td style="width:14%;">
          \${runtime.pill(c.category === "necessary" ? "ok" : c.category === "analytics" ? "info" : c.category === "advertising" ? "risk" : "n", c.category)}
        </td>
        <td style="width:12%;">
          \${runtime.pill(c.confidence === "high" ? "ok" : c.confidence === "medium" ? "info" : "risk", c.confidence || "Needs Review")}
        </td>
        <td style="width:14%;">
          <span style="font-size:10.5px;color:var(--text-2);display:block;">\${safe(c.party)}</span>
          <span style="display:inline-flex;gap:3px;margin-top:2px;">
            \${c.secure ? runtime.pill("ok", "Secure") : runtime.pill("n", "HTTP")}
            \${c.httpOnly ? runtime.pill("ok", "HttpOnly") : ""}
          </span>
        </td>
      </tr>
    \`).join("");`;

const cookieRowsReplace = `    const cookieRows = cookies.map((c, idx) => {
      const isUnclassified = c.category === "unclassified" || c.classificationStatus === "Review required";
      const catObj = (state.categories || []).find(cat => cat.id === c.category);
      const catLabel = catObj?.name || c.category;

      const catPillHtml = runtime.pill(
        c.category === "necessary" ? "ok"
        : c.category === "analytics" ? "info"
        : c.category === "marketing" ? "risk"
        : c.category === "advertising" ? "risk"
        : c.category === "functional" ? "mask"
        : c.category === "social_media" ? "dim"
        : "n",
        catLabel
      );

      return \`
      <tr class="cc-report-cookie-row" data-search="\${safe(\`\${c.name} \${c.domain} \${c.provider} \${c.category}\`).toLowerCase()}" data-category="\${safe(c.category)}">
        <td style="width:24%;">
          <span class="cc-report-cookie-title" title="\${safe(c.name)}">\${safe(c.name)}</span>
          <span class="cc-report-cookie-meta" title="\${safe(c.path)} · \${safe(c.duration)}">\${safe(c.path)} · \${safe(c.duration)}</span>
        </td>
        <td style="width:18%;font-family:var(--f-mono);font-size:11px;">
          <span class="cc-report-cell-truncate" title="\${safe(c.domain)}">\${safe(c.domain)}</span>
        </td>
        <td style="width:14%;">
          <span class="cc-report-cell-truncate" title="\${safe(c.provider || "Unknown")}">\${safe(c.provider || "Unknown")}</span>
        </td>
        <td style="width:18%;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            \${isUnclassified ? \`
              <select class="cc-report-cat-select" data-act="cc-report-classify-cookie" data-scan-id="\${safe(scan.id)}" data-cookie-name="\${safe(c.name)}" style="height:26px;font-size:11px;padding:2px 6px;border-radius:6px;border:1px solid var(--accent);background:var(--surface-2);color:var(--text);font-weight:600;cursor:pointer;" title="Classify cookie category">
                <option value="" disabled selected>Classify…</option>
                <option value="necessary">Necessary</option>
                <option value="functional">Functional</option>
                <option value="analytics">Analytics</option>
                <option value="marketing">Marketing</option>
                <option value="advertising">Advertising</option>
                <option value="social_media">Social Media</option>
              </select>
            \` : \`
              \${catPillHtml}
              <select class="cc-report-cat-select-sm" data-act="cc-report-classify-cookie" data-scan-id="\${safe(scan.id)}" data-cookie-name="\${safe(c.name)}" style="height:20px;font-size:10px;padding:0 3px;border-radius:4px;border:1px solid var(--line-2);background:transparent;color:var(--text-3);cursor:pointer;" title="Change category">
                <option value="" disabled selected>Edit</option>
                <option value="necessary">Necessary</option>
                <option value="functional">Functional</option>
                <option value="analytics">Analytics</option>
                <option value="marketing">Marketing</option>
                <option value="advertising">Advertising</option>
                <option value="social_media">Social Media</option>
              </select>
            \`}
          </div>
        </td>
        <td style="width:12%;">
          \${runtime.pill(c.confidence === "high" ? "ok" : c.confidence === "medium" ? "info" : "risk", c.confidence || "Needs Review")}
        </td>
        <td style="width:14%;">
          <span style="font-size:10.5px;color:var(--text-2);display:block;">\${safe(c.party)}</span>
          <span style="display:inline-flex;gap:3px;margin-top:2px;">
            \${c.secure ? runtime.pill("ok", "Secure") : runtime.pill("n", "HTTP")}
            \${c.httpOnly ? runtime.pill("ok", "HttpOnly") : ""}
          </span>
        </td>
      </tr>
    \`;
    }).join("");`;

code = code.replace(cookieRowsTarget, cookieRowsReplace);

// 3. Update category buttons in report filter bar to include Marketing
const filterBarTarget = `              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="analytics">Analytics (\${cookies.filter(c => c.category === 'analytics').length})</button>
              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="advertising">Advertising (\${cookies.filter(c => c.category === 'advertising').length})</button>`;

const filterBarReplace = `              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="analytics">Analytics (\${cookies.filter(c => c.category === 'analytics').length})</button>
              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="marketing">Marketing (\${cookies.filter(c => c.category === 'marketing').length})</button>
              <button class="btn sm cc-report-cat-btn" data-act="cc-filter-report-category" data-arg="advertising">Advertising (\${cookies.filter(c => c.category === 'advertising').length})</button>`;

code = code.replace(filterBarTarget, filterBarReplace);

// 4. Register cc-report-classify-cookie action
const actionRegisterTarget = '  // Report modal interactive tab switching';
const actionRegisterAddition = `  // Action to classify an unclassified cookie from the scan report
  ACT["cc-report-classify-cookie"] = async (newCategory, selectEl) => {
    if (!newCategory || !selectEl) return;
    const scanId = selectEl.getAttribute("data-scan-id");
    const cookieName = selectEl.getAttribute("data-cookie-name");
    const scan = state.scans.find(s => s.id === scanId);
    if (!scan) return;

    const cookies = scan.report?.cookies || [];
    const targetCookie = cookies.find(c => c.name === cookieName);
    if (!targetCookie) return;

    targetCookie.category = newCategory;
    targetCookie.classificationStatus = "Reviewed";
    targetCookie.confidence = "manual";
    const catObj = (state.categories || []).find(cat => cat.id === newCategory);
    targetCookie.purpose = catObj?.name || newCategory;

    // Recalculate scan counts
    scan.report.unclassifiedCount = cookies.filter(
      c => c.category === "unclassified" || c.classificationStatus === "Review required"
    ).length;
    scan.unclassifiedCount = scan.report.unclassifiedCount;

    // 1. Sync consistently to Cookie Inventory (state.cookies)
    let invCookie = (state.cookies || []).find(
      c => c.name.toLowerCase() === cookieName.toLowerCase()
    );
    if (invCookie) {
      invCookie.category = newCategory;
      invCookie.classificationStatus = "Reviewed";
      invCookie.purpose = targetCookie.purpose;
      try {
        await cookieApi.updateCookie(invCookie.id, {
          category: newCategory,
          classificationStatus: "Reviewed",
          purpose: targetCookie.purpose,
        });
      } catch (err) {
        console.warn("Could not update cookie inventory in DB:", err.message);
      }
    } else {
      const newInventoryCookie = {
        name: targetCookie.name,
        category: newCategory,
        domain: targetCookie.domain || (scan.url ? new URL(scan.url).hostname : "demo.privacysek.example"),
        path: targetCookie.path || "/",
        party: targetCookie.party || "First-party",
        provider: targetCookie.provider || "Discovered on Website",
        duration: targetCookie.duration || "Session",
        description: targetCookie.description || ("Discovered by Playwright scan on " + scan.url),
        httpOnly: Boolean(targetCookie.httpOnly),
        secure: Boolean(targetCookie.secure),
        sameSite: targetCookie.sameSite || "Lax",
        classificationStatus: "Reviewed",
        purpose: targetCookie.purpose,
        lastDetected: isoNow(),
        sourcePage: scan.url,
        scanId: scan.id,
      };
      try {
        const saved = await cookieApi.createCookie(newInventoryCookie);
        state.cookies.unshift(saved);
      } catch {
        state.cookies.unshift({
          id: "cookie-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          ...newInventoryCookie,
        });
      }
    }

    // 2. Persist update to MongoDB for scan report
    try {
      await scannerApi.updateScanCookie(scan.id, {
        cookieName: targetCookie.name,
        category: newCategory,
        classificationStatus: "Reviewed",
        confidence: "manual",
        purpose: targetCookie.purpose,
      });
    } catch (err) {
      console.warn("Could not save scan report update to scanner DB:", err.message);
    }

    // 3. Ensure Cookie Consent configuration reflects the category
    if (state.visitor && state.visitor.categories && state.visitor.categories[newCategory] === undefined) {
      state.visitor.categories[newCategory] = false;
    }
    if (state.draft) {
      persist();
    } else {
      runtime.render();
    }

    runtime.toast('Cookie "' + cookieName + '" categorized as ' + (catObj?.name || newCategory) + ' and saved to Inventory.');

    // 4. Update the Report modal DOM so user sees the change immediately
    ACT["cc-view-scan-report"](scan.id);
  };\r\n\r\n  // Report modal interactive tab switching`;

code = code.replace(actionRegisterTarget, actionRegisterAddition);

// 5. Update cc-sync-scan-to-inventory to also sync category when updating existing cookies
const syncExistingTarget = `        existing.lastDetected = isoNow();
        existing.secure = dc.secure;
        existing.httpOnly = dc.httpOnly;
        existing.duration = dc.duration || existing.duration;`;

const syncExistingReplace = `        existing.lastDetected = isoNow();
        existing.secure = dc.secure;
        existing.httpOnly = dc.httpOnly;
        existing.duration = dc.duration || existing.duration;
        if (dc.category && dc.category !== "unclassified") {
          existing.category = dc.category;
          existing.classificationStatus = "Reviewed";
        }`;

code = code.replace(syncExistingTarget, syncExistingReplace);

fs.writeFileSync('src/modules/cookies/actions/scannerActions.js', code, 'utf8');
console.log('Successfully updated src/modules/cookies/actions/scannerActions.js');

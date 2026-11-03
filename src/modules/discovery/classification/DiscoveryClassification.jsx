import { OVERVIEW_SEED } from "../discoveryData.js";
import { computeDiscoveryModel } from "../overview/discoveryInsights.js";
import { renderClassification, renderPolicyTable, renderRiskConfidence } from "../overview/insightPanels.js";

// Classification: the sensitivity breakdown, recognizer risk and confidence, and the policy that
// maps each detected type to a class.
export function createClassificationRenderer(context) {
  const { D } = context;

  return function renderDiscoveryClassification() {
    const m = computeDiscoveryModel(context.getStore(), D, OVERVIEW_SEED);
    return `
      <div class="dd-container">
        <div class="dd-dash-row dd-dash-row-a">
          ${renderClassification(context, m)}
          ${renderRiskConfidence(context, m)}
        </div>
        ${renderPolicyTable(context, m)}
      </div>`;
  };
}

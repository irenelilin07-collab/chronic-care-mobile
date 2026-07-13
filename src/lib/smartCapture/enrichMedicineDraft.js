import { mergeMedicineDrafts } from "./mergeMedicineDrafts.js";
import { resolveDraftInventory } from "./inventoryMatch.js";
import { resolveDraftDuplicatePlan } from "./planDuplicate.js";
import { updateDraftItemTimeLabel } from "./draftToPayload.js";

export function resolveMedicineDraft(item, medicines, medicationPlans = []) {
  let next = resolveDraftInventory(item, medicines);
  next = resolveDraftDuplicatePlan(next, medicines, medicationPlans);
  next = updateDraftItemTimeLabel(next);
  return next;
}

export function enrichMedicineDrafts(drafts, medicines, medicationPlans = []) {
  return mergeMedicineDrafts(drafts).map((item) =>
    resolveMedicineDraft(item, medicines, medicationPlans)
  );
}

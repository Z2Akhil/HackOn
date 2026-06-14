# Donation Return Flow Integration - Task Specification

## OVERVIEW
Integrate the `DonationMatcher` component into the `ReturnModal` so users can donate items directly instead of returning them. When a user selects "💝 Donate to Charity" as the return reason, the flow should skip photo grading and show nearby charities for selection, then record the donation with impact metrics.

## TASK 1: Integrate DonationMatcher into ReturnModal Flow
**Task ID**: task-001-donate-flow-integration
**Status**: not_started
**Depends on**: (none - root task)

### Context
- Current state: `ReturnModal.tsx` has "Donate to Charity" option added to RETURN_REASONS, but no flow handling
- `DonationMatcher.tsx` exists and is ready to import, handles charity selection and donation recording
- Need to modify step progression to handle donation pathway without photo upload/grading

### Requirements
1. When user selects "💝 Donate to Charity" reason, skip upload/grading steps
2. Show `DonationMatcher` component to select nearby charity
3. Record donation via DonationMatcher's API integration
4. Show donation confirmation panel with impact (lives impacted)
5. Handle success/error states

### Implementation Details
1. Add "charity_selection" to Step type (currently: "reason" | "upload" | "extracting" | "grading" | "result")
2. Modify step progression logic:
   - If reason === "donate": reason → charity_selection → result
   - Else: reason → upload → grading → result
3. Import DonationMatcher component into ReturnModal
4. In charity_selection step, render DonationMatcher with:
   - buyerId: "b001" (hardcoded for MVP - mock user)
   - productId: order.product_id
   - productName: order.product_name
   - productCategory: order.category
   - productMrp: order.mrp
   - grade: { grade: "A" } (mock for donation - not graded)
   - onDonationSelected: callback to move to result step
5. Handle DonationMatcher response:
   - Extract lives_impacted from donation API response
   - Create a "donate" disposition object to pass to NextStepPanel
6. NextStepPanel already has "donate" config - reuse existing DECISION_CONFIG["donate"]
7. Update STEPS progression to show only ["Reason", "Result"] for donation flow (hide "Photos")

### Success Criteria
- ✅ User can select "💝 Donate to Charity" from reason list
- ✅ Modal shows charity picker (DonationMatcher component)
- ✅ Nearby charities display with distance and details
- ✅ User can click charity to select it
- ✅ Donation is recorded via API (POST /api/donations)
- ✅ Success panel shows donation decision with impact metrics
- ✅ Modal can close after donation confirmation
- ✅ No console errors

### Files to Modify
- `components/ReturnModal.tsx` (main integration)

### Dependencies
- ✅ `components/DonationMatcher.tsx` (already exists)
- ✅ `app/api/donations/route.ts` (already exists)
- ✅ `types/index.ts` (already has Charity, DonationRecord types)

## Task Metadata
- **Effort**: Medium (1-2 hours)
- **Priority**: High (unblocks user flow)
- **Testing**: Manual - test in UI, verify donation recorded in API
- **Risk**: Low - reusing existing components and APIs

import GeneralComplianceQueue from './GeneralComplianceQueue'

/** Unassigned pickup queue — mirrors Website Compliance “Review queue”. */
export default function GeneralComplianceReviewQueue() {
  return <GeneralComplianceQueue variant="review" />
}

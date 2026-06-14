/**
 * Spec-named alias of the pipeline orchestrator. Implementation lives in
 * ./processDocument.
 *
 * Exposes the single brain function processDocument(documentId) which runs
 * the entire flow:
 *   1. Fetch document
 *   2. Mark as PROCESSING
 *   3. OCR extract
 *   4. AI classify (with 2 internal retries)
 *   5. Validate AI output (with 2 retries)
 *   6. Normalize
 *   7. Save to DB
 *   8. Update accounting summary
 *   9. Mark PROCESSED (or FAILED on unrecoverable error)
 */

export { processDocument } from "./processDocument";
export type { PipelineResult, PipelineStep } from "./processDocument";

/**
 * Spec-named alias of the accounting engine. Implementation lives in ./engine.
 *
 * Provides:
 *   - addTransaction, addTransactionsBatch
 *   - calculateFinancialSummary (re-exported as calculateSummary)
 *   - generateMonthlyReport (re-exported as generatePnL)
 *   - generateYearlyPnL
 *
 * Every value is computed from the database — never hardcoded.
 */

export {
  addTransaction,
  addTransactionsBatch,
  calculateSummary as calculateFinancialSummary,
  calculateSummary,
  generatePnL as generateMonthlyReport,
  generatePnL,
  generateYearlyPnL,
} from "./engine";

export type { Summary, PnLPeriod } from "./engine";

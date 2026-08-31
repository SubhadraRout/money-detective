export type Currency = "INR";

export type PaymentMethod =
  | "upi"
  | "card"
  | "netbanking"
  | "wallet";

export type OrderStatus =
  | "created"
  | "paid"
  | "cancelled"
  | "fulfilled"
  | "returned";

export type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded";

export type RefundStatus =
  | "initiated"
  | "processed"
  | "failed";

export type SettlementStatus =
  | "settled"
  | "pending"
  | "failed";

export type FeeType =
  | "processing"
  | "platform"
  | "international"
  | "adjustment";

export type LeakageType =
  | "DUPLICATE_REFUND"
  | "CAPTURED_CANCELLED_NO_REFUND"
  | "REFUND_AMOUNT_MISMATCH"
  | "SETTLEMENT_MISMATCH"
  | "MISSING_SETTLEMENT"
  | "UNEXPLAINED_ADJUSTMENT";

export type GroundTruthSeverity =
  | "low"
  | "medium"
  | "high";

export interface Order {
  orderId: string;
  customerId: string;

  orderAmount: number;
  currency: Currency;

  status: OrderStatus;

  createdAt: string;
  cancelledAt?: string;
  fulfilledAt?: string;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  customerId: string;

  amount: number;
  currency: Currency;

  method: PaymentMethod;
  status: PaymentStatus;

  createdAt: string;
  authorizedAt?: string;
  capturedAt?: string;
  failedAt?: string;

  settlementId?: string;
}

export interface Refund {
  refundId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  expectedAmount?: number;
  currency: Currency;
  status: RefundStatus;
  reason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface Fee {
  feeId: string;

  paymentId: string;

  type: FeeType;

  amount: number;
  tax: number;

  currency: Currency;

  createdAt: string;
}

export interface Settlement {
  settlementId: string;

  paymentId: string;

  grossAmount: number;

  fees: number;
  taxes: number;
  adjustments: number;

  netAmount: number;

  currency: Currency;

  settlementDate: string;

  status: SettlementStatus;
}

export interface Evidence {
  source:
    | "order"
    | "payment"
    | "refund"
    | "settlement"
    | "fee";

  recordId: string;

  field: string;

  value: string | number;

  explanation: string;
}

export interface InvestigationCandidate {
  caseId: string;

  type: LeakageType;

  orderId?: string;
  paymentId?: string;

  refundIds?: string[];

  settlementId?: string;

  expectedAmount: number;
  actualAmount: number;

  potentialLeakage: number;

  evidence: Evidence[];

  deterministicReason: string;
}

export interface GroundTruthCase {
  caseId: string;

  type?: LeakageType;

  orderId?: string;
  paymentId?: string;
  settlementId?: string;

  expectedLeakage: number;

  groundTruth: boolean;

  severity?: GroundTruthSeverity;
}

export interface FinancialDataset {
  version: string;

  generatedAt: string;

  description: string;

  orders: Order[];

  payments: Payment[];

  refunds: Refund[];

  fees: Fee[];

  settlements: Settlement[];

  groundTruth: GroundTruthCase[];
}
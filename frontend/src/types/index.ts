export interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  mfa_enabled: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  account_number: string;
  account_type: string;
  balance: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  sender_account_id: string | null;
  receiver_account_id: string | null;
  amount: string;
  currency: string;
  transaction_type: string;
  status: string;
  narration: string | null;
  fraud_score: number | null;
  nip_reference: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface FraudAlert {
  id: string;
  transaction_id: string;
  risk_score: number;
  alert_type: string;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  transaction_id: string | null;
  event_type: string;
  event_detail: Record<string, unknown> | null;
  ip_address: string | null;
  hmac_signature: string;
  created_at: string;
}

export interface Card {
  id: string;
  account_id: string;
  masked_pan: string;
  card_type: string;
  expiry_month: number;
  expiry_year: number;
  is_active: boolean;
  created_at: string;
}

export interface GiftCard {
  id: string;
  code: string;
  amount: string;
  currency: string;
  denomination_label: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CryptoHolding {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  mid_ngn: string;
  ngn_value: string;
  change_24h_pct: number;
}

export interface CryptoTransaction {
  id: string;
  symbol: string;
  transaction_type: string;
  crypto_amount: string;
  ngn_amount: string;
  rate: string;
  status: string;
  created_at: string;
}

export interface CryptoRate {
  symbol: string;
  name: string;
  icon: string;
  mid_ngn: number;
  buy_ngn: number;
  sell_ngn: number;
  change_24h_pct: number;
}

export interface ApiError {
  type?: string;
  title?: string;
  status: number;
  detail: string;
}

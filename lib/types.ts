export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  delivery_eta_minutes: number;
  stock_count: number;
  tags: string[];
  dietary_tags: string[];
  image: string;
  previous_order_count: number;
  margin_score: number;
  trust_score: number;
  description: string;
  pros: string[];
  cons: string[];
  usage_instructions: string;
  substitutes: string[];
  is_repeat?: boolean;
  is_bestseller?: boolean;
  is_prime?: boolean;
  requires_caution?: boolean;
};

export type IntentResult = {
  raw_input: string;
  intent_type: 'emergency' | 'guided' | 'predictive' | 'vision_list' | 'vision_product' | 'reorder' | 'general';
  category: string;
  goal: string;
  urgency_score: number;
  constraints: string[];
  dietary: string[];
  cart_type: string;
  hinglish_response: string;
  suggested_questions?: string[];
};

export type RankingBreakdown = {
  intent_match_score: number;
  urgency_eta_score: number;
  preference_match_score: number;
  trust_score: number;
  availability_score: number;
  price_value_score: number;
  business_margin_score: number;
  final_score: number;
  weights: Record<string, number>;
};

export type SmartCard = {
  id: string;
  type: 'fastest' | 'best_match' | 'trusted_repeat' | 'smart_combo';
  title: string;
  subtitle: string;
  badge: string;
  items: { product: Product; qty: number }[];
  price_total: number;
  mrp_total: number;
  eta_minutes: number;
  reason: string;
  trust_indicators: string[];
  ranking: RankingBreakdown;
};

export type ExplainResult = {
  why: string[];
  pros: string[];
  cons: string[];
  usage: string;
  alternatives: { id: string; name: string; reason: string }[];
  preference_match: string;
};

export type Reminder = {
  id: string;
  product_id: string;
  product_name: string;
  reason: string;
  predicted_run_out_date: string;
  days_until: number;
  cycle_days: number;
  confidence: number;
};

export type CartItem = { product: Product; qty: number };

export type CheckoutResult = {
  order_id: string;
  eta_minutes: number;
  total: number;
  undo_window_seconds: number;
  payment_method: string;
  address: string;
  placed_at: string;
};

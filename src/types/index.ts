// =====================================================
// Tipos TypeScript do sistema Space Fit
// =====================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  active: boolean;
  display_order: number;
  is_bundle_category: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id?: string;
  category?: Category;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compare_price?: number;
  stock: number;
  images: string[];
  sizes: string[];
  active: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
  reviews?: Review[];
}

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment?: string;
  approved: boolean;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link?: string;
  active: boolean;
  display_order: number;
  highlighted_words?: number[];
  highlight_color?: string;
  button_text?: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order: number;
  max_uses?: number;
  uses_count: number;
  active: boolean;
  starts_at?: string;
  expires_at?: string;
  created_at: string;
}

export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';
export type PaymentMethod = 'pix' | 'credit_card' | 'pickup';

export interface OrderAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_image?: string;
  size?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  address?: OrderAddress;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  coupon_code?: string;
  mp_payment_id?: string;
  mp_preference_id?: string;
  notes?: string;
  points_to_use?: number;
  points_earned?: number;
  points_processed?: boolean;
  created_at: string;
  updated_at: string;
}

// Carrinho (estado local)
export interface CartItem {
  product_id: string;
  product_name: string;
  product_slug: string;
  product_image?: string;
  size?: string;
  quantity: number;
  unit_price: number;
}

// Fidelidade
export interface LoyaltyAccount {
  id: string;
  customer_phone: string;
  customer_name?: string;
  points: number;
  total_spent: number;
  created_at: string;
}

// Bundle / Kit
export interface Bundle {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  image_url?: string;
  images?: string[];
  active: boolean;
  items?: BundleItem[];
  created_at: string;
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

// Assinaturas
export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  product_id?: string;
  price: number;
  interval_days: number;
  active: boolean;
  product?: Product;
  created_at: string;
}

export interface Subscription {
  id: string;
  plan_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  next_billing_date?: string;
  plan?: SubscriptionPlan;
  created_at: string;
}

export type CategoryType = 
  | 'الكل'
  | 'الهواتف'
  | 'السيارات'
  | 'الأجهزة والإلكترونيات'
  | 'البيت والأثاث'
  | 'المواشي والزراعة'
  | 'خدمات'
  | 'ملابس'
  | 'عقارات'
  | 'أخرى';

export const AL_WALI_NEIGHBORHOODS = [
  'حي فريق قدام',
  'حي فريق وراء',
  'حي فريق الرحمة',
  'حي فريق النص',
  'حي فريق الميدان',
] as const;

export type AlWaliNeighborhood = typeof AL_WALI_NEIGHBORHOODS[number];

export interface Product {
  id: string;
  title: string;
  cat: CategoryType;
  price: number;
  currency?: string;
  desc: string;
  img: string;
  phone: string;
  uid: string;
  sellerName?: string;
  sellerNeighborhood?: string;
  isSellerVerified?: boolean;
  location?: string;
  createdAt: number | { seconds: number; nanoseconds: number } | string;
  views?: number;
  isFeatured?: boolean;
}

export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName: string;
  phoneNumber?: string | null;
  photoURL?: string | null;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  isVerified?: boolean;
  role?: string;
  neighborhood?: string;
  village?: string;
  location?: string;
  createdAt?: string | number;
}



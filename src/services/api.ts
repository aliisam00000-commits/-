import { Product, UserProfile, CategoryType } from '../types';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  onSnapshot, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';

const STORAGE_KEY_USER = 'souq_alwali_active_user';
const STORAGE_KEY_PRODUCTS = 'souq_alwali_permanent_products_cache';

// Get active saved user from localStorage
export function getSavedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading saved user', e);
  }
  return null;
}

// Save active user
export function saveActiveUser(user: UserProfile | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch (e) {
    console.error('Error saving active user', e);
  }
}

const LEGACY_CLEANED_FLAG = 'souq_alwali_legacy_cleared_v2';

// Read products cache from localStorage
function getLocalCachedProducts(): Product[] {
  try {
    // One-time clear of previous static ads if not cleared yet
    if (!localStorage.getItem(LEGACY_CLEANED_FLAG)) {
      localStorage.removeItem(STORAGE_KEY_PRODUCTS);
      localStorage.setItem(LEGACY_CLEANED_FLAG, 'true');
      return [];
    }

    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (p) => p && p.id && !/^prod-[1-9]$/.test(p.id) && p.id !== 'prod-1786821605590-c574n'
        );
      }
    }
  } catch (e) {
    console.warn('Could not parse local products cache:', e);
  }
  return [];
}

// Save products cache to localStorage
function saveLocalCachedProducts(products: Product[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.warn('Could not save local products cache:', e);
  }
}

// Merge product arrays without duplicates, preserving newest data
function mergeProducts(target: Product[], incoming: Product[]): Product[] {
  const map = new Map<string, Product>();
  
  // Add target first
  target.forEach((p) => {
    if (p && p.id) map.set(p.id, p);
  });

  // Merge incoming
  incoming.forEach((p) => {
    if (p && p.id) {
      const existing = map.get(p.id);
      if (!existing || (p.createdAt && (!existing.createdAt || p.createdAt >= existing.createdAt))) {
        map.set(p.id, { ...existing, ...p });
      }
    }
  });

  // Return sorted descending by createdAt
  const merged = Array.from(map.values());
  merged.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  return merged;
}

// =====================================
// CENTRAL CLOUD FIRESTORE & ONLINE DATABASE API
// =====================================

// 1. Fetch all products from shared cloud Firestore and server database
export async function fetchOnlineProducts(category?: CategoryType, search?: string, sort?: string): Promise<Product[]> {
  let allProducts: Product[] = getLocalCachedProducts();

  // Try Firestore collection
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    const firestoreProducts: Product[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Product;
        firestoreProducts.push({
          ...data,
          id: docSnap.id
        });
      }
    });
    if (firestoreProducts.length > 0) {
      allProducts = mergeProducts(allProducts, firestoreProducts);
    }
  } catch (firestoreErr) {
    console.warn('Firestore fetch note:', firestoreErr);
  }

  // Also try backend server
  try {
    const params = new URLSearchParams();
    if (category && category !== 'الكل') params.append('cat', category);
    if (search) params.append('search', search);
    if (sort) params.append('sort', sort);

    const res = await fetch(`/api/products?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.products && Array.isArray(data.products)) {
        allProducts = mergeProducts(allProducts, data.products);
      }
    }
  } catch (err) {
    console.warn('Server products fetch note:', err);
  }

  // Save back to cache
  saveLocalCachedProducts(allProducts);

  // Apply in-memory filtering
  let filtered = [...allProducts];
  if (category && category !== 'الكل') {
    filtered = filtered.filter((p) => p.cat === category);
  }
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.desc?.toLowerCase().includes(q) ||
        p.cat?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.sellerName?.toLowerCase().includes(q)
    );
  }

  if (sort === 'price_low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_high') {
    filtered.sort((a, b) => b.price - a.price);
  } else {
    filtered.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  }

  return filtered;
}

// 2. Real-time Subscription with Cloud Firestore + Server Polling
export function subscribeToOnlineProducts(callback: (products: Product[]) => void) {
  let isSubscribed = true;
  let activeProducts: Product[] = getLocalCachedProducts();

  // Initial notify from cache immediately so screen is never empty
  if (activeProducts.length > 0) {
    callback(activeProducts);
  }

  // 1. Cloud Firestore Real-Time Listener (Instant across all users and forever permanent)
  let unsubscribeFirestore = () => {};
  try {
    unsubscribeFirestore = onSnapshot(collection(db, 'products'), (snapshot) => {
      if (!isSubscribed) return;
      const cloudProducts: Product[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Product;
          cloudProducts.push({
            ...data,
            id: docSnap.id
          });
        }
      });

      if (cloudProducts.length > 0 || snapshot.empty) {
        activeProducts = cloudProducts.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
        saveLocalCachedProducts(activeProducts);
        callback(activeProducts);
      }
    }, (error) => {
      console.warn('Firestore live subscription fallback to polling:', error);
    });
  } catch (err) {
    console.warn('Could not attach Firestore onSnapshot:', err);
  }

  // 2. Fallback / supplementary Server Sync Polling
  const pollServer = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok && isSubscribed) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          activeProducts = mergeProducts(activeProducts, data.products);
          saveLocalCachedProducts(activeProducts);
          callback(activeProducts);
        }
      }
    } catch (e) {
      console.warn('Server sync polling note:', e);
    }
  };

  pollServer();
  const intervalId = setInterval(pollServer, 4000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
    if (typeof unsubscribeFirestore === 'function') {
      unsubscribeFirestore();
    }
  };
}

// 3. Create new product in Cloud Firestore + Server Database
export async function createOnlineProduct(productData: {
  title: string;
  cat: CategoryType;
  price: number;
  currency?: string;
  desc: string;
  img: string;
  phone: string;
  uid: string;
  sellerName: string;
  sellerNeighborhood?: string;
  isSellerVerified?: boolean;
  location?: string;
  isFeatured?: boolean;
}): Promise<Product> {
  const newId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const now = Date.now();

  const newProduct: Product = {
    id: newId,
    title: productData.title.trim(),
    cat: productData.cat || 'أخرى',
    price: Number(productData.price),
    currency: productData.currency || 'ج.س',
    desc: productData.desc ? productData.desc.trim() : 'لا يوجد وصف إضافي',
    img: productData.img || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
    phone: productData.phone.trim(),
    uid: productData.uid || 'user_guest',
    sellerName: productData.sellerName ? productData.sellerName.trim() : 'معلن في سوق الولي',
    sellerNeighborhood: productData.sellerNeighborhood ? productData.sellerNeighborhood.trim() : 'حي السوق والميدان',
    isSellerVerified: productData.isSellerVerified !== undefined ? Boolean(productData.isSellerVerified) : true,
    location: productData.location ? productData.location.trim() : `قرية الولي - ${productData.sellerNeighborhood || 'حي السوق والميدان'}`,
    createdAt: now,
    views: 1,
    isFeatured: Boolean(productData.isFeatured)
  };

  // 1. Persist in Cloud Firestore (Permanent storage forever)
  try {
    await setDoc(doc(db, 'products', newId), newProduct);
    console.log('[FIRESTORE] Product permanently saved to Cloud Firestore:', newId);
  } catch (firestoreErr) {
    console.warn('[FIRESTORE] Cloud Firestore write error:', firestoreErr);
  }

  // 2. Persist in Backend Express Database
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newProduct, id: newId })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.product) {
        // Sync return data
      }
    }
  } catch (serverErr) {
    console.warn('[SERVER] Server write note:', serverErr);
  }

  // 3. Cache locally
  const currentCache = getLocalCachedProducts();
  const updatedCache = [newProduct, ...currentCache.filter((p) => p.id !== newId)];
  saveLocalCachedProducts(updatedCache);

  return newProduct;
}

// 4. Update existing product in Cloud Firestore + Server Database (by owner only)
export async function updateOnlineProduct(productId: string, updateData: Partial<Product>): Promise<Product> {
  // 1. Update in Cloud Firestore
  try {
    const cleanUpdate: any = { ...updateData };
    // Never allow createdAt to be modified or randomized
    delete cleanUpdate.createdAt;
    delete cleanUpdate.id;
    await updateDoc(doc(db, 'products', productId), cleanUpdate);
    console.log('[FIRESTORE] Product updated in Firestore:', productId);
  } catch (firestoreErr) {
    console.warn('[FIRESTORE] Cloud Firestore update note:', firestoreErr);
  }

  // 2. Update in Backend Express
  let resultProduct: Product | null = null;
  try {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (res.ok) {
      const data = await res.json();
      resultProduct = data.product;
    }
  } catch (serverErr) {
    console.warn('[SERVER] Server update note:', serverErr);
  }

  // 3. Update Local Cache
  const currentCache = getLocalCachedProducts();
  const updatedCache = currentCache.map((p) => {
    if (p.id === productId) {
      return { ...p, ...updateData, id: productId, createdAt: p.createdAt };
    }
    return p;
  });
  saveLocalCachedProducts(updatedCache);

  return (
    resultProduct ||
    updatedCache.find((p) => p.id === productId) || {
      id: productId,
      ...updateData
    } as Product
  );
}

// 5. Delete product permanently from Cloud Firestore + Server Database
export async function deleteOnlineProduct(productId: string): Promise<boolean> {
  // 1. Delete from Cloud Firestore
  try {
    await deleteDoc(doc(db, 'products', productId));
    console.log('[FIRESTORE] Product permanently deleted from Firestore:', productId);
  } catch (firestoreErr) {
    console.warn('[FIRESTORE] Cloud Firestore delete note:', firestoreErr);
  }

  // 2. Delete from Backend Express
  try {
    await fetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });
  } catch (serverErr) {
    console.warn('[SERVER] Server delete note:', serverErr);
  }

  // 3. Remove from Local Cache
  const currentCache = getLocalCachedProducts();
  const updatedCache = currentCache.filter((p) => p.id !== productId);
  saveLocalCachedProducts(updatedCache);

  return true;
}

// =====================================
// GOOGLE EMAIL AUTHENTICATION & OTP
// =====================================

// Request OTP Code to Google Email (Gmail)
export async function requestGoogleEmailOTP(params: {
  email: string;
  displayName?: string;
  neighborhood?: string;
}): Promise<{
  success: boolean;
  message: string;
  email: string;
  otpCode?: string;
  gmailUrl?: string;
  expiresInSeconds?: number;
}> {
  const res = await fetch('/api/auth/email/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'فشل إرسال رمز التحقق إلى البريد الإلكتروني' }));
    throw new Error(err.message || 'فشل إرسال رمز التحقق إلى البريد الإلكتروني');
  }

  return await res.json();
}

// Verify Google Email OTP & Authenticate User
export async function verifyGoogleEmailOTP(params: {
  email: string;
  code: string;
  displayName?: string;
  neighborhood?: string;
  phoneNumber?: string;
}): Promise<UserProfile> {
  const res = await fetch('/api/auth/email/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'رمز التحقق غير صحيح أو منتهي الصلاحية' }));
    throw new Error(err.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
  }

  const data = await res.json();
  const user: UserProfile = data.user;
  saveActiveUser(user);
  return user;
}

// Sync Google OAuth Profile to Backend
export async function syncGoogleProfileService(params: {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  neighborhood?: string;
  phoneNumber?: string;
}): Promise<UserProfile> {
  const res = await fetch('/api/auth/google/sync-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'فشل مزامنة بيانات حساب Google' }));
    throw new Error(err.message || 'فشل مزامنة بيانات حساب Google');
  }

  const data = await res.json();
  const user: UserProfile = data.user;
  saveActiveUser(user);
  return user;
}

// Direct Instant Google Login & Verification
export async function directGoogleLoginService(params: {
  email: string;
  displayName?: string;
  photoURL?: string;
  neighborhood?: string;
  phoneNumber?: string;
}): Promise<UserProfile> {
  const res = await fetch('/api/auth/google/direct-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'فشل تسجيل الدخول بحساب Google' }));
    throw new Error(err.message || 'فشل تسجيل الدخول بحساب Google');
  }

  const data = await res.json();
  const user: UserProfile = data.user;
  saveActiveUser(user);
  return user;
}

// =====================================
// AUTHENTICATION SERVICES (PHONE SMS OTP)
// =====================================

// Request Phone OTP via SMS & WhatsApp
export async function requestPhoneOTP(phone: string, countryCode?: string): Promise<{ 
  success: boolean; 
  message: string; 
  phone?: string; 
  otpCode?: string;
  whatsappUrl?: string; 
  smsIntentUrl?: string;
  expiresInSeconds?: number;
}> {
  const res = await fetch('/api/auth/phone/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, countryCode })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'فشل إرسال رمز التحقق' }));
    throw new Error(err.message || 'فشل إرسال رمز التحقق');
  }

  return await res.json();
}

// Verify Phone OTP & Register Name
export async function verifyPhoneOTP(phone: string, code: string, displayName: string, countryCode?: string): Promise<UserProfile> {
  const res = await fetch('/api/auth/phone/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code, displayName, countryCode })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'رمز التحقق غير صحيح' }));
    throw new Error(err.message || 'رمز التحقق غير صحيح');
  }

  const data = await res.json();
  const user: UserProfile = data.user;
  saveActiveUser(user);
  return user;
}

// Quick Direct Phone Login (In case telecom carrier delays SMS delivery)
export async function quickPhoneLogin(params: {
  phone: string;
  displayName?: string;
  countryCode?: string;
  neighborhood?: string;
}): Promise<UserProfile> {
  const res = await fetch('/api/auth/phone/quick-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'فشل الدخول السريع برقم الهاتف' }));
    throw new Error(err.message || 'فشل الدخول السريع برقم الهاتف');
  }

  const data = await res.json();
  const user: UserProfile = data.user;
  saveActiveUser(user);
  return user;
}

// Update Profile
export async function updateProfileService(uid: string, data: { 
  displayName?: string; 
  phoneNumber?: string; 
  email?: string;
  neighborhood?: string;
  location?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}): Promise<UserProfile> {
  const res = await fetch(`/api/users/${uid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error('فشل تحديث البيانات');
  }

  const resData = await res.json();
  const user: UserProfile = resData.user;
  saveActiveUser(user);
  return user;
}

// Helper: Compress/Encode image for cross-user persistent rendering
export async function compressAndEncodeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Convert to high-quality JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

import jwt from 'jsonwebtoken';
import { AdminUser } from './models/admin';
import { User } from './models/user';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'grocify-admin-secret-key-production-change-this';

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
}

export function generateToken(admin: Partial<AdminUser> | { _id?: string; email: string; role: string }) {
  return jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error: any) {
    // Only log non-expiration errors to reduce noise
    // Token expiration is a normal occurrence and doesn't need verbose logging
    if (error.name !== 'TokenExpiredError') {
      console.log('[v0] Token verification failed:', error.message || error);
    }
    return null;
  }
}

export function generateUserToken(user: Partial<User>) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function getUserFromRequest(request: NextRequest): DecodedToken | null {
  try {
    // Try to get token from cookie first
    const tokenFromCookie = request.cookies.get('adminToken')?.value;
    
    // Fallback to Authorization header
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    const token = tokenFromCookie || tokenFromHeader;
    
    if (!token) {
      console.log('[v0] No token found in request');
      return null;
    }
    
    return verifyToken(token);
  } catch (error) {
    console.error('[v0] Error extracting user from request:', error);
    return null;
  }
}

export function isVendor(user: DecodedToken | null): boolean {
  return user?.role === 'vendor';
}

export function isAdmin(user: DecodedToken | null): boolean {
  return user?.role === 'admin' || user?.role === 'superadmin';
}

/**
 * Helper function to check admin authorization for API routes
 * Returns a response object if unauthorized, null if authorized
 * Use this in admin-only API routes to properly distinguish between
 * 401 (not authenticated) and 403 (authenticated but not authorized - vendor)
 */
export function requireAdminAuth(request: NextRequest): NextResponse | null {
  const currentUser = getUserFromRequest(request);
  
  // Not authenticated
  if (!currentUser) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Vendor is authenticated but not authorized for admin-only endpoints
  if (isVendor(currentUser)) {
    return NextResponse.json(
      { error: 'Access denied. Admin access required.' },
      { status: 403 }
    );
  }
  
  // Not admin or superadmin
  if (!isAdmin(currentUser)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }
  
  // Authorized
  return null;
}

export function getCustomerFromRequest(request: NextRequest): DecodedToken | null {
  try {
    // Try to get token from cookie first
    const tokenFromCookie = request.cookies.get('customerToken')?.value;
    
    // Fallback to Authorization header
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    const token = tokenFromCookie || tokenFromHeader;
    
    if (!token) {
      console.log('[v0] No customer token found in request');
      return null;
    }
    
    return verifyToken(token);
  } catch (error) {
    console.error('[v0] Error extracting customer from request:', error);
    return null;
  }
}

export interface CustomerDecodedToken {
  customerId: string;
  email: string;
  role?: string;
}

export function verifyCustomerToken(token: string): CustomerDecodedToken | null {
  try {
    const decoded = verifyToken(token);
    if (!decoded) return null;
    
    // Customer tokens use 'id' field, map it to customerId
    return {
      customerId: decoded.id || '',
      email: decoded.email || '',
      role: decoded.role
    };
  } catch (error) {
    console.error('[v0] Error verifying customer token:', error);
    return null;
  }
}
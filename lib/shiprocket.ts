/**
 * Shiprocket API Integration
 * Handles authentication, serviceability checks, and order management
 */

import { isShiprocketEnabled } from '@/lib/shiprocket-env';

interface ShiprocketTokenResponse {
  token: string;
  token_type: string;
}

interface ShiprocketServiceabilityResponse {
  status: number;
  status_code?: number;
  data: {
    available_courier_companies: Array<{
      courier_company_id: number;
      courier_name: string;
      estimated_delivery_days: string | number;
      rate: number;
      freight_charge?: number;
      cod_charges?: number;
      cod: number; // 1 for available, 0 for not available
      cod_available?: boolean;
      prepaid_available?: boolean;
      etd?: string; // Estimated delivery date
      etd_hours?: number;
      city?: string;
      state?: string;
      postcode?: string;
      zone?: string;
      mode?: number; // 0 = Surface, 1 = Air
      is_surface?: boolean;
      rating?: number;
      delivery_performance?: number;
      tracking_performance?: number;
    }>;
    recommended_courier_company_id?: number;
    shiprocket_recommended_courier_id?: number;
  };
  message?: string;
  errors?: any;
}


let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Format and validate phone number for Shiprocket API
 * Shiprocket requires: 10 digits, starting with 9/8/7/6
 * @param phone - Phone number (can contain spaces, dashes, etc.)
 * @returns Formatted 10-digit phone number starting with 9/8/7/6, or throws error
 */
function formatPhoneForShiprocket(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');

  // If phone starts with country code (91), remove it
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }

  // Must be exactly 10 digits
  if (cleaned.length !== 10) {
    throw new Error(`Phone number must be exactly 10 digits. Got: ${cleaned.length} digits`);
  }

  // Must start with 9, 8, 7, or 6
  const firstDigit = cleaned.charAt(0);
  if (!['9', '8', '7', '6'].includes(firstDigit)) {
    throw new Error(`Phone number must start with 9, 8, 7, or 6. Got: ${firstDigit}`);
  }

  return cleaned;
}

/**
 * Get Shiprocket authentication token
 * Token is cached for 24 hours
 */
async function getShiprocketToken(): Promise<string> {
  // Check if cached token is still valid (24 hours = 86400000 ms)
  const now = Date.now();
  if (cachedToken && tokenExpiry > now) {
    return cachedToken;
  }

  // Get credentials from env, fallback to hardcoded if not available
  // Note: API key contains special characters ($, %, !, #) - ensure they're read correctly
  // IMPORTANT: The API key is: wk0H%naEFkx45$qde!MaH4fP#fJR%9ih
  // Special characters must be preserved exactly - no shell interpretation
  
  // Use hardcoded fallback directly to avoid any env parsing issues
  const email = (process.env.SHIPROCKET_EMAIL || 'bhp3439@gmail.com').trim();
  const apiKey = (process.env.SHIPROCKET_API_KEY || 'wk0H%naEFkx45$qde!MaH4fP#fJR%9ih').trim();
  const baseUrl = (process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external').trim();
  
  // Remove surrounding quotes if present (both single and double)
  const cleanEmail = email.replace(/^["']|["']$/g, '');
  const cleanApiKey = apiKey.replace(/^["']|["']$/g, '');
  const cleanBaseUrl = baseUrl.replace(/^["']|["']$/g, '');
  
  // Verify API key is correct (should be 33 characters and start with 'wk0H')
  if (!cleanApiKey.startsWith('wk0H') || cleanApiKey.length !== 33) {
    // Use hardcoded value if env value is corrupted
    const fallbackApiKey = 'wk0H%naEFkx45$qde!MaH4fP#fJR%9ih';
    return getShiprocketTokenWithCredentials(cleanEmail, fallbackApiKey, cleanBaseUrl, now);
  }
  
  return getShiprocketTokenWithCredentials(cleanEmail, cleanApiKey, cleanBaseUrl, now);
}

/**
 * Internal function to get token with specific credentials
 */
async function getShiprocketTokenWithCredentials(
  email: string,
  apiKey: string,
  baseUrl: string,
  now: number
): Promise<string> {

  // Ensure credentials are valid
  if (!email || !apiKey) {
    throw new Error('Shiprocket email and API key are required');
  }

  try {
    // Build request body exactly as Postman does
    const requestBody = {
      email: email,
      password: apiKey,
    };

    // Stringify request body - JSON.stringify handles special characters correctly
    const requestBodyString = JSON.stringify(requestBody);
    
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBodyString,
    });

    const responseText = await response.text();
    let errorData: any = {};

    if (!response.ok) {
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: responseText || response.statusText };
      }
      
      // Clear cached token on auth failure
      cachedToken = null;
      tokenExpiry = 0;
      
      throw new Error(`Shiprocket authentication failed: ${errorData.message || errorData.error || response.statusText}`);
    }

    let data: ShiprocketTokenResponse;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response from Shiprocket: ${responseText}`);
    }

    if (!data.token) {
      throw new Error('Shiprocket token not received in response');
    }

    // Cache token for 24 hours (minus 5 minutes buffer)
    cachedToken = data.token;
    tokenExpiry = now + (24 * 60 * 60 * 1000) - (5 * 60 * 1000);

    return cachedToken;
  } catch (error: any) {
    throw new Error(`Failed to authenticate with Shiprocket: ${error.message}`);
  }
}

/**
 * Check pincode serviceability using Shiprocket API
 * @param deliveryPincode - Delivery pincode (6 digits)
 * @param pickupPincode - Pickup pincode (default from warehouse or env)
 * @param weight - Package weight in kg (optional, default 0.5)
 * @param codAmount - COD amount if applicable (optional)
 * @param warehouseId - Warehouse ID to get pickup pincode from (optional)
 */
export async function checkShiprocketServiceability(
  deliveryPincode: string,
  pickupPincode?: string,
  weight: number = 0.5,
  codAmount?: number,
  warehouseId?: string
): Promise<{
  isServiceable: boolean;
  couriers: Array<{
    courierId: number;
    courierName: string;
    estimatedDays: number;
    rate: number;
    codCharges: number;
    codAvailable: boolean;
    prepaidAvailable: boolean;
    etd?: string;
    etdHours?: number;
    city?: string;
    state?: string;
    zone?: string;
    mode?: 'air' | 'surface';
    isSurface?: boolean;
    rating?: number;
    deliveryPerformance?: number;
    trackingPerformance?: number;
  }>;
  recommendedCourierId?: number;
  city?: string;
  state?: string;
  district?: string;
}> {
  const enabled = isShiprocketEnabled();
  
  if (!enabled) {
    return {
      isServiceable: false,
      couriers: [],
      recommendedCourierId: undefined,
    };
  }

  // Clean pincode
  const cleanDeliveryPincode = deliveryPincode.replace(/\s/g, '').trim();
  
  if (cleanDeliveryPincode.length !== 6 || !/^\d{6}$/.test(cleanDeliveryPincode)) {
    throw new Error('Invalid pincode format. Must be 6 digits.');
  }

  // Get pickup pincode from:
  // 1. Function parameter (if provided)
  // 2. Warehouse by ID (if warehouseId provided)
  // 3. Default warehouse from database
  // 4. Environment variable
  // 5. Default fallback
  let cleanPickupPincode = pickupPincode?.replace(/\s/g, '').trim();
  
  if (!cleanPickupPincode) {
    // Try to get from warehouse by ID first
    if (warehouseId) {
      try {
        const { getWarehouseById } = await import('@/lib/models/warehouse');
        const warehouse = await getWarehouseById(warehouseId);
        if (warehouse?.pincode) {
          cleanPickupPincode = warehouse.pincode.replace(/\s/g, '').trim();
        }
      } catch (error) {
        // Fallback to default warehouse
      }
    }
    
    // If still not found, try default warehouse
    if (!cleanPickupPincode) {
      try {
        const { getDefaultWarehouse } = await import('@/lib/models/warehouse');
        const defaultWarehouse = await getDefaultWarehouse();
        if (defaultWarehouse?.pincode) {
          cleanPickupPincode = defaultWarehouse.pincode.replace(/\s/g, '').trim();
        }
      } catch (error) {
        // Fallback to env or default
      }
    }
    
    // Fallback to env or default
    cleanPickupPincode = cleanPickupPincode || process.env.SHIPROCKET_PICKUP_PINCODE || '110001';
  }

  try {
    const token = await getShiprocketToken();
    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

    // Shiprocket uses GET with query params (note: uses postcode not pincode)
    const queryParams = new URLSearchParams({
      pickup_postcode: cleanPickupPincode,
      delivery_postcode: cleanDeliveryPincode,
      weight: weight.toString(),
    });

    // COD parameter must be boolean (0 or 1), not the amount
    // 1 = COD order, 0 = Prepaid order
    const codFlag = codAmount && codAmount > 0 ? '1' : '0';
    queryParams.append('cod', codFlag);

    const serviceabilityUrl = `${baseUrl}/courier/serviceability/?${queryParams.toString()}`;

    const finalResponse = await fetch(serviceabilityUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const responseText = await finalResponse.text();
    if (!finalResponse.ok) {
      // Return non-serviceable if API fails
      return {
        isServiceable: false,
        couriers: [],
        recommendedCourierId: undefined,
      };
    }

    let data: ShiprocketServiceabilityResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Shiprocket] Failed to parse serviceability response:', {
        error: parseError,
        responseText: responseText.substring(0, 500),
      });
      return {
        isServiceable: false,
        couriers: [],
        recommendedCourierId: undefined,
      };
    }

    // Check for errors
    if (data.status_code === 422 || data.errors) {
      return {
        isServiceable: false,
        couriers: [],
        recommendedCourierId: undefined,
      };
    }

    if (data.status !== 200 || !data.data?.available_courier_companies || data.data.available_courier_companies.length === 0) {
      return {
        isServiceable: false,
        couriers: [],
        recommendedCourierId: undefined,
      };
    }

    // Filter out Air mode couriers (mode === 1) and International couriers
    // Only keep Surface mode couriers (mode === 0) for domestic shipping
    const filteredCouriers = data.data.available_courier_companies.filter(courier => {
      // Exclude Air mode (mode === 1)
      if (courier.mode === 1) return false;
      
      // Exclude International couriers (check courier name for international keywords)
      const courierNameLower = (courier.courier_name || '').toLowerCase();
      const internationalKeywords = ['international', 'intl', 'global', 'worldwide'];
      if (internationalKeywords.some(keyword => courierNameLower.includes(keyword))) {
        return false;
      }
      
      // Only include Surface mode couriers (mode === 0 or undefined/null)
      return courier.mode === 0 || courier.mode === undefined || courier.mode === null;
    });

    const couriers = filteredCouriers.map(courier => {
      // COD is available if cod === 1
      const codAvailable = courier.cod === 1;
      // Prepaid is available if cod === 0 or prepaid_available is true
      const prepaidAvailable = courier.cod === 0 || courier.prepaid_available === true;
      
      return {
        courierId: courier.courier_company_id,
        courierName: courier.courier_name,
        estimatedDays: typeof courier.estimated_delivery_days === 'string' 
          ? parseInt(courier.estimated_delivery_days) || 0
          : courier.estimated_delivery_days || 0,
        rate: courier.rate || courier.freight_charge || 0,
        codCharges: courier.cod_charges || 0,
        codAvailable: codAvailable,
        prepaidAvailable: prepaidAvailable,
        etd: courier.etd, // Estimated delivery date string
        etdHours: courier.etd_hours,
        city: courier.city,
        state: courier.state,
        zone: courier.zone,
        mode: 'surface' as 'air' | 'surface', // All remaining couriers are surface mode
        isSurface: true, // All remaining couriers are surface
        rating: courier.rating,
        deliveryPerformance: courier.delivery_performance,
        trackingPerformance: courier.tracking_performance,
      };
    });

    // Serviceable if at least one courier is available
    const isServiceable = couriers.length > 0;

    // Get recommended courier ID from response
    const recommendedCourierId = data.data.recommended_courier_company_id || data.data.shiprocket_recommended_courier_id;

    return {
      isServiceable,
      couriers,
      recommendedCourierId,
    };
  } catch (error: any) {
    // Return non-serviceable on error
    return {
      isServiceable: false,
      couriers: [],
      recommendedCourierId: undefined,
    };
  }
}

interface ShiprocketPickupLocation {
  id: number;
  pickup_location: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  phone: string;
  email: string;
  seller_name: string;
  phone_verified: number;
  status: number;
  lat?: string;
  long?: string;
  warehouse_code?: string | null;
}

interface ShiprocketCreateOrderResponse {
  status: number;
  message?: string;
  data?: {
    order_id: number;
    shipment_id: number;
    status: string;
    status_code: number;
    onboarding_completed_now: number;
    awb_code?: string;
    courier_company_id?: number;
    courier_name?: string;
  };
  errors?: any;
}

interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  discount?: number;
  tax?: number;
  hsn?: string;
}

/**
 * Get pickup locations from Shiprocket
 */
async function getShiprocketPickupLocations(): Promise<ShiprocketPickupLocation[]> {
  try {
    const token = await getShiprocketToken();
    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

    const response = await fetch(`${baseUrl}/settings/company/pickup`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to fetch pickup locations: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  } catch (error: any) {
    throw new Error(`Failed to get pickup locations: ${error.message}`);
  }
}

/**
 * Find pickup location ID by matching warehouse details
 */
async function findPickupLocationId(warehouseName?: string, warehousePincode?: string): Promise<number | null> {
  try {
    const locations = await getShiprocketPickupLocations();
    
    if (locations.length === 0) {
      return null;
    }

    // Try to match by name first
    if (warehouseName) {
      const matchedByName = locations.find(loc => 
        loc.pickup_location.toLowerCase().includes(warehouseName.toLowerCase()) ||
        warehouseName.toLowerCase().includes(loc.pickup_location.toLowerCase())
      );
      if (matchedByName) {
        return matchedByName.id;
      }
    }

    // Try to match by pincode
    if (warehousePincode) {
      const cleanPincode = warehousePincode.replace(/\s/g, '').trim();
      const matchedByPincode = locations.find(loc => loc.pin_code === cleanPincode);
      if (matchedByPincode) {
        return matchedByPincode.id;
      }
    }

    // Return first active location (status 2 = active)
    const activeLocation = locations.find(loc => loc.status === 2);
    if (activeLocation) {
      return activeLocation.id;
    }

    // Return first location as fallback
    return locations[0]?.id || null;
  } catch (error: any) {
    // If we can't get locations, return null and let Shiprocket handle it
    return null;
  }
}

/**
 * Create Shiprocket order
 * @param orderData - Order data from our system
 * @param warehouseId - Optional warehouse ID to determine pickup location
 */
export async function createShiprocketOrder(
  orderData: {
    orderId: string;
    orderNumber: string;
    orderDate: Date;
    items: Array<{
      productName: string;
      sku?: string;
      quantity: number;
      price: number;
      total: number;
      weight?: number;
      dimensions?: string;
      length?: number;
      breadth?: number;
      height?: number;
      hsn?: string;
    }>;
    shippingAddress: {
      name: string;
      phone: string;
      email: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      landmark?: string;
    };
    billingAddress: {
      name: string;
      phone: string;
      email: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    pricing: {
      subtotal: number;
      discount: number;
      shipping: number;
      tax: number;
      total: number;
    };
    paymentMethod: string;
    warehouseId?: string;
  }
): Promise<{
  success: boolean;
  shiprocketOrderId?: number;
  shipmentId?: number;
  awbCode?: string;
  courierName?: string;
  error?: string;
}> {
  const enabled = isShiprocketEnabled();
  
  if (!enabled) {
    return {
      success: false,
      error: 'Shiprocket is not enabled',
    };
  }

  try {
    const token = await getShiprocketToken();
    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

    // Get warehouse details if warehouseId provided
    let warehouse = null;
    if (orderData.warehouseId) {
      try {
        const { getWarehouseById } = await import('@/lib/models/warehouse');
        warehouse = await getWarehouseById(orderData.warehouseId);
      } catch (error) {
        // Continue without warehouse
      }
    }

    // If no warehouse, get default warehouse
    if (!warehouse) {
      try {
        const { getDefaultWarehouse } = await import('@/lib/models/warehouse');
        warehouse = await getDefaultWarehouse();
      } catch (error) {
        // Continue without warehouse
      }
    }

    // Find pickup location ID from Shiprocket
    const pickupLocationId = await findPickupLocationId(
      warehouse?.name,
      warehouse?.pincode
    );

    // Calculate total weight (default 0.5kg per item if not specified)
    // Ensure weight is in kg (convert from grams if needed)
    const totalWeight = orderData.items.reduce((sum, item) => {
      let itemWeight = item.weight || 0.5;
      if (itemWeight > 1000) {
        itemWeight = itemWeight / 1000; // Convert grams to kg
      }
      if (itemWeight < 0.5) {
        itemWeight = 0.5; // Minimum weight
      }
      return sum + (itemWeight * item.quantity);
    }, 0);

    // Calculate dimensions from product dimensions or use defaults
    // Use the largest item's dimensions (for multiple items, use the biggest box needed)
    let length = 10, breadth = 10, height = 10;
    
    if (orderData.items.length > 0) {
      // Find the item with largest dimensions
      const itemWithMaxDims = orderData.items.reduce((max, item) => {
        const itemVolume = (item.length || 10) * (item.breadth || 10) * (item.height || 10);
        const maxVolume = (max.length || 10) * (max.breadth || 10) * (max.height || 10);
        return itemVolume > maxVolume ? item : max;
      });
      
      length = itemWithMaxDims.length || 10;
      breadth = itemWithMaxDims.breadth || 10;
      height = itemWithMaxDims.height || 10;
      
      // If multiple items, add some buffer for packaging
      const totalItems = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
      if (totalItems > 1) {
        // Add 20% buffer for packaging
        length = Math.ceil(length * 1.2);
        breadth = Math.ceil(breadth * 1.2);
        height = Math.ceil(height * 1.2);
      }
    }

    // Map order items to Shiprocket format
    // HSN is required by some couriers like Ekart - use default if not provided
    const orderItems: ShiprocketOrderItem[] = orderData.items.map(item => ({
      name: item.productName,
      sku: item.sku || `SKU-${orderData.orderNumber}-${item.productName.substring(0, 20)}`,
      units: item.quantity,
      selling_price: item.price,
      discount: item.total - (item.price * item.quantity), // If any item-level discount
      tax: 0, // Tax is usually included in selling_price
      hsn: item.hsn || '62046990', // Default HSN for clothing/apparel if not provided
    }));

    // Determine if shipping is same as billing
    const shippingIsBilling = 
      orderData.shippingAddress.postalCode === orderData.billingAddress.postalCode &&
      orderData.shippingAddress.street === orderData.billingAddress.street;

    // Format order date
    const orderDate = new Date(orderData.orderDate);
    const formattedOrderDate = orderDate.toISOString().replace('T', ' ').substring(0, 16);

    // Build request body
    const requestBody: any = {
      order_id: orderData.orderNumber, // Use our order number as Shiprocket order_id
      order_date: formattedOrderDate,
      billing_customer_name: orderData.billingAddress.name.split(' ')[0] || orderData.billingAddress.name,
      billing_last_name: orderData.billingAddress.name.split(' ').slice(1).join(' ') || '',
      billing_address: orderData.billingAddress.street,
      billing_address_2: (orderData.billingAddress as any).landmark || '',
      billing_city: orderData.billingAddress.city,
      billing_pincode: orderData.billingAddress.postalCode.replace(/\s/g, '').trim(),
      billing_state: orderData.billingAddress.state,
      billing_country: orderData.billingAddress.country || 'India',
      billing_email: orderData.billingAddress.email,
      billing_phone: formatPhoneForShiprocket(orderData.billingAddress.phone),
      shipping_is_billing: shippingIsBilling,
      order_items: orderItems,
      payment_method: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: orderData.pricing.subtotal,
      length: length,
      breadth: breadth,
      height: height,
      weight: totalWeight,
    };

    // Always add shipping address fields explicitly
    // Some couriers like Ekart require these even when shipping_is_billing is true
    requestBody.shipping_customer_name = orderData.shippingAddress.name.split(' ')[0] || orderData.shippingAddress.name;
    requestBody.shipping_last_name = orderData.shippingAddress.name.split(' ').slice(1).join(' ') || '';
    requestBody.shipping_address = orderData.shippingAddress.street;
    requestBody.shipping_address_2 = (orderData.shippingAddress as any).landmark || '';
    requestBody.shipping_city = orderData.shippingAddress.city;
    requestBody.shipping_pincode = orderData.shippingAddress.postalCode.replace(/\s/g, '').trim();
    requestBody.shipping_state = orderData.shippingAddress.state;
    requestBody.shipping_country = orderData.shippingAddress.country || 'India';
    // Use shipping email or fall back to billing email
    requestBody.shipping_email = orderData.shippingAddress.email || orderData.billingAddress.email;
    requestBody.shipping_phone = formatPhoneForShiprocket(orderData.shippingAddress.phone);

    // Add COD amount if payment method is COD
    if (orderData.paymentMethod === 'cod') {
      requestBody.cod_amount = orderData.pricing.total;
    }

    // Add pickup location ID if found
    if (pickupLocationId) {
      requestBody.pickup_location = pickupLocationId;
    } else if (warehouse?.name) {
      // Fallback to warehouse name if ID not found
      requestBody.pickup_location = warehouse.name;
    }

    // Log the request for debugging (mask sensitive data)
    console.log('[Shiprocket] Creating order with details:', {
      orderId: requestBody.order_id,
      paymentMethod: requestBody.payment_method,
      codAmount: requestBody.cod_amount,
      weight: requestBody.weight,
      dimensions: `${requestBody.length}x${requestBody.breadth}x${requestBody.height}`,
      billingPincode: requestBody.billing_pincode,
      billingPhone: requestBody.billing_phone ? `****${requestBody.billing_phone.slice(-4)}` : 'Not set',
      shippingPincode: requestBody.shipping_pincode,
      shippingPhone: requestBody.shipping_phone ? `****${requestBody.shipping_phone.slice(-4)}` : 'Not set',
      shippingIsBilling: requestBody.shipping_is_billing,
      itemsCount: requestBody.order_items?.length,
      itemsHSN: requestBody.order_items?.map((i: any) => i.hsn),
      pickupLocation: requestBody.pickup_location,
    });

    const response = await fetch(`${baseUrl}/orders/create/adhoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response from Shiprocket: ${responseText}`);
    }

    if (!response.ok) {
      // Check if it's a pickup location error
      if (responseData.message?.includes('Wrong Pickup location') && responseData.data?.data) {
        // Try to use the first suggested pickup location
        const suggestedLocations = responseData.data.data as ShiprocketPickupLocation[];
        if (suggestedLocations.length > 0) {
          requestBody.pickup_location = suggestedLocations[0].id;
          
          // Retry with the correct pickup location
          const retryResponse = await fetch(`${baseUrl}/orders/create/adhoc`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          });

          const retryResponseText = await retryResponse.text();
          let retryResponseData: any;

          try {
            retryResponseData = JSON.parse(retryResponseText);
          } catch (e) {
            throw new Error(`Invalid JSON response from Shiprocket: ${retryResponseText}`);
          }

          if (!retryResponse.ok) {
            throw new Error(`Shiprocket order creation failed: ${retryResponseData.message || retryResponse.statusText}`);
          }

          // Handle response - can be direct object or wrapped in data
          const retryOrderData = retryResponseData.data || retryResponseData;
          
          if (!retryOrderData || (!retryOrderData.order_id && !retryOrderData.shipment_id)) {
            throw new Error('Shiprocket order created but no order_id or shipment_id returned');
          }
          
          return {
            success: true,
            shiprocketOrderId: retryOrderData.order_id,
            shipmentId: retryOrderData.shipment_id,
            awbCode: retryOrderData.awb_code || '',
            courierName: retryOrderData.courier_name || '',
          };
        }
      }

      throw new Error(`Shiprocket order creation failed: ${responseData.message || response.statusText}`);
    }

    // Handle response - can be direct object or wrapped in data field
    // Use different variable name to avoid conflict with function parameter
    const shiprocketResponse = responseData.data || responseData;
    
    if (!shiprocketResponse || (!shiprocketResponse.order_id && !shiprocketResponse.shipment_id)) {
      throw new Error('Shiprocket order created but no order_id or shipment_id returned');
    }

    return {
      success: true,
      shiprocketOrderId: shiprocketResponse.order_id,
      shipmentId: shiprocketResponse.shipment_id,
      awbCode: shiprocketResponse.awb_code || '',
      courierName: shiprocketResponse.courier_name || '',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create Shiprocket order',
    };
  }
}

interface ShiprocketAWBResponse {
  status: number;
  message?: string;
  data?: {
    awb_code: string;
    courier_company_id: number;
    courier_name: string;
    shipment_id: number;
    status: string;
    status_code: number;
  };
  errors?: any;
}

/**
 * Generate AWB (Shipping Label) and Assign Courier
 * @param shipmentId - Shiprocket shipment ID (from create order response)
 * @param courierId - Optional courier ID. If not provided, Shiprocket will auto-assign the best courier
 * @returns AWB code and courier details
 */
export async function generateShiprocketAWB(
  shipmentId: number,
  courierId?: number
): Promise<{
  success: boolean;
  awbCode?: string;
  courierId?: number;
  courierName?: string;
  error?: string;
}> {
  console.log('[AWB Assignment] 🚀 Starting AWB assignment process', {
    shipmentId,
    courierId: courierId || 'Auto-assign',
    timestamp: new Date().toISOString(),
  });

  const enabled = isShiprocketEnabled();
  
  if (!enabled) {
    console.error('[AWB Assignment] ❌ Shiprocket is not enabled');
    return {
      success: false,
      error: 'Shiprocket is not enabled',
    };
  }

  try {
    console.log('[AWB Assignment] 📝 Getting Shiprocket token...');
    const token = await getShiprocketToken();
    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

    // Build request body
    const requestBody: any = {
      shipment_id: shipmentId,
    };

    // Add courier_id only if provided (optional - Shiprocket will auto-assign if not provided)
    if (courierId) {
      requestBody.courier_id = courierId;
      console.log('[AWB Assignment] 📦 Using specific courier ID:', courierId);
    } else {
      console.log('[AWB Assignment] 📦 No courier ID provided - Shiprocket will auto-assign best courier');
    }

    const apiUrl = `${baseUrl}/courier/assign/awb`;
    console.log('[AWB Assignment] 🌐 Making API request to Shiprocket', {
      url: apiUrl,
      method: 'POST',
      requestBody,
      shipmentId,
      courierId: courierId || 'Auto',
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[AWB Assignment] 📡 Received response from Shiprocket', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    const responseText = await response.text();
    console.log('[AWB Assignment] 📄 Raw response text received', {
      length: responseText.length,
      preview: responseText.substring(0, 200),
    });

    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
      console.log('[AWB Assignment] ✅ Successfully parsed JSON response');
    } catch (e) {
      console.error('[AWB Assignment] ❌ Failed to parse AWB response as JSON:', {
        error: e,
        responseText: responseText.substring(0, 500),
        responseLength: responseText.length,
      });
      throw new Error(`Invalid JSON response from Shiprocket: ${responseText}`);
    }

    // Log full response for debugging
    console.log('[AWB Assignment] 📋 Full response data:', JSON.stringify(responseData, null, 2));

    // Check for Shiprocket API errors in response
    // Shiprocket returns HTTP 200 even for errors, so we need to check status_code and awb_assign_status
    // awb_assign_status: 1 = success, 0 = failure
    const statusCode = (responseData as any).status_code || (responseData as any).status;
    const awbAssignStatus = (responseData as any).awb_assign_status;
    const awbAssignError = (responseData as any).response?.data?.awb_assign_error || (responseData as any).awb_assign_error;
    const errorMessage = (responseData as any).message || awbAssignError;

    console.log('[AWB Assignment] 🔍 Checking response status', {
      httpStatus: response.status,
      statusCode,
      awbAssignStatus,
      awbAssignError: awbAssignError || 'None',
      errorMessage: errorMessage || 'None',
    });

    // Check if AWB assignment failed
    // Priority: awb_assign_status === 0 (failure) or awbAssignError exists, or HTTP error, or status_code indicates error
    const hasHttpError = !response.ok;
    const hasStatusCodeError = statusCode !== undefined && statusCode !== 200;
    const hasAwbError = awbAssignStatus === 0 || !!awbAssignError;

    if (hasHttpError || hasStatusCodeError || hasAwbError) {
      const errorMsg = errorMessage || `Shiprocket AWB generation failed: Status ${statusCode || response.status}`;
      console.error('[AWB Assignment] ❌ AWB generation failed:', {
        httpStatus: response.status,
        statusCode,
        awbAssignStatus,
        awbAssignError,
        message: errorMessage,
        hasHttpError,
        hasStatusCodeError,
        hasAwbError,
        fullResponse: responseData,
        shipmentId,
        courierId: courierId || 'Auto',
      });
      throw new Error(errorMsg);
    }

    console.log('[AWB Assignment] ✅ Response status check passed - proceeding to extract AWB data');

    // Handle different response structures from Shiprocket API
    // Structure 1: { status: 200, data: { awb_code, courier_company_id, courier_name, ... } }
    // Structure 2: { awb_assign_status: 1, response: { data: { awb_code, ... } } }
    // Structure 3: { response: { data: { awb_code, ... } } }
    // Structure 4: Direct { awb_code, courier_company_id, courier_name, ... }
    let awbData: any = null;
    
    console.log('[AWB Assignment] 🔎 Extracting AWB data from response - trying different structures...');
    
    // Try Structure 1: Direct data field (only if has awb_code)
    if (responseData.data && typeof responseData.data === 'object' && responseData.data.awb_code) {
      awbData = responseData.data;
      console.log('[AWB Assignment] ✅ Using Structure 1: responseData.data', {
        awbCode: awbData.awb_code,
        courierId: awbData.courier_company_id,
        courierName: awbData.courier_name,
      });
    }
    // Try Structure 2: Nested response.data (only if awb_assign_status is 1 and has awb_code)
    else if ((responseData as any).awb_assign_status === 1 && (responseData as any).response?.data) {
      const nestedData = (responseData as any).response.data;
      if (nestedData.awb_code && !nestedData.awb_assign_error) {
        awbData = nestedData;
        console.log('[AWB Assignment] ✅ Using Structure 2: responseData.response.data', {
          awbCode: awbData.awb_code,
          courierId: awbData.courier_company_id,
          courierName: awbData.courier_name,
        });
      } else {
        console.log('[AWB Assignment] ⚠️ Structure 2 found but missing awb_code or has error', {
          hasAwbCode: !!nestedData.awb_code,
          hasError: !!nestedData.awb_assign_error,
        });
      }
    }
    // Try Structure 3: Direct fields in responseData
    else if (responseData.awb_code || (responseData.courier_company_id && responseData.courier_name)) {
      awbData = responseData;
      console.log('[AWB Assignment] ✅ Using Structure 3: Direct responseData fields', {
        awbCode: awbData.awb_code,
        courierId: awbData.courier_company_id,
        courierName: awbData.courier_name,
      });
    } else {
      console.log('[AWB Assignment] ⚠️ None of the expected structures matched', {
        hasData: !!responseData.data,
        hasResponse: !!(responseData as any).response,
        hasDirectAwbCode: !!responseData.awb_code,
        hasCourierInfo: !!(responseData.courier_company_id && responseData.courier_name),
      });
    }

    if (!awbData || !awbData.awb_code) {
      console.error('[Shiprocket] AWB generation - no valid AWB data found in response:', {
        status: response.status,
        statusCode,
        awbAssignStatus,
        message: errorMessage,
        hasData: !!responseData.data,
        hasResponse: !!(responseData as any).response,
        hasAwbCode: !!(responseData as any).awb_code || !!(responseData as any).response?.data?.awb_code,
        fullResponse: JSON.stringify(responseData).substring(0, 1000),
      });
      throw new Error(errorMessage || 'Shiprocket AWB generated but no valid AWB code returned in response');
    }

    console.log('[AWB Assignment] ✅ Successfully extracted AWB data:', {
      awbCode: awbData.awb_code,
      courierId: awbData.courier_company_id,
      courierName: awbData.courier_name,
      shipmentId: awbData.shipment_id,
      orderId: awbData.order_id, // Numeric order_id from Shiprocket
      timestamp: new Date().toISOString(),
    });

    const result = {
      success: true,
      awbCode: awbData.awb_code,
      courierId: awbData.courier_company_id,
      courierName: awbData.courier_name,
      orderId: awbData.order_id, // Return numeric order_id for cancellation
    };

    console.log('[AWB Assignment] 🎉 AWB assignment completed successfully', {
      shipmentId,
      awbCode: result.awbCode,
      courierId: result.courierId,
      courierName: result.courierName,
      orderId: result.orderId,
    });

    return result;
  } catch (error: any) {
    console.error('[AWB Assignment] ❌ Error during AWB assignment:', {
      error: error.message,
      stack: error.stack,
      shipmentId,
      courierId: courierId || 'Auto',
      timestamp: new Date().toISOString(),
    });
    
    return {
      success: false,
      error: error.message || 'Failed to generate Shiprocket AWB',
    };
  }
}

/**
 * Update Shiprocket order
 * @param shipmentId - Shiprocket shipment ID
 * @param updateData - Order data to update
 */
export async function updateShiprocketOrder(
  shipmentId: number,
  updateData: {
    orderItems?: Array<{
      name: string;
      sku?: string;
      units: number;
      selling_price: number;
      weight?: number;
      hsn?: string;
    }>;
    shippingAddress?: {
      name: string;
      phone: string;
      email: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      landmark?: string;
    };
    billingAddress?: {
      name: string;
      phone: string;
      email: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    pricing?: {
      subtotal: number;
      total: number;
    };
    paymentMethod?: string;
    weight?: number;
    length?: number;
    breadth?: number;
    height?: number;
  }
): Promise<{
  success: boolean;
  orderId?: number;
  shipmentId?: number;
  error?: string;
}> {
  const enabled = isShiprocketEnabled();
  
  if (!enabled) {
    return {
      success: false,
      error: 'Shiprocket is not enabled',
    };
  }

  try {
    const token = await getShiprocketToken();
    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

    // First, get the existing order to get order_id
    const getOrderResponse = await fetch(`${baseUrl}/orders/show/${shipmentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!getOrderResponse.ok) {
      throw new Error(`Failed to fetch Shiprocket order: ${getOrderResponse.statusText}`);
    }

    const existingOrderData = await getOrderResponse.json();
    const existingOrder = existingOrderData.data || existingOrderData;
    const orderId = existingOrder.order_id;

    if (!orderId) {
      throw new Error('Order ID not found in Shiprocket order');
    }

    // Build update request body
    const requestBody: any = {
      order_id: orderId.toString(),
    };

    // Update order items if provided
    if (updateData.orderItems && updateData.orderItems.length > 0) {
      requestBody.order_items = updateData.orderItems.map(item => ({
        name: item.name,
        sku: item.sku || `SKU-${item.name.substring(0, 20)}`,
        units: item.units,
        selling_price: item.selling_price,
        hsn: item.hsn,
      }));
    }

    // Update shipping address if provided
    if (updateData.shippingAddress) {
      const nameParts = updateData.shippingAddress.name.split(' ');
      requestBody.shipping_customer_name = nameParts[0] || updateData.shippingAddress.name;
      requestBody.shipping_last_name = nameParts.slice(1).join(' ') || '';
      requestBody.shipping_address = updateData.shippingAddress.street;
      requestBody.shipping_address_2 = (updateData.shippingAddress as any).landmark || '';
      requestBody.shipping_city = updateData.shippingAddress.city;
      requestBody.shipping_pincode = updateData.shippingAddress.postalCode.replace(/\s/g, '').trim();
      requestBody.shipping_state = updateData.shippingAddress.state;
      requestBody.shipping_country = updateData.shippingAddress.country || 'India';
      requestBody.shipping_email = updateData.shippingAddress.email;
      requestBody.shipping_phone = formatPhoneForShiprocket(updateData.shippingAddress.phone);
    }

    // Update billing address if provided
    if (updateData.billingAddress) {
      const nameParts = updateData.billingAddress.name.split(' ');
      requestBody.billing_customer_name = nameParts[0] || updateData.billingAddress.name;
      requestBody.billing_last_name = nameParts.slice(1).join(' ') || '';
      requestBody.billing_address = updateData.billingAddress.street;
      requestBody.billing_city = updateData.billingAddress.city;
      requestBody.billing_pincode = updateData.billingAddress.postalCode.replace(/\s/g, '').trim();
      requestBody.billing_state = updateData.billingAddress.state;
      requestBody.billing_country = updateData.billingAddress.country || 'India';
      requestBody.billing_email = updateData.billingAddress.email;
      requestBody.billing_phone = formatPhoneForShiprocket(updateData.billingAddress.phone);
    }

    // Update pricing if provided
    if (updateData.pricing) {
      requestBody.sub_total = updateData.pricing.subtotal;
      if (updateData.paymentMethod === 'cod') {
        requestBody.cod_amount = updateData.pricing.total;
      }
    }

    // Update payment method if provided
    if (updateData.paymentMethod) {
      requestBody.payment_method = updateData.paymentMethod === 'cod' ? 'COD' : 'Prepaid';
    }

    // Update dimensions if provided
    if (updateData.weight !== undefined) {
      requestBody.weight = updateData.weight;
    }
    if (updateData.length !== undefined) {
      requestBody.length = updateData.length;
    }
    if (updateData.breadth !== undefined) {
      requestBody.breadth = updateData.breadth;
    }
    if (updateData.height !== undefined) {
      requestBody.height = updateData.height;
    }

    const response = await fetch(`${baseUrl}/orders/update/adhoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response from Shiprocket: ${responseText}`);
    }

    if (!response.ok) {
      throw new Error(`Shiprocket order update failed: ${responseData.message || response.statusText}`);
    }

    // Handle response - can be direct object or wrapped in data
    const updatedOrderData = responseData.data || responseData;

    return {
      success: true,
      orderId: updatedOrderData.order_id || orderId,
      shipmentId: updatedOrderData.shipment_id || shipmentId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update Shiprocket order',
    };
  }
}

/**
 * Request Pickup for Shipment
 * @param shipmentId - Shiprocket shipment ID
 * @returns Pickup schedule details
 */
export async function requestShiprocketPickup(
  shipmentId: number
): Promise<{
  success: boolean;
  pickupScheduledDate?: Date;
  pickupScheduledTime?: string;
  courierName?: string;
  error?: string;
}> {
  console.log('[Shiprocket] 🚚 Requesting pickup for shipment:', { shipmentId });
  
  const enabled = isShiprocketEnabled();
  
  if (!enabled) {
    console.warn('[Shiprocket] ⚠️ Shiprocket is not enabled');
    return {
      success: false,
      error: 'Shiprocket is not enabled',
    };
  }

  try {
    const token = await getShiprocketToken();
    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
    
    // Correct Shiprocket API v2 endpoint for pickup generation
    const requestUrl = `${baseUrl}/courier/generate/pickup`;
    const requestBody = {
      shipment_id: [shipmentId], // Array of shipment IDs
    };

    console.log('[Shiprocket] 📤 Pickup request details:', {
      url: requestUrl,
      method: 'POST',
      shipmentId: shipmentId,
      requestBody: JSON.stringify(requestBody),
    });

    // Request pickup for the shipment
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[Shiprocket] ❌ Failed to parse pickup response:', {
        error: e,
        responseText: responseText.substring(0, 500),
        status: response.status,
      });
      throw new Error(`Invalid JSON response from Shiprocket: ${responseText}`);
    }

    // Log full response for debugging
    console.log('[Shiprocket] 📥 Pickup request response (full):', JSON.stringify(responseData, null, 2));
    console.log('[Shiprocket] 📊 Pickup response status:', {
      httpStatus: response.status,
      ok: response.ok,
      statusCode: (responseData as any).status_code || (responseData as any).status,
      message: (responseData as any).message,
      hasData: !!responseData.data,
    });

    // Handle 404 - Pickup might be automatically scheduled when AWB is assigned
    // or the endpoint might not be available in this API version
    if (response.status === 404) {
      console.warn('[Shiprocket] ⚠️ Pickup endpoint not found (404). Pickup may be automatically scheduled when AWB is assigned.');
      // Return success with estimated pickup date (next business day)
      const pickupDate = new Date();
      pickupDate.setDate(pickupDate.getDate() + 1);
      while (pickupDate.getDay() === 0 || pickupDate.getDay() === 6) {
        pickupDate.setDate(pickupDate.getDate() + 1);
      }
      return {
        success: true,
        pickupScheduledDate: pickupDate,
        pickupScheduledTime: '10:00 AM - 6:00 PM',
        error: 'Pickup endpoint not available - pickup will be automatically scheduled by Shiprocket',
      };
    }

    if (!response.ok) {
      console.error('[Shiprocket] ❌ Pickup request failed:', {
        httpStatus: response.status,
        statusCode: (responseData as any).status_code || (responseData as any).status,
        message: responseData.message,
        errors: responseData.errors,
        fullResponse: responseData,
      });
      return {
        success: false,
        error: responseData.message || 'Failed to request pickup',
      };
    }

    // Check for Shiprocket API errors in response (similar to AWB generation)
    const statusCode = (responseData as any).status_code || (responseData as any).status;
    const errorMessage = (responseData as any).message;
    
    if (statusCode !== 200 && statusCode !== undefined) {
      console.error('[Shiprocket] ❌ Pickup request failed (status_code check):', {
        statusCode,
        message: errorMessage,
        fullResponse: responseData,
      });
      return {
        success: false,
        error: errorMessage || `Pickup request failed: Status ${statusCode}`,
      };
    }

    // Extract pickup details from response if available
    const pickupData = responseData.data || responseData;
    const scheduledDate = pickupData.pickup_date || pickupData.scheduled_date;
    const scheduledTime = pickupData.pickup_time || pickupData.scheduled_time;

    // Shiprocket typically schedules pickup for next business day
    // Calculate estimated pickup date (next business day)
    const pickupDate = scheduledDate ? new Date(scheduledDate) : new Date();
    if (!scheduledDate) {
      pickupDate.setDate(pickupDate.getDate() + 1); // Next day
      // Skip weekends (Saturday = 6, Sunday = 0)
      while (pickupDate.getDay() === 0 || pickupDate.getDay() === 6) {
        pickupDate.setDate(pickupDate.getDate() + 1);
      }
    }

    // Default pickup time window (usually 10 AM - 6 PM)
    const pickupTime = scheduledTime || '10:00 AM - 6:00 PM';

    console.log('[Shiprocket] ✅ Pickup scheduled successfully:', {
      shipmentId,
      pickupDate: pickupDate.toISOString(),
      pickupTime,
      courierName: pickupData.courier_name || pickupData.courierName,
      responseData: JSON.stringify(pickupData).substring(0, 500),
    });

    return {
      success: true,
      pickupScheduledDate: pickupDate,
      pickupScheduledTime: pickupTime,
      courierName: pickupData.courier_name || pickupData.courierName,
    };
  } catch (error: any) {
    console.error('[Shiprocket] ❌ Error requesting pickup:', {
      shipmentId,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      error: error.message || 'Failed to request pickup',
    };
  }
}

/**
 * Cancel Shiprocket Order/Shipment
 * @param shipmentId - Shiprocket shipment ID
 * @param orderNumber - Optional order number (the order_id we sent during creation, e.g., "ORD-92832299-6991")
 * @param shiprocketOrderId - Optional numeric order_id from Shiprocket (preferred for cancellation)
 * @returns Success status
 */
export async function cancelShiprocketOrder(
  shipmentId: number,
  orderNumber?: string,
  shiprocketOrderId?: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log('[Shiprocket] 🚫 Cancelling Shiprocket order:', { shipmentId, orderNumber, shiprocketOrderId });
  
  const enabled = isShiprocketEnabled();
  
  if (!enabled) {
    console.warn('[Shiprocket] ⚠️ Shiprocket is not enabled');
    return {
      success: false,
      error: 'Shiprocket is not enabled',
    };
  }

  try {
    const token = await getShiprocketToken();
    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
    
    // Shiprocket cancel endpoint needs the numeric order_id from Shiprocket
    // Priority: shiprocketOrderId (numeric) > fetch from shipment > orderNumber (string) > shipmentId
    let cancelId: string | number = shipmentId;
    
    // Priority 1: Use numeric shiprocketOrderId if provided (this is the correct ID for cancellation)
    if (shiprocketOrderId) {
      cancelId = shiprocketOrderId;
      console.log('[Shiprocket] 📋 Using provided shiprocketOrderId (numeric) as cancel ID:', { shiprocketOrderId });
    } else if (orderNumber) {
      // Priority 2: Try orderNumber (string) if shiprocketOrderId not available
      cancelId = orderNumber;
      console.log('[Shiprocket] 📋 Using provided orderNumber as cancel ID:', { orderNumber });
    } else {
      // Priority 2: Try to fetch order_id from shipment
      try {
        const shipmentResponse = await fetch(`${baseUrl}/shipments/show/${shipmentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (shipmentResponse.ok) {
          const shipmentData = await shipmentResponse.json();
          const shipment = shipmentData.data || shipmentData;
          // The order_id in shipment response might be the numeric one, but we need the string one
          // Try to get it from order_id field (could be string or number)
          const fetchedOrderId = shipment.order_id || shipment.orderId;
          if (fetchedOrderId) {
            cancelId = fetchedOrderId;
            console.log('[Shiprocket] 📋 Fetched order_id from shipment:', { shipmentId, cancelId });
          }
        }
      } catch (fetchError) {
        console.warn('[Shiprocket] ⚠️ Could not fetch order_id from shipment, will try with shipment_id:', fetchError);
      }
    }
    const requestUrl = `${baseUrl}/orders/cancel`;
    const requestBody = {
      ids: [cancelId], // Array of order IDs (or shipment IDs as fallback)
    };

    console.log('[Shiprocket] 📤 Cancel request details:', {
      url: requestUrl,
      method: 'POST',
      shipmentId: shipmentId,
      requestBody: JSON.stringify(requestBody),
    });

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[Shiprocket] ❌ Failed to parse cancel response:', {
        error: e,
        responseText: responseText.substring(0, 500),
        status: response.status,
      });
      throw new Error(`Invalid JSON response from Shiprocket: ${responseText}`);
    }

    // Log full response for debugging
    console.log('[Shiprocket] 📥 Cancel order response (full):', JSON.stringify(responseData, null, 2));
    console.log('[Shiprocket] 📊 Cancel response status:', {
      httpStatus: response.status,
      ok: response.ok,
      statusCode: (responseData as any).status_code || (responseData as any).status,
      message: (responseData as any).message,
      errors: (responseData as any).errors,
      data: (responseData as any).data,
    });

    if (!response.ok) {
      // Try to extract detailed error information
      const detailedError = responseData.errors || responseData.error || responseData.message;
      const errorDetails = Array.isArray(detailedError) 
        ? detailedError.map((e: any) => e.message || e || String(e)).join(', ')
        : detailedError || 'Unknown error';
      
      console.error('[Shiprocket] ❌ Cancel order failed:', {
        httpStatus: response.status,
        statusCode: (responseData as any).status_code || (responseData as any).status,
        message: responseData.message,
        errors: responseData.errors,
        errorDetails: errorDetails,
        fullResponse: JSON.stringify(responseData),
      });
      
      return {
        success: false,
        error: errorDetails || responseData.message || `Failed to cancel Shiprocket order: HTTP ${response.status}`,
      };
    }

    // Check for Shiprocket API errors in response
    // Shiprocket cancel API might return success even with status_code
    const statusCode = (responseData as any).status_code || (responseData as any).status;
    const errorMessage = (responseData as any).message;
    const hasError = (responseData as any).errors || errorMessage;
    
    // If HTTP response is OK (200) and no explicit error message, consider it successful
    if (response.ok && !hasError) {
      console.log('[Shiprocket] ✅ Order cancelled successfully in Shiprocket:', {
        shipmentId,
        statusCode,
        responseData: JSON.stringify(responseData).substring(0, 500),
      });

      return {
        success: true,
      };
    }
    
    // If there's an error message or status_code indicates failure
    if (hasError || (statusCode !== 200 && statusCode !== undefined)) {
      console.error('[Shiprocket] ❌ Cancel order failed:', {
        httpStatus: response.status,
        statusCode,
        message: errorMessage,
        errors: (responseData as any).errors,
        fullResponse: responseData,
      });
      return {
        success: false,
        error: errorMessage || (responseData as any).errors?.[0] || `Cancel order failed: Status ${statusCode || response.status}`,
      };
    }

    // Default to success if HTTP response is OK
    console.log('[Shiprocket] ✅ Order cancelled successfully in Shiprocket:', {
      shipmentId,
      responseData: JSON.stringify(responseData).substring(0, 500),
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('[Shiprocket] ❌ Error cancelling order:', {
      shipmentId,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      error: error.message || 'Failed to cancel Shiprocket order',
    };
  }
}

/**
 * Track Shipment using Shiprocket API
 * @param shipmentId - Shiprocket shipment ID
 * @returns Tracking data with status and events
 */
export async function trackShiprocketShipment(
  shipmentId: number
): Promise<{
  success: boolean;
  status?: string;
  currentStatus?: string;
  trackingData?: {
    events: Array<{
      status: string;
      location?: string;
      timestamp: Date;
      description?: string;
    }>;
    estimatedDelivery?: Date;
    currentLocation?: string;
  };
  error?: string;
}> {
  const enabled = isShiprocketEnabled();
  
  if (!enabled) {
    return {
      success: false,
      error: 'Shiprocket is not enabled',
    };
  }

  try {
    const token = await getShiprocketToken();
    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

    const response = await fetch(`${baseUrl}/courier/track/shipment/${shipmentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[Shiprocket] Failed to parse tracking response:', {
        error: e,
        responseText: responseText.substring(0, 500),
      });
      return {
        success: false,
        error: `Invalid JSON response from Shiprocket: ${responseText}`,
      };
    }

    if (!response.ok) {
      console.error('[Shiprocket] Tracking request failed:', {
        httpStatus: response.status,
        message: responseData.message,
        errors: responseData.errors,
      });
      return {
        success: false,
        error: responseData.message || `Failed to track shipment: HTTP ${response.status}`,
      };
    }

    // Extract tracking data from response
    const trackingInfo = responseData.data || responseData;
    
    // Parse tracking events
    const events: Array<{
      status: string;
      location?: string;
      timestamp: Date;
      description?: string;
    }> = [];

    // Handle different response structures
    if (trackingInfo.tracking_data?.track_history) {
      // Structure with track_history array
      trackingInfo.tracking_data.track_history.forEach((event: any) => {
        events.push({
          status: event.status || event.current_status || '',
          location: event.location || event.city || '',
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          description: event.status || event.message || '',
        });
      });
    } else if (Array.isArray(trackingInfo.tracking_data)) {
      // Structure with array of events
      trackingInfo.tracking_data.forEach((event: any) => {
        events.push({
          status: event.status || event.current_status || '',
          location: event.location || event.city || '',
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          description: event.status || event.message || '',
        });
      });
    } else if (trackingInfo.track_history) {
      // Direct track_history
      trackingInfo.track_history.forEach((event: any) => {
        events.push({
          status: event.status || event.current_status || '',
          location: event.location || event.city || '',
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          description: event.status || event.message || '',
        });
      });
    }

    // Get current status
    const currentStatus = trackingInfo.current_status || 
                         trackingInfo.status || 
                         trackingInfo.tracking_data?.current_status || 
                         events[0]?.status || 
                         '';

    // Get estimated delivery
    const estimatedDelivery = trackingInfo.estimated_delivery_date || 
                             trackingInfo.etd ? new Date(trackingInfo.etd) : undefined;

    // Get current location
    const currentLocation = trackingInfo.current_location || 
                           trackingInfo.tracking_data?.current_location || 
                           events[0]?.location || '';

    // Sort events by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log('[Shiprocket] Tracking data retrieved:', {
      shipmentId,
      currentStatus,
      eventsCount: events.length,
      estimatedDelivery,
    });

    return {
      success: true,
      status: currentStatus,
      currentStatus: currentStatus,
      trackingData: {
        events,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
        currentLocation,
      },
    };
  } catch (error: any) {
    console.error('[Shiprocket] Error tracking shipment:', {
      shipmentId,
      error: error.message,
    });
    return {
      success: false,
      error: error.message || 'Failed to track shipment',
    };
  }
}

/**
 * Map Shiprocket status to our order status
 * @param shiprocketStatus - Status from Shiprocket
 * @returns Our order status
 */
export function mapShiprocketStatusToOrderStatus(shiprocketStatus: string): string {
  const statusUpper = shiprocketStatus.toUpperCase();
  
  // Map Shiprocket statuses to our order statuses
  const statusMap: Record<string, string> = {
    'NEW': 'processing',
    'PICKUP_PENDING': 'ready_for_pickup',
    'PICKUP_COMPLETE': 'ready_for_pickup',
    'PICKED_UP': 'shipped',
    'IN_TRANSIT': 'shipped',
    'INPROCESS': 'shipped',
    'OUT_FOR_DELIVERY': 'out_for_delivery',
    'OUT FOR DELIVERY': 'out_for_delivery',
    'DELIVERED': 'delivered',
    'CANCELLED': 'cancelled',
    'CANCELED': 'cancelled',
    'RTO': 'returned',
    'RTO_IN_TRANSIT': 'returned',
    'RTO_DELIVERED': 'returned',
    'RTO_OUT_FOR_DELIVERY': 'returned',
  };

  // Try exact match first
  if (statusMap[statusUpper]) {
    return statusMap[statusUpper];
  }

  // Try partial match
  for (const [key, value] of Object.entries(statusMap)) {
    if (statusUpper.includes(key) || key.includes(statusUpper)) {
      return value;
    }
  }

  // Default to shipped if status contains transit/delivery keywords
  if (statusUpper.includes('TRANSIT') || statusUpper.includes('DELIVERY') || statusUpper.includes('SHIPPED')) {
    return 'shipped';
  }

  // Default to processing if unknown
  return 'processing';
}

/**
 * Download Shipping Label PDF from Shiprocket
 * @param shipmentId - Shiprocket shipment ID
 * @param awbCode - Optional AWB code (if already known from order tracking)
 * @param orderId - Optional Shiprocket order ID (numeric order_id)
 * @returns Label PDF as base64 string or buffer
 */
export async function downloadShiprocketLabel(
  shipmentId: number,
  awbCode?: string | null,
  orderId?: number
): Promise<{
  success: boolean;
  labelPdf?: string; // Base64 encoded PDF
  labelUrl?: string; // Direct URL to label (if available)
  error?: string;
}> {
  const enabled = isShiprocketEnabled();
  
  if (!enabled) {
    return {
      success: false,
      error: 'Shiprocket is not enabled',
    };
  }

  try {
    const token = await getShiprocketToken();
    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

    // Use provided AWB code or fetch from shipment status
    let shipmentData: any = null;
    let extractedAwbCode: string | null = awbCode || null;
    
    console.log('[Shiprocket] 📋 Checking shipment status for label download', {
      shipmentId,
      providedAwbCode: awbCode || 'Not provided',
    });

    // Always fetch shipment/order status to get detailed information (even if AWB is provided)
    // This helps us understand the shipment state for better error messages and debugging
    // Try both shipment ID and order ID endpoints
    let shipmentUrl = `${baseUrl}/shipments/show/${shipmentId}`;
    let orderUrl = orderId ? `${baseUrl}/orders/show/${orderId}` : null;
    
    try {
      // Try shipment endpoint first
      let shipmentResponse = await fetch(shipmentUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // If shipment endpoint fails and we have order ID, try order endpoint
      if (!shipmentResponse.ok && orderUrl) {
        console.log('[Shiprocket] ⚠️ Shipment endpoint failed, trying order endpoint:', {
          shipmentId,
          orderId,
          shipmentStatus: shipmentResponse.status,
        });
        shipmentResponse = await fetch(orderUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      if (shipmentResponse.ok) {
        const responseData = await shipmentResponse.json();
        shipmentData = responseData.data || responseData;
        
        // Try multiple possible fields for AWB code (if not already provided)
        if (!extractedAwbCode) {
          extractedAwbCode = shipmentData.awb_code || 
                            shipmentData.awbCode || 
                            shipmentData.airwaybill_number || 
                            shipmentData.airway_bill_number ||
                            shipmentData.awb ||
                            null;
        }
        
        console.log('[Shiprocket] 📦 Shipment status retrieved:', {
          shipmentId,
          status: shipmentData.status || shipmentData.shipment_status,
          providedAwbCode: awbCode || 'Not provided',
          extractedAwbCode: extractedAwbCode || 'Not found',
          hasLabelUrl: !!(shipmentData.label_url || shipmentData.labelUrl),
          hasInvoiceUrl: !!(shipmentData.invoice_url || shipmentData.invoiceUrl),
          allAwbFields: {
            awb_code: shipmentData.awb_code,
            awbCode: shipmentData.awbCode,
            airwaybill_number: shipmentData.airwaybill_number,
            airway_bill_number: shipmentData.airway_bill_number,
            awb: shipmentData.awb,
          },
          shipmentKeys: Object.keys(shipmentData).slice(0, 20), // First 20 keys for debugging
        });

        // Check if label URL is directly available in shipment data
        const labelUrlFromShipment = shipmentData.label_url || shipmentData.labelUrl || shipmentData.invoice_url || shipmentData.invoiceUrl;
        if (labelUrlFromShipment) {
          console.log('[Shiprocket] ✅ Label URL found in shipment data:', labelUrlFromShipment);
          return {
            success: true,
            labelUrl: labelUrlFromShipment,
          };
        }

        // Check if AWB is assigned - label is usually only available after AWB assignment
        if (!extractedAwbCode) {
          const status = shipmentData.status || shipmentData.shipment_status || '';
          if (status.toLowerCase().includes('pending') || status.toLowerCase().includes('new')) {
            console.warn('[Shiprocket] ⚠️ AWB not found in shipment data and status indicates pending:', status);
            // Don't return error immediately - try other endpoints first
          }
        }
      } else {
        const errorText = await shipmentResponse.text().catch(() => '');
        console.warn('[Shiprocket] ⚠️ Could not fetch shipment/order details:', {
          status: shipmentResponse.status,
          shipmentId,
          orderId: orderId || 'Not provided',
          triedShipmentEndpoint: true,
          triedOrderEndpoint: !!orderUrl,
          error: errorText.substring(0, 200),
        });
      }
    } catch (shipmentError: any) {
      console.warn('[Shiprocket] ⚠️ Could not fetch shipment details, continuing with label download attempts:', {
        error: shipmentError.message,
        shipmentId,
      });
    }

    // Use extractedAwbCode for rest of function (don't shadow the parameter)
    const finalAwbCode = extractedAwbCode;

    // Try Shiprocket label generation endpoint - /courier/generate/label (POST)
    // This is the correct endpoint for generating and getting label URL
    const generateLabelUrl = `${baseUrl}/courier/generate/label`;
    console.log('[Shiprocket] 📄 Attempting to generate label from:', {
      endpoint: generateLabelUrl,
      shipmentId,
      awbCode: finalAwbCode,
    });
    
    try {
      const labelResponse = await fetch(generateLabelUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipment_id: [shipmentId],
        }),
      });

      console.log('[Shiprocket] 📊 Label generation response:', {
        status: labelResponse.status,
        statusText: labelResponse.statusText,
        contentType: labelResponse.headers.get('content-type'),
        ok: labelResponse.ok,
      });

      if (labelResponse.ok) {
        const responseData = await labelResponse.json();
        console.log('[Shiprocket] 📋 Label generation response data:', {
          labelCreated: responseData.label_created,
          labelUrl: responseData.label_url,
          response: responseData.response,
          notCreated: responseData.not_created,
        });

        // Check if label URL is in response
        const labelUrlFromResponse = responseData.label_url || responseData.labelUrl;
        
        if (labelUrlFromResponse) {
          console.log('[Shiprocket] ✅ Label URL received from generate endpoint:', labelUrlFromResponse);
          
          // Try to download the PDF from the URL
          try {
            const pdfResponse = await fetch(labelUrlFromResponse);
            if (pdfResponse.ok) {
              const contentType = pdfResponse.headers.get('content-type');
              if (contentType?.includes('application/pdf') || contentType?.includes('image/')) {
                const arrayBuffer = await pdfResponse.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                console.log('[Shiprocket] ✅ Label PDF downloaded from URL');
                return {
                  success: true,
                  labelPdf: base64,
                  labelUrl: labelUrlFromResponse,
                };
              }
            }
          } catch (pdfError) {
            console.warn('[Shiprocket] ⚠️ Could not download PDF from URL, returning URL only:', pdfError);
          }
          
          // Return URL even if PDF download failed
          return {
            success: true,
            labelUrl: labelUrlFromResponse,
          };
        } else if (responseData.label_created === 0) {
          console.warn('[Shiprocket] ⚠️ Label generation returned label_created: 0');
          if (responseData.not_created && responseData.not_created.length > 0) {
            console.warn('[Shiprocket] ⚠️ Shipments not created:', responseData.not_created);
          }
        }
      } else {
        const errorText = await labelResponse.text().catch(() => '');
        console.log('[Shiprocket] ⚠️ Label generation endpoint returned error:', {
          status: labelResponse.status,
          error: errorText.substring(0, 300),
        });
      }
    } catch (labelError: any) {
      console.warn('[Shiprocket] ⚠️ Error with label generation endpoint:', {
        error: labelError.message,
        shipmentId,
      });
    }

    // Try manifest print endpoint with AWB label type
    if (finalAwbCode) {
      console.log('[Shiprocket] 📄 Trying manifest print endpoint with AWB:', {
        awbCode: finalAwbCode,
        shipmentId,
        endpoint: `${baseUrl}/manifests/print/awb`,
      });
      try {
        const manifestUrl = `${baseUrl}/manifests/print/awb`;
        const manifestResponse = await fetch(manifestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            shipment_id: [shipmentId],
          }),
        });

        console.log('[Shiprocket] 📊 Manifest endpoint response:', {
          status: manifestResponse.status,
          statusText: manifestResponse.statusText,
          contentType: manifestResponse.headers.get('content-type'),
          ok: manifestResponse.ok,
        });

        if (manifestResponse.ok) {
          const contentType = manifestResponse.headers.get('content-type');
          
          if (contentType?.includes('application/pdf')) {
            const arrayBuffer = await manifestResponse.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            console.log('[Shiprocket] ✅ Label downloaded from manifest print endpoint', {
              pdfSize: base64.length,
              shipmentId,
              awbCode: finalAwbCode,
            });
            return {
              success: true,
              labelPdf: base64,
            };
          } else {
            // Try to parse JSON response
            try {
              const manifestData = await manifestResponse.json();
              console.log('[Shiprocket] 📋 Manifest endpoint JSON response:', {
                hasLabelUrl: !!(manifestData.label_url || manifestData.labelUrl || manifestData.data?.label_url),
                responseKeys: Object.keys(manifestData),
                shipmentId,
              });
              const labelUrlFromManifest = manifestData.label_url || manifestData.labelUrl || manifestData.data?.label_url;
              if (labelUrlFromManifest) {
                console.log('[Shiprocket] ✅ Label URL from manifest endpoint:', labelUrlFromManifest);
                return {
                  success: true,
                  labelUrl: labelUrlFromManifest,
                };
              } else {
                console.log('[Shiprocket] ⚠️ Manifest endpoint returned OK but no label URL found');
              }
            } catch (e) {
              console.log('[Shiprocket] ⚠️ Manifest response is not JSON, content-type:', contentType);
            }
          }
        } else {
          const errorText = await manifestResponse.text().catch(() => '');
          console.log('[Shiprocket] ⚠️ Manifest endpoint returned error:', {
            status: manifestResponse.status,
            error: errorText.substring(0, 300),
          });
        }
      } catch (manifestError: any) {
        console.warn('[Shiprocket] ⚠️ Manifest endpoint error:', {
          error: manifestError.message,
          shipmentId,
          awbCode: finalAwbCode,
        });
      }
    }

    // Try alternative endpoint - /orders/print/invoice/{shipment_id}
    const altUrl = `${baseUrl}/orders/print/invoice/${shipmentId}`;
    console.log('[Shiprocket] 📄 Trying invoice print endpoint:', {
      url: altUrl,
      shipmentId,
      awbCode: finalAwbCode,
    });
    
    try {
      const altResponse = await fetch(altUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[Shiprocket] 📊 Invoice endpoint response:', {
        status: altResponse.status,
        statusText: altResponse.statusText,
        contentType: altResponse.headers.get('content-type'),
        ok: altResponse.ok,
      });

      if (altResponse.ok) {
        const contentType = altResponse.headers.get('content-type');
        
        if (contentType?.includes('application/pdf') || contentType?.includes('image/')) {
          const arrayBuffer = await altResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          console.log('[Shiprocket] ✅ Label downloaded from invoice endpoint', {
            pdfSize: base64.length,
            shipmentId,
            awbCode: finalAwbCode,
          });
          return {
            success: true,
            labelPdf: base64,
          };
        } else {
          console.log('[Shiprocket] ⚠️ Invoice endpoint returned OK but content-type is not PDF/image:', contentType);
          // Try to get response as text to see what we got
          try {
            const responseText = await altResponse.text();
            console.log('[Shiprocket] 📄 Invoice endpoint response preview:', responseText.substring(0, 200));
          } catch (e) {
            // Ignore
          }
        }
      } else {
        const errorText = await altResponse.text().catch(() => '');
        console.log('[Shiprocket] ⚠️ Invoice endpoint returned error:', {
          status: altResponse.status,
          error: errorText.substring(0, 300),
        });
      }
    } catch (altError: any) {
      console.warn('[Shiprocket] ⚠️ Invoice endpoint error:', {
        error: altError.message,
        shipmentId,
        awbCode: finalAwbCode,
      });
    }

    // If all endpoints fail, provide detailed error message
    const status = shipmentData?.status || shipmentData?.shipment_status || 'Unknown';
    const errorMessage = finalAwbCode 
      ? `Label not available for shipment ${shipmentId}. The shipment has AWB ${finalAwbCode} but the label could not be retrieved. Status: ${status}. Please try again later or contact support.`
      : `Label not available for shipment ${shipmentId}. AWB code has not been assigned yet. Status: ${status}. Please wait for the shipment to be processed and AWB to be assigned.`;

    console.error('[Shiprocket] ❌ All label download attempts failed:', {
      shipmentId,
      awbCode: finalAwbCode,
      status,
    });

    return {
      success: false,
      error: errorMessage,
    };
  } catch (error: any) {
    console.error('[Shiprocket] ❌ Error downloading label:', {
      shipmentId,
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      error: error.message || 'Failed to download shipping label',
    };
  }
}


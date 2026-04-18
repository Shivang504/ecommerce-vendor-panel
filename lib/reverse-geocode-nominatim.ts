/**
 * Reverse geocode coordinates via OpenStreetMap Nominatim (free, no API key).
 * Use sparingly; see https://operations.osmfoundation.org/policies/nominatim/
 */
export async function reverseGeocodeToIndianPincode(
  latitude: number,
  longitude: number
): Promise<{ pincode?: string; city?: string; state?: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ecommerce-app/1.0 (address lookup)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to fetch location details');
  }

  const data = await response.json();
  const address = data?.address || {};
  const postcode: string | undefined = address.postcode;

  return {
    pincode: postcode?.replace(/\s/g, ''),
    city: address.city || address.town || address.village || address.hamlet,
    state: address.state,
  };
}

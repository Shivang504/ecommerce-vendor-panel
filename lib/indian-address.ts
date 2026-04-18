/** Indian states/UTs for address dropdowns (aligned with India Post / GST naming). */
export const INDIAN_STATES: string[] = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Puducherry',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Tripura',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const COUNTRY_OPTIONS = [{ value: 'India', label: 'India' }];

/** Map India Post / OSM state strings to `INDIAN_STATES` labels */
export function matchApiStateToIndianState(apiState: string): string {
  const t = apiState.trim();
  if (!t) return '';
  const lower = t.toLowerCase();
  const aliases: Record<string, string> = {
    orissa: 'Odisha',
    uttaranchal: 'Uttarakhand',
    'nct of delhi': 'Delhi',
    delhi: 'Delhi',
    pondicherry: 'Puducherry',
    'the dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  };
  const aliased = aliases[lower];
  if (aliased && INDIAN_STATES.includes(aliased)) return aliased;
  const exact = INDIAN_STATES.find(s => s.toLowerCase() === lower);
  if (exact) return exact;
  const fuzzy = INDIAN_STATES.find(
    s =>
      lower === s.toLowerCase() ||
      lower.includes(s.toLowerCase()) ||
      s.toLowerCase().includes(lower)
  );
  return fuzzy || t;
}

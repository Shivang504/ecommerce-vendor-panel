export type SiteSettings = {
  siteName: string;
  siteTitle: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  logo: string;
  favicon: string;
  productType: boolean;
  registeredOfficeAddress?: string;
  mailUsAddress?: string;
  phoneNumber?: string;
  cin?: string;
  trustIcons?: string[];
  codMaxLimit?: number; // Maximum COD order amount (in rupees)
  codChargeType?: 'percentage' | 'amount'; // Charge type: percentage or fixed amount (applies when ANY coupon code is used)
  codChargeValue?: number; // Charge value (percentage or amount)
};

export const defaultSiteSettings: SiteSettings = {
  siteName: 'Tryvvo',
  siteTitle: 'Tryvvo — Fashion & Lifestyle Shopping',
  tagline: 'Shop shoes, bags & style online',
  primaryColor: "#16a34a",
  accentColor: "#0f172a",
  logo: "",
  favicon: "",
  productType: true,
  registeredOfficeAddress: "",
  mailUsAddress: "",
  phoneNumber: "",
  cin: "",
  trustIcons: [],
  codMaxLimit: 5000, // Default COD limit: ₹5,000
  codChargeType: 'amount', // Default to fixed amount (applies when ANY coupon code is used)
  codChargeValue: 0, // Default charge value
};

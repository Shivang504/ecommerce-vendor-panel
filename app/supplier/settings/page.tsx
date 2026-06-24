import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Settings | Vendor Panel',
  description: 'Vendor account and pickup settings',
};

export default function SupplierSettingsPage() {
  redirect('/supplier/profile');
}

import { AdminLayout } from '@/components/layout/admin-layout';
import { WalletPage } from '@/components/wallet/wallet-page';

export const metadata = {
  title: 'Wallet',
  description: 'Manage your wallet and withdrawals',
};

export default function WalletPageRoute() {
  return (
    <AdminLayout>
      <WalletPage />
    </AdminLayout>
  );
}


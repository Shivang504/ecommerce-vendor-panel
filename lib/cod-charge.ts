import { connectToDatabase } from '@/lib/mongodb';
import { Db } from 'mongodb';

/**
 * Calculate COD charge based on settings when COD payment method is selected
 * @param paymentMethod The payment method ('cod' or 'online')
 * @param totalAmount The total order amount (after discount, before shipping)
 * @param db Optional database connection (if already connected, pass it to avoid reconnection)
 * @returns The COD charge amount to add to shipping (0 if no charge applies)
 */
export async function calculateCodCharge(
  paymentMethod: string | undefined,
  totalAmount: number,
  db?: Db
): Promise<number> {
  try {
    // Charge only applies when payment method is COD
    if (!paymentMethod || paymentMethod.toLowerCase() !== 'cod') {
      return 0;
    }

    // Use provided db connection or create new one
    const database = db || (await connectToDatabase()).db;
    const settings = await database.collection('settings').findOne({});

    if (!settings) {
      return 0;
    }

    const codChargeType = settings.codChargeType;
    const codChargeValue = settings.codChargeValue;

    // Check if COD charge is configured
    if (!codChargeType || !codChargeValue || codChargeValue <= 0) {
      return 0;
    }

    // Calculate charge based on type
    if (codChargeType === 'percentage') {
      // Percentage of total amount
      return (totalAmount * codChargeValue) / 100;
    } else {
      // Fixed amount
      return codChargeValue;
    }
  } catch (error) {
    console.error('[COD Charge] Error calculating COD charge:', error);
    return 0;
  }
}


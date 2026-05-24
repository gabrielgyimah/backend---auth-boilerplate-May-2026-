import { db } from "@/infrastructure/database/prisma";


/**
 * Repository for managing currency data
 */
export class CurrencyRepository {
    /**
     * Get all active currencies
     **/

  async getCurrencyById(id: string) {
    return await db.currency.findUnique({
      where: { id },
      include: {
        country: true,
      }
    });
  }
}


export const currencyRepository = new CurrencyRepository();
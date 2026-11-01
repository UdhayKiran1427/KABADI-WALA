import { prisma } from "@/lib/prisma";
import { apiErrorFrom, apiSuccess } from "@/lib/apiResponse";
import { getTodayRates } from "@/lib/services/lotFlowService";

/**
 * Today's admin-set price (paise per kg) for every active material category.
 * `ratePerKgPaise` is null when the admin has not set a price; such materials cannot be listed.
 */
export async function GET() {
  try {
    const [categories, todayRates] = await Promise.all([
      prisma.materialCategory.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
      getTodayRates(),
    ]);

    return apiSuccess({
      categories: categories.map((cat) => {
        const rate = todayRates.get(cat.id);
        return {
          categoryId: cat.id,
          code: cat.code,
          nameEn: cat.nameEn,
          nameHi: cat.nameHi,
          nameMr: cat.nameMr,
          iconKey: cat.iconKey,
          isHazardous: cat.isHazardous,
          ratePerKgPaise: rate?.ratePerKgPaise ?? null,
          updatedAt: rate?.recordedAt ?? null,
        };
      }),
    });
  } catch (err) {
    return apiErrorFrom(err);
  }
}

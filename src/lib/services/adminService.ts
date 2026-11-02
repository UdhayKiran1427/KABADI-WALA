import { prisma } from "../prisma";
import { hashPassword } from "../auth/password";
import { isValidCoordinate } from "../domain/lotBroadcast";
import { FlowError } from "./lotFlowService";

export interface CreateRecyclerInput {
  name: string;
  contactPhone: string;
  authorizationNo: string;
  authorizationValidTill?: Date;
  address: string;
  area: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm?: number;
  staffPhone: string;
  staffPassword: string;
}

export type UpdateRecyclerInput = Omit<CreateRecyclerInput, "staffPassword"> & { staffPassword?: string };

/** Field checks shared by add and edit. The password is required only when it is given or for a new login. */
function validateRecyclerInput(input: UpdateRecyclerInput, passwordRequired: boolean) {
  if (!input.name || !input.address || !input.area || !input.authorizationNo || !input.contactPhone) {
    throw new FlowError("VALIDATION_ERROR", "Please fill in all required facility fields");
  }
  if (!isValidCoordinate(input.latitude, input.longitude)) {
    throw new FlowError("VALIDATION_ERROR", "Please enter the facility's latitude and longitude (used for the 5 km collector match)");
  }
  if (!/^\d{10}$/.test(input.staffPhone || "")) {
    throw new FlowError("VALIDATION_ERROR", "Staff phone must be a 10-digit number");
  }
  if ((passwordRequired || input.staffPassword) && (!input.staffPassword || input.staffPassword.length < 6)) {
    throw new FlowError("VALIDATION_ERROR", "Staff password must be at least 6 characters");
  }
}

/** Login phone and permit number must be unique; `self` are the records being edited. */
async function assertRecyclerUnique(input: UpdateRecyclerInput, self?: { recyclerId: string; staffUserId?: string }) {
  const phoneOwner = await prisma.user.findUnique({ where: { phone: input.staffPhone }, select: { id: true } });
  if (phoneOwner && phoneOwner.id !== self?.staffUserId) {
    throw new FlowError("DUPLICATE", `Login phone ${input.staffPhone} is already used by another account`, 409);
  }
  const permitOwner = await prisma.recycler.findUnique({
    where: { authorizationNo: input.authorizationNo },
    select: { id: true, name: true },
  });
  if (permitOwner && permitOwner.id !== self?.recyclerId) {
    throw new FlowError(
      "DUPLICATE",
      `Authorization no. ${input.authorizationNo} is already used by "${permitOwner.name}". Enter a different number, or edit that recycler.`,
      409
    );
  }
}

/**
 * Adds a verified recycler facility with one staff login.
 */
export async function createRecycler(input: CreateRecyclerInput) {
  validateRecyclerInput(input, true);
  await assertRecyclerUnique(input);

  const staffPasswordHash = await hashPassword(input.staffPassword);

  return prisma.$transaction(async (tx) => {
    const recycler = await tx.recycler.create({
      data: {
        name: input.name,
        contactPhone: input.contactPhone,
        address: input.address,
        area: input.area,
        district: input.district || "Mumbai",
        state: input.state || "Maharashtra",
        latitude: input.latitude,
        longitude: input.longitude,
        authorizationNo: input.authorizationNo,
        authorizationStatus: "VERIFIED",
        authorizationValidTill: input.authorizationValidTill ?? new Date("2028-12-31"),
        serviceRadiusKm: Number.isFinite(input.serviceRadiusKm) ? input.serviceRadiusKm : 15,
        verifiedAt: new Date(),
      },
    });

    const staffUser = await tx.user.create({
      data: { phone: input.staffPhone, pinHash: staffPasswordHash, role: "RECYCLER", language: "EN" },
    });

    await tx.recyclerStaff.create({ data: { userId: staffUser.id, recyclerId: recycler.id } });

    // Initial default rates for all categories
    const categories = await tx.materialCategory.findMany();
    for (const cat of categories) {
      await tx.recyclerRate.create({
        data: { recyclerId: recycler.id, categoryId: cat.id, ratePerKgPaise: 3500, isCurrent: true },
      });
    }

    return recycler;
  });
}

/**
 * Edits a recycler's facility details and its staff login (phone; password only when a new one is given).
 * The approval status is not changed here.
 */
export async function updateRecycler(recyclerId: string, input: UpdateRecyclerInput) {
  const recycler = await prisma.recycler.findUnique({
    where: { id: recyclerId },
    include: { staff: { include: { user: { select: { id: true } } }, take: 1 } },
  });
  if (!recycler) throw new FlowError("NOT_FOUND", "Recycler not found", 404);
  const staffUserId = recycler.staff[0]?.user.id;

  validateRecyclerInput(input, !staffUserId);
  await assertRecyclerUnique(input, { recyclerId, staffUserId });

  const pinHash = input.staffPassword ? await hashPassword(input.staffPassword) : undefined;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.recycler.update({
      where: { id: recyclerId },
      data: {
        name: input.name,
        contactPhone: input.contactPhone,
        address: input.address,
        area: input.area,
        district: input.district || recycler.district,
        state: input.state || recycler.state,
        latitude: input.latitude,
        longitude: input.longitude,
        authorizationNo: input.authorizationNo,
        authorizationValidTill: input.authorizationValidTill ?? recycler.authorizationValidTill,
        serviceRadiusKm: Number.isFinite(input.serviceRadiusKm) ? input.serviceRadiusKm : recycler.serviceRadiusKm,
      },
    });

    if (staffUserId) {
      await tx.user.update({ where: { id: staffUserId }, data: { phone: input.staffPhone, ...(pinHash ? { pinHash } : {}) } });
    } else {
      const staffUser = await tx.user.create({
        data: { phone: input.staffPhone, pinHash: pinHash!, role: "RECYCLER", language: "EN" },
      });
      await tx.recyclerStaff.create({ data: { userId: staffUser.id, recyclerId } });
    }

    return updated;
  });
}

/**
 * Records today's price (paise/kg) for the given categories. New lots are valued at these rates.
 */
export async function setTodayPrices(adminUserId: string, prices: Array<{ categoryId: number; ratePerKgPaise: number }>) {
  const valid = prices.filter((p) => Number.isInteger(p.ratePerKgPaise) && p.ratePerKgPaise > 0);
  if (valid.length === 0) {
    throw new FlowError("VALIDATION_ERROR", "Enter at least one price");
  }

  const activeIds = new Set(
    (await prisma.materialCategory.findMany({ where: { isActive: true }, select: { id: true } })).map((c) => c.id)
  );
  const unknown = valid.find((p) => !activeIds.has(p.categoryId));
  if (unknown) {
    throw new FlowError("VALIDATION_ERROR", `Unknown or inactive category ${unknown.categoryId}`);
  }

  const now = new Date();
  await prisma.pricePoint.createMany({
    data: valid.map((p) => ({
      id: `PRICE-TODAY-${p.categoryId}-${now.getTime()}`,
      categoryId: p.categoryId,
      buyingPricePaise: p.ratePerKgPaise,
      area: "All Areas",
      district: "All",
      recordedAt: now,
      source: "ADMIN" as const,
      buyerType: "PLATFORM_DAILY",
      recordedById: adminUserId,
    })),
  });

  return valid.length;
}

/**
 * Approves, suspends or expires a recycler and records the review.
 */
export async function setRecyclerStatus(
  adminUserId: string,
  recyclerId: string,
  status: "VERIFIED" | "SUSPENDED" | "EXPIRED",
  notes?: string
) {
  const recycler = await prisma.recycler.findUnique({ where: { id: recyclerId }, select: { id: true } });
  if (!recycler) throw new FlowError("NOT_FOUND", "Recycler not found", 404);

  await prisma.$transaction(async (tx) => {
    await tx.recycler.update({
      where: { id: recyclerId },
      data: { authorizationStatus: status, verifiedAt: status === "VERIFIED" ? new Date() : undefined },
    });
    await tx.recyclerVerification.create({
      data: { recyclerId, reviewedById: adminUserId, status, notes: notes || "Admin updated status to " + status },
    });
  });
}

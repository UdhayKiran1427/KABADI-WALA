import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  const hashPassword = async (pass: string) => bcrypt.hash(pass, 10);

  // 1. Categories (Explicit Int IDs matching mobile Drift contract)
  const categories = [
    {
      id: 1,
      code: "PCB",
      nameEn: "Printed Circuit Board (PCB)",
      nameHi: "सर्किट बोर्ड (PCB)",
      nameMr: "सर्किट बोर्ड",
      iconKey: "ic_pcb",
      isHazardous: false,
    },
    {
      id: 2,
      code: "CABLE",
      nameEn: "Wires & Copper Cables",
      nameHi: "तार और केबल",
      nameMr: "तारा आणि केबल",
      iconKey: "ic_cable",
      isHazardous: false,
    },
    {
      id: 3,
      code: "BATTERY",
      nameEn: "Batteries (Li-Ion / Lead)",
      nameHi: "बैटरी",
      nameMr: "बॅटरी",
      iconKey: "ic_battery",
      isHazardous: true,
    },
    {
      id: 4,
      code: "CRT",
      nameEn: "CRT Monitors / Glass",
      nameHi: "सीआरटी मॉनिटर",
      nameMr: "सीआरटी मॉनिटर",
      iconKey: "ic_crt",
      isHazardous: true,
    },
    {
      id: 5,
      code: "LCD",
      nameEn: "LCD & LED Panels",
      nameHi: "एलसीडी स्क्रीन",
      nameMr: "एलसीडी स्क्रीन",
      iconKey: "ic_lcd",
      isHazardous: false,
    },
    {
      id: 6,
      code: "MOTOR_MAGNET",
      nameEn: "Motors & Compressors",
      nameHi: "मोटर और कंप्रेसर",
      nameMr: "मोटर आणि कॉम्प्रेसर",
      iconKey: "ic_motor",
      isHazardous: false,
    },
    {
      id: 7,
      code: "MIXED_PLASTIC",
      nameEn: "E-Waste Casing Plastic",
      nameHi: "प्लास्टिक केसिंग",
      nameMr: "प्लास्टिक केसिंग",
      iconKey: "ic_plastic",
      isHazardous: false,
    },
  ];

  for (const cat of categories) {
    const { id, ...dataWithoutId } = cat;
    await prisma.materialCategory.upsert({
      where: { id: cat.id },
      create: cat,
      update: dataWithoutId,
    });
  }
  console.log(`✓ Seeded ${categories.length} material categories (Hindi/Marathi).`);

  // 2. Safety Topics (The 4 core hazards from wireframe C11)
  const safetyTopics = [
    {
      key: "burning_cables",
      titleEn: "Do Not Burn Cables",
      titleHi: "तार न जलाएं",
      titleMr: "तारा जाळू नका",
      contentEn: "Burning cables releases deadly dioxins, hydrochloric acid fumes, and heavy smoke causing lung cancer.",
      contentHi: "तार जलाने से जहरीला धुआं और गैस निकलती है जो फेफड़ों को गंभीर नुकसान पहुंचाती है।",
      contentMr: "तारा जाळल्याने विषारी वायू बाहेर पडतो जो आरोग्यासाठी अत्यंत घातक आहे.",
      imageKey: "safety_burn_cable",
      audioKeyHi: "audio_burn_cable_hi",
      audioKeyMr: "audio_burn_cable_mr",
      sortOrder: 1,
    },
    {
      key: "acid_leaching",
      titleEn: "Do Not Wash Boards With Acid",
      titleHi: "एसिड से बोर्ड न धोएं",
      titleMr: "ॲसिडने बोर्ड धुवू नका",
      contentEn: "Acid baths for extracting gold release cyanide gas, cause severe skin burns, and poison groundwater.",
      contentHi: "एसिड से सोना निकालने की कोशिश में त्वचा जल सकती है और जहरीली गैस निकलती है।",
      contentMr: "ॲसिडच्या वापराने गंभीर इजा आणि विषबाधा होऊ शकते.",
      imageKey: "safety_acid",
      audioKeyHi: "audio_acid_hi",
      audioKeyMr: "audio_acid_mr",
      sortOrder: 2,
    },
    {
      key: "battery_opening",
      titleEn: "Do Not Puncture or Open Batteries",
      titleHi: "बैटरी न खोलें",
      titleMr: "बॅटरी फोडू नका",
      contentEn: "Puncturing lithium or lead-acid batteries causes explosive chemical fires and corrosive acid burns.",
      contentHi: "बैटरी को तोड़ने या खोलने से आग लग सकती है और धमाका हो सकता है।",
      contentMr: "बॅटरी फोडल्याने आग लागू शकते किंवा स्फोट होऊ शकतो.",
      imageKey: "safety_battery",
      audioKeyHi: "audio_battery_hi",
      audioKeyMr: "audio_battery_mr",
      sortOrder: 3,
    },
    {
      key: "crt_breaking",
      titleEn: "Do Not Smash CRT Monitors",
      titleHi: "सीआरटी न तोड़ें",
      titleMr: "सीआरटी काच फोडू नका",
      contentEn: "CRT tubes contain toxic leaded glass and cadmium dust that implodes when smashed, blinding workers.",
      contentHi: "सीआरटी स्क्रीन में जहरीला सीसा (Lead) होता है। इसे तोड़ने से आंखों को स्थायी नुकसान हो सकता है।",
      contentMr: "सीआरटी काच फोडल्याने विषारी धूळ पसरते आणि डोळ्यांना इजा होते.",
      imageKey: "safety_crt",
      audioKeyHi: "audio_crt_hi",
      audioKeyMr: "audio_crt_mr",
      sortOrder: 4,
    },
  ];

  for (const topic of safetyTopics) {
    await prisma.safetyTopic.upsert({
      where: { key: topic.key },
      create: topic,
      update: topic,
    });
  }
  console.log(`✓ Seeded ${safetyTopics.length} safety guide topics.`);

  // 3. Platform Admin Account
  const adminPassHash = await hashPassword("admin123");
  await prisma.user.upsert({
    where: { phone: "9999999999" },
    create: {
      phone: "9999999999",
      pinHash: adminPassHash,
      role: "ADMIN",
      language: "EN",
    },
    update: {
      pinHash: adminPassHash,
      role: "ADMIN",
    },
  });
  console.log("✓ Seeded Platform Admin (9999999999 / admin123).");

  // 4. Area Centroids
  const centroids = [
    { area: "Dharavi", district: "Mumbai", latitude: 19.0434, longitude: 72.8567 },
    { area: "Kurla West", district: "Mumbai", latitude: 19.0657, longitude: 72.8794 },
    { area: "Andheri East", district: "Mumbai", latitude: 19.1136, longitude: 72.8697 },
    { area: "Thane West", district: "Thane", latitude: 19.2183, longitude: 72.9781 },
  ];
  for (const c of centroids) {
    const existing = await prisma.areaCentroid.findFirst({ where: { area: c.area } });
    if (!existing) {
      await prisma.areaCentroid.create({ data: c });
    }
  }

  // 5. Sample Demo Data (Controlled by SEED_SAMPLE_DATA)
  if (process.env.SEED_SAMPLE_DATA === "true") {
    console.log("📦 Seeding demo recyclers, prices, and test collector...");

    // Demo Recycler 1
    const recycler1 = await prisma.recycler.upsert({
      where: { authorizationNo: "EW-MH-2026-0042" },
      create: {
        name: "EcoRecycle Mumbai Central Hub",
        address: "Plot 12, Dharavi Cross Road, Dharavi",
        area: "Dharavi",
        district: "Mumbai",
        state: "Maharashtra",
        latitude: 19.045,
        longitude: 72.858,
        authorizationNo: "EW-MH-2026-0042",
        authorizationStatus: "VERIFIED",
        authorizationValidTill: new Date("2028-12-31"),
        contactPhone: "9876543210",
        pickupAvailable: true,
        serviceRadiusKm: 15,
        minimumWeightGrams: 5000,
        pickupChargePaise: 0,
        verifiedAt: new Date(),
      },
      update: {},
    });

    // Staff for Recycler 1
    const staffPass = await hashPassword("password123");
    const staffUser1 = await prisma.user.upsert({
      where: { phone: "9876543210" },
      create: {
        phone: "9876543210",
        pinHash: staffPass,
        role: "RECYCLER",
        language: "EN",
      },
      update: { pinHash: staffPass },
    });

    await prisma.recyclerStaff.upsert({
      where: { userId: staffUser1.id },
      create: {
        userId: staffUser1.id,
        recyclerId: recycler1.id,
      },
      update: {},
    });

    // Rates for Recycler 1 (Rates stored in integer paise per kg)
    const ratesR1 = [
      { categoryId: 1, ratePerKgPaise: 34000 }, // ₹340.00/kg
      { categoryId: 2, ratePerKgPaise: 58000 }, // ₹580.00/kg
      { categoryId: 3, ratePerKgPaise: 9000 },  // ₹90.00/kg
      { categoryId: 4, ratePerKgPaise: 1200 },  // ₹12.00/kg
      { categoryId: 5, ratePerKgPaise: 4500 },  // ₹45.00/kg
      { categoryId: 6, ratePerKgPaise: 14000 }, // ₹140.00/kg
      { categoryId: 7, ratePerKgPaise: 800 },   // ₹8.00/kg
    ];

    for (const r of ratesR1) {
      const existing = await prisma.recyclerRate.findFirst({
        where: { recyclerId: recycler1.id, categoryId: r.categoryId, isCurrent: true },
      });
      if (!existing) {
        await prisma.recyclerRate.create({
          data: {
            recyclerId: recycler1.id,
            categoryId: r.categoryId,
            ratePerKgPaise: r.ratePerKgPaise,
            isCurrent: true,
          },
        });
      }
    }

    // Demo Collector User
    const collectorPinHash = await hashPassword("1234");
    const collectorUser = await prisma.user.upsert({
      where: { phone: "9820000001" },
      create: {
        phone: "9820000001",
        pinHash: collectorPinHash,
        role: "COLLECTOR",
        language: "HI",
      },
      update: { pinHash: collectorPinHash },
    });

    const collector = await prisma.collector.upsert({
      where: { userId: collectorUser.id },
      create: {
        userId: collectorUser.id,
        shortCode: "KW01",
        preferredLanguage: "HI",
        operatingArea: "Dharavi Matunga Labour Camp",
        district: "Mumbai",
        consentAt: new Date(),
      },
      update: {},
    });

    // Demo Field Agent
    const agentPassHash = await hashPassword("agent123");
    await prisma.user.upsert({
      where: { phone: "9830000001" },
      create: {
        phone: "9830000001",
        pinHash: agentPassHash,
        role: "FIELD_AGENT",
        language: "HI",
      },
      update: {
        pinHash: agentPassHash,
        role: "FIELD_AGENT",
      },
    });
    console.log("✓ Seeded Demo Field Agent (9830000001 / agent123).");

    // Ground Price Records across weeks for M2 chart
    const dummyPrices = [
      { cat: 1, price: 31000, daysAgo: 50 },
      { cat: 1, price: 31500, daysAgo: 42 },
      { cat: 1, price: 32000, daysAgo: 35 },
      { cat: 1, price: 32500, daysAgo: 28 },
      { cat: 1, price: 33000, daysAgo: 21 },
      { cat: 1, price: 33500, daysAgo: 14 },
      { cat: 1, price: 34000, daysAgo: 7 },
      { cat: 1, price: 34500, daysAgo: 2 },
    ];

    for (const dp of dummyPrices) {
      const priceId = `PRC-SEED-${dp.cat}-${dp.daysAgo}`;
      const recordedAt = new Date(Date.now() - dp.daysAgo * 24 * 60 * 60 * 1000);
      await prisma.pricePoint.upsert({
        where: { id: priceId },
        create: {
          id: priceId,
          categoryId: dp.cat,
          area: "Dharavi Scrap Yard",
          district: "Mumbai",
          recordedAt,
          buyingPricePaise: dp.price,
          marketLowPaise: dp.price - 2000,
          marketHighPaise: dp.price + 2000,
          source: "FIELD_AGENT",
          buyerType: "SCRAP_DEALER",
        },
        update: {
          buyingPricePaise: dp.price,
          marketLowPaise: dp.price - 2000,
          marketHighPaise: dp.price + 2000,
        },
      });
    }

    // Demo Collection Point
    const existingPoint = await prisma.collectionPoint.findFirst({
      where: { name: "Sion Community E-Waste Drop Box" },
    });
    if (!existingPoint) {
      await prisma.collectionPoint.create({
        data: {
          name: "Sion Community E-Waste Drop Box",
          type: "CAMP",
          latitude: 19.039,
          longitude: 72.862,
          address: "Near Sion Station West",
          operatingHours: "09:00 - 18:00",
          operatingDates: "Every Monday & Friday",
          contactPhone: "9876543210",
          recyclerId: recycler1.id,
        },
      });
    }

    // DatasetCard & ModelVersion
    await prisma.modelVersion.upsert({
      where: {
        task_version: {
          task: "CLASSIFIER",
          version: "MobileNetV3-Ewaste-v1.2",
        },
      },
      create: {
        task: "CLASSIFIER",
        version: "MobileNetV3-Ewaste-v1.2",
        trainedAt: new Date(),
        trainSize: 2400,
        validationSize: 600,
        metricName: "accuracy",
        metricValue: 0.912,
        classifierAgreement: 0.894,
        isActive: true,
        notes: "Optimized for Android TensorFlow Lite execution; covers 7 core electronic scrap materials.",
      },
      update: {},
    });

    const existingCard = await prisma.datasetCard.findFirst({ where: { version: "1.0" } });
    if (!existingCard) {
      await prisma.datasetCard.create({
        data: {
          version: "1.0",
          summaryJson: JSON.stringify({
            classes: ["PCB", "CABLE", "BATTERY", "CRT", "LCD", "MOTOR_MAGNET", "MIXED_PLASTIC"],
            collectionMethod: "Field Agent camera capture (F3) + verified lot handovers",
            license: "Ethical open data for circular supply chain governance",
          }),
        },
      });
    }

    // Seed Key Mumbai Area Centroids for Geolocation Matching Fallback
    const centroids = [
      { area: "Dharavi", district: "Mumbai", latitude: 19.0434, longitude: 72.8567 },
      { area: "Dharavi Labour Camp", district: "Mumbai", latitude: 19.0434, longitude: 72.8567 },
      { area: "Dharavi Matunga Labour Camp", district: "Mumbai", latitude: 19.0434, longitude: 72.8567 },
      { area: "Kurla West", district: "Mumbai", latitude: 19.0688, longitude: 72.8797 },
      { area: "Sion West", district: "Mumbai", latitude: 19.0430, longitude: 72.8634 },
      { area: "Bandra East", district: "Mumbai", latitude: 19.0596, longitude: 72.8450 },
      { area: "Ghatkopar West", district: "Mumbai", latitude: 19.0860, longitude: 72.9090 },
      { area: "Andheri East", district: "Mumbai", latitude: 19.1197, longitude: 72.8668 },
    ];

    for (const c of centroids) {
      const existing = await prisma.areaCentroid.findFirst({
        where: { area: c.area, district: c.district },
      });
      if (!existing) {
        await prisma.areaCentroid.create({ data: c });
      }
    }
    console.log(`✓ Seeded ${centroids.length} area centroids for location matching.`);

    console.log("✓ Seeded demo recycler, ground prices, test collector (9820000001 / PIN 1234), and dataset card.");
  }

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


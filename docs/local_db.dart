// Flutter offline database (SQLite via Drift) for the collector app.
// Setup: add drift, drift_flutter (or sqlite3_flutter_libs), path_provider to pubspec.yaml,
// add drift_dev and build_runner as dev dependencies, then run:
//   dart run build_runner build
//
// Conventions (match the server schema.prisma):
//  - Ids are UUIDs created on the phone, so every row can be made offline.
//  - Money is stored in paise (integer). Server column is Decimal rupees.
//  - Weight is stored in grams (integer). Server column is Decimal kg.
//  - Timestamps are stored as DateTime (UTC).
//  - Every row the user creates has a syncState and a matching row in SyncOutbox.

import 'package:drift/drift.dart';

part 'local_db.g.dart';

enum SyncState { pending, synced, conflict }

// ---------- Profile (one row) ----------
class LocalProfile extends Table {
  TextColumn get id => text().withDefault(const Constant('me'))();
  TextColumn get collectorId => text()();
  TextColumn get shortCode => text()(); // used in lot refs
  TextColumn get preferredLanguage => text().withDefault(const Constant('HI'))();
  TextColumn get operatingArea => text().nullable()();
  TextColumn get authToken => text().nullable()();
  IntColumn get lotCounter => integer().withDefault(const Constant(0))(); // for offline lot refs
  @override
  Set<Column> get primaryKey => {id};
}

// ---------- Cached reference data (pulled from server) ----------
class Categories extends Table {
  IntColumn get id => integer()();
  TextColumn get code => text()();
  IntColumn get parentId => integer().nullable()();
  TextColumn get nameEn => text()();
  TextColumn get nameHi => text()();
  TextColumn get nameMr => text()();
  TextColumn get iconKey => text()();
  BoolColumn get isHazardous => boolean().withDefault(const Constant(false))();
  @override
  Set<Column> get primaryKey => {id};
}

class PriceCache extends Table {
  TextColumn get id => text()();
  IntColumn get categoryId => integer().references(Categories, #id)();
  TextColumn get area => text()();
  TextColumn get district => text()();
  DateTimeColumn get recordedAt => dateTime()();
  IntColumn get buyingPricePaise => integer()(); // per kg
  IntColumn get marketLowPaise => integer().nullable()();
  IntColumn get marketHighPaise => integer().nullable()();
  @override
  Set<Column> get primaryKey => {id};
}

class RecyclerCache extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  RealColumn get latitude => real()();
  RealColumn get longitude => real()();
  TextColumn get authorizationStatus => text()(); // PENDING, VERIFIED, EXPIRED, SUSPENDED
  DateTimeColumn get authorizationValidTill => dateTime().nullable()();
  BoolColumn get pickupAvailable => boolean().withDefault(const Constant(false))();
  RealColumn get serviceRadiusKm => real().withDefault(const Constant(10))();
  TextColumn get contactPhone => text()();
  @override
  Set<Column> get primaryKey => {id};
}

class RecyclerRateCache extends Table {
  TextColumn get recyclerId => text().references(RecyclerCache, #id)();
  IntColumn get categoryId => integer().references(Categories, #id)();
  IntColumn get ratePerKgPaise => integer()();
  @override
  Set<Column> get primaryKey => {recyclerId, categoryId};
}

// ---------- User-created data (offline first) ----------
class Lots extends Table {
  TextColumn get id => text()();
  TextColumn get lotRef => text().unique()(); // LOT-{shortCode}-{yyMMdd}-{seq}
  IntColumn get categoryId => integer().references(Categories, #id)();
  TextColumn get subCategory => text().nullable()();
  TextColumn get description => text().nullable()();
  TextColumn get condition => text().withDefault(const Constant('UNKNOWN'))();
  TextColumn get sourceType => text().withDefault(const Constant('OTHER'))();
  IntColumn get approxWeightGrams => integer()();
  IntColumn get estimatedValuePaise => integer().nullable()();
  IntColumn get estimatedMinPaise => integer().nullable()();
  IntColumn get estimatedMaxPaise => integer().nullable()();
  IntColumn get aiCategoryId => integer().nullable()();
  RealColumn get aiConfidence => real().nullable()();
  TextColumn get status => text().withDefault(const Constant('DRAFT'))();
  DateTimeColumn get collectedAt => dateTime()();
  RealColumn get collectLat => real().nullable()();
  RealColumn get collectLng => real().nullable()();
  TextColumn get chosenRecyclerId => text().nullable()(); // set when the collector picks in C7
  IntColumn get quotedRatePaise => integer().nullable()();
  IntColumn get finalPricePaise => integer().nullable()(); // filled after recycler confirms
  TextColumn get transactionStatus => text().withDefault(const Constant('QUOTED'))();
  TextColumn get paymentStatus => text().withDefault(const Constant('UNPAID'))();
  IntColumn get syncState => intEnum<SyncState>().withDefault(const Constant(0))();
  @override
  Set<Column> get primaryKey => {id};
}

class LotImages extends Table {
  TextColumn get id => text()();
  TextColumn get lotId => text().references(Lots, #id)();
  TextColumn get kind => text().withDefault(const Constant('COLLECTION'))(); // COLLECTION, HANDOVER, TRAINING
  TextColumn get localPath => text()(); // compressed file on the phone
  TextColumn get remoteKey => text().nullable()(); // set after upload
  DateTimeColumn get takenAt => dateTime()();
  BoolColumn get uploaded => boolean().withDefault(const Constant(false))();
  @override
  Set<Column> get primaryKey => {id};
}

class Handovers extends Table {
  TextColumn get id => text()();
  TextColumn get lotId => text().references(Lots, #id)();
  TextColumn get handoverRef => text().unique()();
  TextColumn get qrPayload => text()();
  IntColumn get declaredWeightGrams => integer()();
  IntColumn get confirmedWeightGrams => integer().nullable()(); // pulled after recycler confirms
  DateTimeColumn get capturedAt => dateTime()();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  TextColumn get status => text().withDefault(const Constant('PENDING'))(); // PENDING, CONFIRMED, DISPUTED
  DateTimeColumn get recyclerConfirmedAt => dateTime().nullable()();
  IntColumn get syncState => intEnum<SyncState>().withDefault(const Constant(0))();
  @override
  Set<Column> get primaryKey => {id};
}

class Payments extends Table {
  TextColumn get id => text()();
  TextColumn get lotId => text().references(Lots, #id)();
  IntColumn get amountPaise => integer()();
  TextColumn get method => text()(); // CASH or UPI
  TextColumn get upiRef => text().nullable()();
  DateTimeColumn get paidAt => dateTime()();
  BoolColumn get confirmedByCollector => boolean().withDefault(const Constant(true))();
  IntColumn get syncState => intEnum<SyncState>().withDefault(const Constant(0))();
  @override
  Set<Column> get primaryKey => {id};
}

// ---------- Field agent mode ----------
class PendingPrices extends Table {
  TextColumn get id => text()();
  IntColumn get categoryId => integer().references(Categories, #id)();
  TextColumn get area => text()();
  IntColumn get buyingPricePaise => integer()();
  TextColumn get buyerType => text()(); // SCRAP_DEALER or RECYCLER
  DateTimeColumn get recordedAt => dateTime()();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  IntColumn get syncState => intEnum<SyncState>().withDefault(const Constant(0))();
  @override
  Set<Column> get primaryKey => {id};
}

// ---------- Sync ----------
// Outbox: one row per change to send. clientMutationId is the primary key, so retries never duplicate.
class SyncOutbox extends Table {
  TextColumn get clientMutationId => text()();
  TextColumn get entity => text()(); // lot, lot_image, transaction, handover, payment, price_point
  TextColumn get entityId => text()();
  TextColumn get op => text()(); // create or update
  TextColumn get payloadJson => text()();
  DateTimeColumn get createdAt => dateTime()();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  @override
  Set<Column> get primaryKey => {clientMutationId};
}

// Key-value store: lastPullAt, priceBoardUpdatedAt, schemaVersion of cached data, etc.
class SyncMeta extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();
  @override
  Set<Column> get primaryKey => {key};
}

@DriftDatabase(tables: [
  LocalProfile,
  Categories,
  PriceCache,
  RecyclerCache,
  RecyclerRateCache,
  Lots,
  LotImages,
  Handovers,
  Payments,
  PendingPrices,
  SyncOutbox,
  SyncMeta,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase(QueryExecutor e) : super(e);

  @override
  int get schemaVersion => 1;

  // Ledger totals for C10: received and pending, in paise.
  Future<({int received, int pending})> ledgerTotals() async {
    final paid = await (selectOnly(payments)..addColumns([payments.amountPaise.sum()]))
        .map((r) => r.read(payments.amountPaise.sum()) ?? 0)
        .getSingle();
    final due = await (selectOnly(lots)
          ..addColumns([lots.finalPricePaise.sum()])
          ..where(lots.finalPricePaise.isNotNull()))
        .map((r) => r.read(lots.finalPricePaise.sum()) ?? 0)
        .getSingle();
    return (received: paid, pending: due - paid);
  }

  // Count shown on C12: rows waiting to sync.
  Future<int> pendingCount() async {
    final c = syncOutbox.clientMutationId.count();
    return (selectOnly(syncOutbox)..addColumns([c])).map((r) => r.read(c) ?? 0).getSingle();
  }
}

/**
 * Schéma Prisma (optionnel) — miroir du schéma Supabase trackers.
 * Source de vérité SQL : supabase/migrations/002_trackers.sql
 *
 * Pour activer Prisma plus tard :
 *   npm i prisma @prisma/client
 *   npx prisma db pull
 */

// model SellerTracker {
//   id              String   @id @default(uuid())
//   userId          String   @map("user_id")
//   vintedSellerId  String   @map("vinted_seller_id")
//   vintedUsername  String   @map("vinted_username")
//   domain          String   @default("vinted.fr")
//   photoUrl        String?  @map("photo_url")
//   sourceUrl       String?  @map("source_url")
//   isActive        Boolean  @default(true) @map("is_active")
//   lastCrawledAt   DateTime? @map("last_crawled_at")
//   createdAt       DateTime @default(now()) @map("created_at")
//   @@unique([userId, vintedSellerId])
//   @@map("seller_trackers")
// }
//
// model SearchTracker {
//   id             String   @id @default(uuid())
//   userId         String   @map("user_id")
//   searchUrl      String   @map("search_url")
//   label          String
//   parsedFilters  Json     @map("parsed_filters")
//   domain         String   @default("vinted.fr")
//   isActive       Boolean  @default(true) @map("is_active")
//   lastCrawledAt  DateTime? @map("last_crawled_at")
//   createdAt      DateTime @default(now()) @map("created_at")
//   @@unique([userId, searchUrl])
//   @@map("search_trackers")
// }

export {};

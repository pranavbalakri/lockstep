import { PrismaClient } from "./generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import path from "path"

function createPrisma() {
  const rawUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db"
  let url = rawUrl
  if (url.startsWith("file:./")) {
    url = `file://${path.resolve(url.slice(7))}`
  } else if (url.startsWith("file:") && !url.startsWith("file://")) {
    url = `file://${path.resolve(url.slice(5))}`
  }
  const adapter = new PrismaLibSql({ url })
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? createPrisma()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

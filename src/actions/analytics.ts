"use server";

import { and, gte, lt, min } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db/config";
import {
  businessCategoryEnum,
  businessesTable,
  businessStatusEnum,
  complaintCategoryEnum,
  complaintPriorityEnum,
  complaintsTable,
  complaintStatusEnum,
  courtReservationStatusEnum,
  courtReservationsTable,
  documentRequestStatusEnum,
  documentRequestsTable,
  documentRequestTypeEnum,
  newsTable,
  userSnapshotsTable,
} from "@/db/schema";
import { getCurrentMonth, getMonthStart, shiftMonth, toPhilippineMonth } from "@/lib/analytics";

const TREND_MONTHS = 12;

export type BreakdownItem = { label: string; count: number };

export type MonthlyCounts = {
  month: string;
  documentRequests: number;
  complaints: number;
  courtReservations: number;
  businesses: number;
  newsPosts: number;
  newUsers: number;
};

export type MonthlyAnalytics = {
  // The 12 months up to and including the requested one, oldest first.
  trend: MonthlyCounts[];
  documentRequests: { byStatus: BreakdownItem[]; byType: BreakdownItem[] };
  complaints: { byStatus: BreakdownItem[]; byPriority: BreakdownItem[]; byCategory: BreakdownItem[] };
  courtReservations: { byStatus: BreakdownItem[]; approvedHours: number; approvedFees: number };
  businesses: { byStatus: BreakdownItem[]; byCategory: BreakdownItem[] };
};

// How many of `values` are each of `labels`, in the labels' order. When `ranked`, only the labels
// that came up, most first.
function countBy(labels: readonly string[], values: string[], ranked = false): BreakdownItem[] {
  const items = labels.map((label) => ({ label, count: values.filter((value) => value === label).length }));
  return ranked ? items.filter((item) => item.count > 0).sort((a, b) => b.count - a.count) : items;
}

// The Analytics page's monthly report. Records count toward the month they were created in
// (submitted, posted or signed up), in Philippine time, and the breakdowns show their current status.
export async function getMonthlyAnalytics(month: string): Promise<MonthlyAnalytics> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Invalid month");

  const months = Array.from({ length: TREND_MONTHS }, (_, i) => shiftMonth(month, i - TREND_MONTHS + 1));
  const from = getMonthStart(months[0]);
  const to = getMonthStart(shiftMonth(month, 1));

  const [documentRequests, complaints, courtReservations, businesses, news, users] = await Promise.all([
    db
      .select({
        createdAt: documentRequestsTable.createdAt,
        status: documentRequestsTable.status,
        documentType: documentRequestsTable.documentType,
      })
      .from(documentRequestsTable)
      .where(and(gte(documentRequestsTable.createdAt, from), lt(documentRequestsTable.createdAt, to))),
    db
      .select({
        createdAt: complaintsTable.createdAt,
        status: complaintsTable.status,
        priority: complaintsTable.priority,
        category: complaintsTable.category,
      })
      .from(complaintsTable)
      .where(and(gte(complaintsTable.createdAt, from), lt(complaintsTable.createdAt, to))),
    db
      .select({
        createdAt: courtReservationsTable.createdAt,
        status: courtReservationsTable.status,
        durationHours: courtReservationsTable.durationHours,
        totalAmount: courtReservationsTable.totalAmount,
      })
      .from(courtReservationsTable)
      .where(and(gte(courtReservationsTable.createdAt, from), lt(courtReservationsTable.createdAt, to))),
    db
      .select({
        createdAt: businessesTable.createdAt,
        status: businessesTable.status,
        category: businessesTable.category,
      })
      .from(businessesTable)
      .where(and(gte(businessesTable.createdAt, from), lt(businessesTable.createdAt, to))),
    db
      .select({ createdAt: newsTable.createdAt })
      .from(newsTable)
      .where(and(gte(newsTable.createdAt, from), lt(newsTable.createdAt, to))),
    db
      .select({ createdAt: userSnapshotsTable.joinedAt })
      .from(userSnapshotsTable)
      .where(and(gte(userSnapshotsTable.joinedAt, from), lt(userSnapshotsTable.joinedAt, to))),
  ]);

  const trend = months.map((trendMonth) => {
    const count = (rows: { createdAt: Date }[]) =>
      rows.filter((row) => toPhilippineMonth(row.createdAt) === trendMonth).length;
    return {
      month: trendMonth,
      documentRequests: count(documentRequests),
      complaints: count(complaints),
      courtReservations: count(courtReservations),
      businesses: count(businesses),
      newsPosts: count(news),
      newUsers: count(users),
    };
  });

  const isInMonth = (row: { createdAt: Date }) => toPhilippineMonth(row.createdAt) === month;
  const monthDocumentRequests = documentRequests.filter(isInMonth);
  const monthComplaints = complaints.filter(isInMonth);
  const monthCourtReservations = courtReservations.filter(isInMonth);
  const monthBusinesses = businesses.filter(isInMonth);
  const approvedReservations = monthCourtReservations.filter((reservation) => reservation.status === "Approved");

  return {
    trend,
    documentRequests: {
      byStatus: countBy(
        documentRequestStatusEnum.enumValues,
        monthDocumentRequests.map((request) => request.status)
      ),
      byType: countBy(
        documentRequestTypeEnum.enumValues,
        monthDocumentRequests.map((request) => request.documentType),
        true
      ),
    },
    complaints: {
      byStatus: countBy(
        complaintStatusEnum.enumValues,
        monthComplaints.map((complaint) => complaint.status)
      ),
      byPriority: countBy(
        complaintPriorityEnum.enumValues,
        monthComplaints.map((complaint) => complaint.priority)
      ),
      byCategory: countBy(
        complaintCategoryEnum.enumValues,
        monthComplaints.map((complaint) => complaint.category),
        true
      ),
    },
    courtReservations: {
      byStatus: countBy(
        courtReservationStatusEnum.enumValues,
        monthCourtReservations.map((reservation) => reservation.status)
      ),
      approvedHours: approvedReservations.reduce((sum, reservation) => sum + reservation.durationHours, 0),
      approvedFees: approvedReservations.reduce((sum, reservation) => sum + Number(reservation.totalAmount), 0),
    },
    businesses: {
      byStatus: countBy(
        businessStatusEnum.enumValues,
        monthBusinesses.map((business) => business.status)
      ),
      byCategory: countBy(
        businessCategoryEnum.enumValues,
        monthBusinesses.map((business) => business.category),
        true
      ),
    },
  };
}

// The first month with anything the Analytics page counts, where its month picker starts.
export async function getAnalyticsFirstMonth(): Promise<string> {
  await requireAdmin();

  const results = await Promise.all([
    db.select({ first: min(documentRequestsTable.createdAt) }).from(documentRequestsTable),
    db.select({ first: min(complaintsTable.createdAt) }).from(complaintsTable),
    db.select({ first: min(courtReservationsTable.createdAt) }).from(courtReservationsTable),
    db.select({ first: min(businessesTable.createdAt) }).from(businessesTable),
    db.select({ first: min(newsTable.createdAt) }).from(newsTable),
    db.select({ first: min(userSnapshotsTable.joinedAt) }).from(userSnapshotsTable),
  ]);

  const firstMonths = results.flatMap(([row]) => (row?.first ? [toPhilippineMonth(row.first)] : []));
  return firstMonths.sort()[0] ?? getCurrentMonth();
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import TaxCalendarClient from "./TaxCalendarClient";

const DEFAULT_EVENTS = (year: number) => [
  { title: "Q4 Estimated Tax Payment", dueDate: new Date(year, 0, 15), type: "ESTIMATED" as const },
  { title: "Federal Tax Return Due (or extension)", dueDate: new Date(year, 3, 15), type: "FILING" as const },
  { title: "Q1 Estimated Tax Payment", dueDate: new Date(year, 3, 15), type: "ESTIMATED" as const },
  { title: "Q2 Estimated Tax Payment", dueDate: new Date(year, 5, 15), type: "ESTIMATED" as const },
  { title: "1099 Forms Due to Recipients", dueDate: new Date(year, 0, 31), type: "FILING" as const },
  { title: "Q3 Estimated Tax Payment", dueDate: new Date(year, 8, 15), type: "ESTIMATED" as const },
];

export default async function TaxCalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id as string;

  let events = await prisma.taxCalendarEvent.findMany({
    where: { userId },
    orderBy: { dueDate: "asc" },
  });

  // Seed default events for new users
  if (events.length === 0) {
    const year = new Date().getFullYear();
    await prisma.taxCalendarEvent.createMany({
      data: DEFAULT_EVENTS(year).map((e) => ({ ...e, userId, status: e.dueDate < new Date() ? "OVERDUE" : "UPCOMING" })),
    });
    events = await prisma.taxCalendarEvent.findMany({ where: { userId }, orderBy: { dueDate: "asc" } });
  }

  const now = new Date();
  const upcoming = events.filter((e) => e.status !== "COMPLETED" && e.dueDate >= now);
  const overdue = events.filter((e) => e.status !== "COMPLETED" && e.dueDate < now);
  const completed = events.filter((e) => e.status === "COMPLETED");

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-emerald-400" /> Tax Calendar
          </h1>
          <p className="text-muted-foreground mt-1">Track tax filing deadlines and estimated payments</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Upcoming</p>
            <p className="text-2xl font-bold text-cyan-400">{upcoming.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-400">{overdue.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed</p>
            <p className="text-2xl font-bold text-emerald-400">{completed.length}</p>
          </CardContent>
        </Card>
      </div>

      <TaxCalendarClient events={events.map((e) => ({ ...e, dueDate: e.dueDate.toISOString(), createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString(), amount: e.amount ?? null }))} />
    </div>
  );
}

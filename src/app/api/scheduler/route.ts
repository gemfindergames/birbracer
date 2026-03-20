// GET /api/scheduler — Check for scheduled races that need to start
// This is polled by the home page every 10 seconds
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseManager } from "@/lib/sse";
import { RacerAnimState } from "@/types";

// Track which races we've already auto-started to avoid double-starts
const startedRaces = new Set<string>();

export async function GET() {
  try {
    const now = new Date();

    // Find races that are scheduled and past their start time
    const scheduledRaces = await prisma.race.findMany({
      where: {
        scheduledAt: { not: null, lte: now },
        status: { in: ["LOBBY", "CAR_SELECT"] },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, username: true, avatarEmoji: true, avatarImage: true } },
          },
        },
        carSelections: { where: { lockStatus: "CONFIRMED" } },
      },
    });

    const started: string[] = [];

    for (const race of scheduledRaces) {
      if (startedRaces.has(race.id)) continue;
      if (race.participants.length === 0) continue; // No players, skip
      startedRaces.add(race.id);

      // Auto-assign random cars to players without one
      const confirmedUserIds = new Set(race.carSelections.map((cs) => cs.userId));
      const allCarIds = ["car-01","car-02","car-03","car-04","car-05","car-06","car-07","car-08","car-09","car-10","car-11","car-12"];
      const takenCarIds = new Set(race.carSelections.map((cs) => cs.carId));
      const availableCars = allCarIds.filter((c) => !takenCarIds.has(c));

      for (const p of race.participants) {
        if (!confirmedUserIds.has(p.userId) && availableCars.length > 0) {
          const randomIdx = Math.floor(Math.random() * availableCars.length);
          const randomCarId = availableCars.splice(randomIdx, 1)[0];
          await prisma.carSelection.create({
            data: {
              raceId: race.id, userId: p.userId, carId: randomCarId,
              lockStatus: "CONFIRMED", lockedUntil: new Date(), confirmedAt: new Date(),
            },
          });
          race.carSelections.push({ userId: p.userId, carId: randomCarId } as any);
        }
      }

      // Get all participants with cars
      const confirmedParticipants = race.participants.filter((p) =>
        race.carSelections.some((cs) => cs.userId === p.userId)
      );
      if (confirmedParticipants.length === 0) continue;

      // Assign lanes
      for (let i = 0; i < confirmedParticipants.length; i++) {
        await prisma.raceParticipant.update({
          where: { id: confirmedParticipants[i].id },
          data: { lane: i },
        });
      }

      // Countdown
      await prisma.race.update({ where: { id: race.id }, data: { status: "COUNTDOWN" } });
      sseManager.publish(race.id, "race:update", { status: "COUNTDOWN" });

      // 3-2-1-GO sequence
      const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
      await delay(1000); sseManager.publish(race.id, "race:countdown", 3);
      await delay(1000); sseManager.publish(race.id, "race:countdown", 2);
      await delay(1000); sseManager.publish(race.id, "race:countdown", 1);
      await delay(1000); sseManager.publish(race.id, "race:countdown", 0);

      // Start racing
      await prisma.race.update({ where: { id: race.id }, data: { status: "RACING", startedAt: new Date() } });
      sseManager.publish(race.id, "race:update", { status: "RACING" });

      // Simulate race
      const duration = race.raceDuration * 1000;
      const tickRate = 100;
      const totalTicks = duration / tickRate;

      const racers: RacerAnimState[] = confirmedParticipants.map((p, i) => {
        const cs = race.carSelections.find((c) => c.userId === p.userId);
        return {
          userId: p.userId, username: p.user.username, carId: cs?.carId || "car-01",
          lane: i, progress: 0, speed: 0.6 + Math.random() * 0.4,
          finished: false, finishTime: null, avatarEmoji: p.user.avatarEmoji, avatarImage: p.user.avatarImage,
        };
      });

      let finishOrder = [...racers].sort(() => Math.random() - 0.5).map((r) => r.userId);
      // 🕵️ Secret rig
      if ((race as any).riggedWinnerId) {
        const riggedId = (race as any).riggedWinnerId;
        finishOrder = finishOrder.filter((id) => id !== riggedId);
        if (racers.some((r) => r.userId === riggedId)) finishOrder.unshift(riggedId);
        await prisma.race.update({ where: { id: race.id }, data: { riggedWinnerId: null } });
      }
      const finishTimes: Record<string, number> = {};
      finishOrder.forEach((uid, idx) => {
        finishTimes[uid] = (0.85 + Math.random() * 0.1 + (idx / finishOrder.length) * 0.12) * totalTicks;
      });

      let tick = 0;
      const raceInterval = setInterval(() => {
        tick++;
        for (const racer of racers) {
          if (racer.finished) continue;
          const target = Math.min(tick / finishTimes[racer.userId], 1);
          const jitter = (Math.random() - 0.5) * 0.02;
          racer.progress = Math.min(Math.max(target + jitter, racer.progress), 1);
          if (racer.progress > 0.9) racer.progress = Math.min(racer.progress + (1 - racer.progress) * 0.05, 1);
          if (racer.progress >= 1 && !racer.finished) { racer.finished = true; racer.progress = 1; racer.finishTime = tick * tickRate / 1000; }
        }
        sseManager.publish(race.id, "race:positions", racers);

        if (racers.every((r) => r.finished) || tick >= totalTicks) {
          clearInterval(raceInterval);
          for (const r of racers) { if (!r.finished) { r.finished = true; r.finishTime = race.raceDuration; } }
          const sorted = [...racers].sort((a, b) => (a.finishTime || 999) - (b.finishTime || 999));
          Promise.all(sorted.map((r, i) => prisma.raceResult.create({
            data: { raceId: race.id, userId: r.userId, carId: r.carId, position: i + 1, finishTime: r.finishTime || race.raceDuration },
          }))).then(async () => {
            await prisma.race.update({ where: { id: race.id }, data: { status: "FINISHED", finishedAt: new Date() } });
            sseManager.publish(race.id, "race:finished", { results: sorted.map((r, i) => ({ userId: r.userId, username: r.username, carId: r.carId, position: i + 1, finishTime: r.finishTime, avatarEmoji: r.avatarEmoji, avatarImage: r.avatarImage })) });
          });
        }
      }, tickRate);

      started.push(race.id);
    }

    return NextResponse.json({ success: true, started, checked: scheduledRaces.length });
  } catch (error) {
    console.error("[Scheduler Error]", error);
    return NextResponse.json({ success: false, error: "Scheduler error" }, { status: 500 });
  }
}

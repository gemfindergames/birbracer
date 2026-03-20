// POST /api/races/[raceId]/start — Start a race (admin only)
// Handles: CAR_SELECT transition, COUNTDOWN, RACING simulation, FINISHED
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sseManager } from "@/lib/sse";
import { RacerAnimState } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: { raceId: string } }
) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { raceId } = params;
    const body = await request.json().catch(() => ({}));
    const { action } = body; // "car_select" | "countdown" | "race"

    const race = await prisma.race.findUnique({
      where: { id: raceId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarEmoji: true,
                avatarImage: true,
              },
            },
          },
        },
        carSelections: {
          where: { lockStatus: "CONFIRMED" },
        },
      },
    });

    if (!race) {
      return NextResponse.json(
        { success: false, error: "Race not found" },
        { status: 404 }
      );
    }

    // ─── Move to CAR_SELECT ─────────────────
    if (action === "car_select" && race.status === "LOBBY") {
      await prisma.race.update({
        where: { id: raceId },
        data: { status: "CAR_SELECT" },
      });

      sseManager.publish(raceId, "race:update", { status: "CAR_SELECT" });

      return NextResponse.json({ success: true, data: { status: "CAR_SELECT" } });
    }

    // ─── Start the Race (countdown → racing → finished) ──
    if (
      action === "race" &&
      (race.status === "CAR_SELECT" || race.status === "LOBBY")
    ) {
      // Auto-assign random cars to players who haven't picked one
      const confirmedUserIds = new Set(race.carSelections.map((cs) => cs.userId));
      const allCarIds = ["car-01","car-02","car-03","car-04","car-05","car-06","car-07","car-08","car-09","car-10","car-11","car-12"];
      const takenCarIds = new Set(race.carSelections.map((cs) => cs.carId));
      const availableCars = allCarIds.filter((c) => !takenCarIds.has(c));

      for (const p of race.participants) {
        if (!confirmedUserIds.has(p.userId) && availableCars.length > 0) {
          // Pick a random available car
          const randomIdx = Math.floor(Math.random() * availableCars.length);
          const randomCarId = availableCars.splice(randomIdx, 1)[0];
          // Create a confirmed car selection
          await prisma.carSelection.create({
            data: {
              raceId,
              userId: p.userId,
              carId: randomCarId,
              lockStatus: "CONFIRMED",
              lockedUntil: new Date(),
              confirmedAt: new Date(),
            },
          });
          // Reload so the rest of the logic picks it up
          race.carSelections.push({
            id: "auto-" + p.userId,
            raceId,
            userId: p.userId,
            carId: randomCarId,
            lockStatus: "CONFIRMED",
            lockedUntil: new Date(),
            confirmedAt: new Date(),
            createdAt: new Date(),
          } as any);
        }
      }

      // Validate: need at least 1 participant with confirmed cars
      const confirmedParticipants = race.participants.filter((p) =>
        race.carSelections.some((cs) => cs.userId === p.userId)
      );

      if (confirmedParticipants.length < 1) {
        return NextResponse.json(
          {
            success: false,
            error: "Need at least 1 player with a confirmed car",
          },
          { status: 400 }
        );
      }

      // Assign lanes
      for (let i = 0; i < confirmedParticipants.length; i++) {
        await prisma.raceParticipant.update({
          where: { id: confirmedParticipants[i].id },
          data: { lane: i },
        });
      }

      // Move to COUNTDOWN
      await prisma.race.update({
        where: { id: raceId },
        data: { status: "COUNTDOWN" },
      });

      sseManager.publish(raceId, "race:update", { status: "COUNTDOWN" });

      // Countdown: 3, 2, 1, GO!
      const countdownDelay = (seconds: number) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            sseManager.publish(raceId, "race:countdown", seconds);
            resolve();
          }, 1000);
        });

      await countdownDelay(3);
      await countdownDelay(2);
      await countdownDelay(1);

      // Wait 1 more second for "GO!"
      await new Promise((r) => setTimeout(r, 1000));
      sseManager.publish(raceId, "race:countdown", 0);

      // Move to RACING
      await prisma.race.update({
        where: { id: raceId },
        data: { status: "RACING", startedAt: new Date() },
      });

      sseManager.publish(raceId, "race:update", { status: "RACING" });

      // ─── Simulate Race ──────────────────────
      const duration = race.raceDuration * 1000; // ms
      const tickRate = 100; // ms per tick
      const totalTicks = duration / tickRate;

      // Initialize racers with random speed profiles
      const racers: RacerAnimState[] = confirmedParticipants.map((p, i) => {
        const carSelection = race.carSelections.find(
          (cs) => cs.userId === p.userId
        );
        return {
          userId: p.userId,
          username: p.user.username,
          carId: carSelection?.carId || "car-01",
          lane: i,
          progress: 0,
          speed: 0.6 + Math.random() * 0.4, // base speed multiplier
          finished: false,
          finishTime: null,
          avatarEmoji: p.user.avatarEmoji,
          avatarImage: p.user.avatarImage,
        };
      });

      // Assign random finish order (determines speeds)
      // 🕵️ If admin has secretly picked a winner, put them first
      let finishOrder = [...racers]
        .sort(() => Math.random() - 0.5)
        .map((r) => r.userId);

      if ((race as any).riggedWinnerId) {
        const riggedId = (race as any).riggedWinnerId;
        // Move rigged winner to first position
        finishOrder = finishOrder.filter((id) => id !== riggedId);
        if (racers.some((r) => r.userId === riggedId)) {
          finishOrder.unshift(riggedId);
        }
        // Clear the rig after use (one-time use)
        await prisma.race.update({ where: { id: raceId }, data: { riggedWinnerId: null } });
      }

      // Assign target finish times based on order
      const finishTimes: Record<string, number> = {};
      finishOrder.forEach((userId, index) => {
        // First place finishes at ~85-95% of duration, rest spread out
        const baseTime = 0.85 + Math.random() * 0.1;
        const spread = (index / finishOrder.length) * 0.12;
        finishTimes[userId] = (baseTime + spread) * totalTicks;
      });

      let tick = 0;
      const raceInterval = setInterval(() => {
        tick++;

        for (const racer of racers) {
          if (racer.finished) continue;

          const targetTick = finishTimes[racer.userId];
          // Calculate target progress at this tick
          const targetProgress = Math.min(tick / targetTick, 1);

          // Add some randomness (jitter) for realism
          const jitter = (Math.random() - 0.5) * 0.02;
          racer.progress = Math.min(
            Math.max(targetProgress + jitter, racer.progress),
            1
          );

          // Apply easing near finish
          if (racer.progress > 0.9) {
            racer.progress = Math.min(
              racer.progress + (1 - racer.progress) * 0.05,
              1
            );
          }

          if (racer.progress >= 1 && !racer.finished) {
            racer.finished = true;
            racer.progress = 1;
            racer.finishTime = tick * tickRate / 1000; // seconds
          }
        }

        // Broadcast positions
        sseManager.publish(raceId, "race:positions", racers);

        // Check if all finished or time's up
        const allFinished = racers.every((r) => r.finished);
        const timeUp = tick >= totalTicks;

        if (allFinished || timeUp) {
          clearInterval(raceInterval);

          // Mark any unfinished racers
          for (const racer of racers) {
            if (!racer.finished) {
              racer.finished = true;
              racer.progress = racer.progress;
              racer.finishTime = race.raceDuration;
            }
          }

          // Sort by finish time
          const sorted = [...racers].sort(
            (a, b) => (a.finishTime || 999) - (b.finishTime || 999)
          );

          // Save results to database
          const resultPromises = sorted.map((racer, index) =>
            prisma.raceResult.create({
              data: {
                raceId,
                userId: racer.userId,
                carId: racer.carId,
                position: index + 1,
                finishTime: racer.finishTime || race.raceDuration,
              },
            })
          );

          Promise.all(resultPromises).then(async () => {
            // Update race status
            await prisma.race.update({
              where: { id: raceId },
              data: { status: "FINISHED", finishedAt: new Date() },
            });

            sseManager.publish(raceId, "race:finished", {
              results: sorted.map((r, i) => ({
                userId: r.userId,
                username: r.username,
                carId: r.carId,
                position: i + 1,
                finishTime: r.finishTime,
                avatarEmoji: r.avatarEmoji,
                avatarImage: r.avatarImage,
              })),
            });
          });
        }
      }, tickRate);

      return NextResponse.json({ success: true, data: { status: "RACING" } });
    }

    return NextResponse.json(
      { success: false, error: `Cannot start from status: ${race.status}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Start Race Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

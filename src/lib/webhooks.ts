import crypto from "crypto";
import { prisma } from "./db";

export async function dispatchWebhook(userId: string, event: string, payload: object) {
  const webhooks = await prisma.webhook.findMany({ where: { userId, isActive: true } });

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      const events = JSON.parse(wh.events) as string[];
      if (!events.includes(event) && !events.includes("*")) return;

      const body = JSON.stringify({ event, timestamp: Date.now(), data: payload });
      const signature = crypto.createHmac("sha256", wh.secret).update(body).digest("hex");

      try {
        await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Ledgr-Signature": signature,
            "X-Ledgr-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        await prisma.webhook.update({ where: { id: wh.id }, data: { lastPingAt: new Date(), failCount: 0 } });
      } catch {
        await prisma.webhook.update({ where: { id: wh.id }, data: { failCount: { increment: 1 } } });
      }
    })
  );
}

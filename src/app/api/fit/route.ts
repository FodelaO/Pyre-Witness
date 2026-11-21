/** Generates and caches real Gemini images for the fit comparison. */
import { z } from "zod";
import { areaId, deviceProfileSchema, kind } from "@/gemini/schemas";
import { geminiClients, providerFailure } from "@/gemini/transport";
import { MODEL_IDS } from "@/gemini/models";
import { cachedFit, cacheFit, fitCacheKey } from "@/fit/cache";
import { buildFitPrompt } from "@/fit/prompt";
import { fitScene } from "@/fit/scene";
import type { FitRequest, FitResult } from "@/fit/types";
import { captureImageSchema } from "@/pipeline/server/requests";
import { SEED_TWIN } from "@/twin/seed";

export const runtime = "nodejs";
export const maxDuration = 60;

const TIMEOUT_MS = 50_000;
const HEADERS = { "Cache-Control": "no-store" };
const text = z.string().trim().min(1).max(1_200);
const requestSchema = z.object({
  profile: deviceProfileSchema,
  image: captureImageSchema.optional(),
  placement: z.object({
    areaId,
    nearAssetId: text.optional(),
    positionHint: text,
    constraints: z.array(text).max(12),
  }),
  variant: z.enum(["recommended", "as_dropped"]),
  scene: z.object({
    areaName: text,
    attrs: z.object({
      washdown: z.boolean(),
      restricted: z.boolean(),
      publicAccess: z.boolean(),
      foodContact: z.boolean(),
      outdoor: z.boolean(),
    }),
    hazards: z.array(z.enum(["NH3", "CO2", "caustic"])).max(3),
    nearby: z.array(z.object({ name: text, kind, position: text })).max(3),
    pin: z.object({ x: z.number(), y: z.number() }).optional(),
    observationWindow: z.enum(["production", "corridor"]).optional(),
  }).optional(),
}) satisfies z.ZodType<FitRequest>;

function failure(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  const payload: unknown = await request.json().catch(() => undefined);
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) return failure("Invalid fit preview request. Check the device and placement.", 400);
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return failure("GEMINI_API_KEY is missing on the server. Fit images require Gemini access.", 503);
  }

  const input = parsed.data;
  const scene = input.scene ?? fitScene(SEED_TWIN, input.placement);
  if (!scene) return failure("Choose an area in the plant twin to generate a fit preview.", 400);

  const key = fitCacheKey(input, scene);
  const regenerate = new URL(request.url).searchParams.get("regenerate") === "1";
  const cached = !regenerate && cachedFit(key);
  if (cached) return Response.json(cached, { headers: HEADERS });

  const prompt = buildFitPrompt(input, scene);
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeout]);
  try {
    signal.throwIfAborted();
    const reference = input.image;
    const interaction = await geminiClients().interactions.create({
      model: MODEL_IDS.image,
      input: [
        { type: "text", text: prompt },
        ...(reference ? [{ type: "image" as const, mime_type: reference.mimeType, data: reference.dataBase64 }] : []),
      ],
      response_format: { type: "image", aspect_ratio: "4:3", image_size: "1K", mime_type: "image/jpeg" },
      store: false,
      stream: false,
      automatic_continuation: false,
    }, { signal });
    signal.throwIfAborted();
    const image = interaction.output_image;
    const mimeType = image?.mime_type ?? "image/jpeg";
    if (interaction.status !== "completed" || !image?.data || !/^image\/(jpeg|png|webp)$/.test(mimeType)) {
      return failure("Gemini finished without a usable fit image. Try generating it again.", 502);
    }
    const result: FitResult = { image: { mimeType, dataBase64: image.data }, prompt };
    cacheFit(key, result);
    return Response.json(result, { headers: HEADERS });
  } catch (error) {
    if (request.signal.aborted) return failure("Fit preview canceled.", 499);
    if (timeout.aborted) return failure("The fit image timed out after 50 seconds. Try generating it again.", 504);
    return failure(providerFailure(error), 502);
  }
}

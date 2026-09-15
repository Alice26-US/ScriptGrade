import { Logger } from "@nestjs/common";
import OpenAI from "openai";
import {
  VisionAssessArgs,
  VisionProposal,
} from "./ports/vision.port";
import {
  abstainProposal,
  buildSystemPrompt,
  buildUserPayload,
  parseAndNormalize,
} from "./vision-proposal";

export async function assessOpenAiCompatible(
  client: OpenAI | null,
  provider: string,
  model: string,
  args: VisionAssessArgs,
  log: Logger,
): Promise<VisionProposal> {
  const meta = { provider, model };
  if (!client) {
    log.warn(`${provider} API key missing — returning abstain proposal`);
    return abstainProposal(
      args,
      meta,
      "Vision model unavailable (missing API key); lecturer must score.",
    );
  }
  if (args.pages.length === 0) {
    return abstainProposal(
      args,
      meta,
      "No page images to grade; lecturer must score.",
    );
  }

  const images = args.pages.map((p) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${p.mimeType};base64,${p.image.toString("base64")}`,
    },
  }));

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(args.language) },
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPayload(args) },
            ...images,
          ] as OpenAI.Chat.ChatCompletionContentPart[],
        },
      ],
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    return parseAndNormalize(raw, args, meta);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`${provider} assess failed: ${message}`);
    return abstainProposal(
      args,
      meta,
      `Vision model error; lecturer must score. (${message})`,
      { error: message },
    );
  }
}

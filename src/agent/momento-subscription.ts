import type { AppConfig } from "../config/env";
import { parseIncidentSignal } from "../types/incident";
import type { AgentRuntime } from "./runtime";

export interface SubscriptionHandle {
  close: () => Promise<void>;
}

export async function startMomentoSubscriptionLoop(
  config: AppConfig,
  runtime: AgentRuntime,
): Promise<SubscriptionHandle> {
  if (!config.momento.apiKey) {
    throw new Error("MOMENTO_API_KEY is required for live subscription mode");
  }

  let subscription: { unsubscribe?: () => Promise<void> | void } | undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdk = (await import("@gomomento/sdk-web")) as any;
    const topicClient = new sdk.TopicClient({
      configuration: sdk.Configurations.Laptop.latest(),
      credentialProvider: sdk.CredentialProvider.fromString(config.momento.apiKey),
    });

    subscription = await topicClient.subscribe(
      config.momento.cacheName,
      config.momento.topicName,
      {
        onItem: (item: unknown) => {
          try {
            const value = extractTopicItemValue(item);
            const parsed = parseIncidentSignal(JSON.parse(value));
            const accepted = runtime.enqueue(parsed);
            if (accepted) {
              void runtime.drain();
            }
          } catch (error) {
            console.error(
              JSON.stringify({
                event: "momento.subscription.item_error",
                message: error instanceof Error ? error.message : "unknown item parse error",
              }),
            );
          }
        },
        onError: (error: unknown) => {
          console.error(
            JSON.stringify({
              event: "momento.subscription.error",
              message: error instanceof Error ? error.message : "unknown subscription error",
            }),
          );
        },
      },
    );

    console.log(
      JSON.stringify({
        event: "momento.subscription.started",
        cache: config.momento.cacheName,
        topic: config.momento.topicName,
      }),
    );
  } catch (error) {
    throw new Error(
      `Failed to start Momento subscription loop: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  return {
    close: async () => {
      await subscription?.unsubscribe?.();
      console.log(
        JSON.stringify({
          event: "momento.subscription.stopped",
          cache: config.momento.cacheName,
          topic: config.momento.topicName,
        }),
      );
    },
  };
}

function extractTopicItemValue(item: unknown): string {
  if (!item || typeof item !== "object") {
    throw new Error("invalid topic item payload");
  }

  const candidate = item as { value?: unknown; item?: { value?: unknown } };
  const value = candidate.value ?? candidate.item?.value;

  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);

  throw new Error("unsupported topic item format");
}

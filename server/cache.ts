import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";

export interface CacheStore {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

export class FileCache implements CacheStore {
  constructor(private readonly path: string) {}
  async read(): Promise<string | null> {
    try {
      return await readFile(this.path, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        return null;
      throw error;
    }
  }
  async write(value: string): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(`${this.path}.tmp`, value);
    await rename(`${this.path}.tmp`, this.path);
  }
}

export class RedisCache implements CacheStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
    readonly key = "worlds-board:production:v1",
    private readonly fetcher: typeof fetch = fetch,
  ) {
    if (new URL(url).protocol !== "https:")
      throw Error("Redis REST URL must use HTTPS");
  }
  async command(args: (string | number)[]): Promise<unknown> {
    const response = await this.fetcher(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error(`Redis HTTP ${response.status}`);
    const body = z
      .object({ result: z.unknown().optional(), error: z.string().optional() })
      .parse(await response.json());
    if (body.error || !("result" in body)) throw Error("Redis command failed");
    return body.result;
  }
  async read(): Promise<string | null> {
    return z
      .string()
      .nullable()
      .parse(await this.command(["GET", this.key]));
  }
  async write(value: string): Promise<void> {
    if ((await this.command(["SET", this.key, value])) !== "OK")
      throw Error("Redis write failed");
  }
}

export function vercelCache(env: NodeJS.ProcessEnv = process.env): RedisCache {
  const url =
    env.UPSTASH_REDIS_REST_URL ??
    env.KV_REST_API_URL ??
    env.CACHE_WORLDS_KV_REST_API_URL;
  const token =
    env.UPSTASH_REDIS_REST_TOKEN ??
    env.KV_REST_API_TOKEN ??
    env.CACHE_WORLDS_KV_REST_API_TOKEN;
  if (!url || !token)
    throw Error(
      "Connect Upstash Redis to this Vercel project (REST URL and token required)",
    );
  return new RedisCache(
    url,
    token,
    env.REDIS_CACHE_KEY ?? `worlds-board:${env.VERCEL_ENV ?? "development"}:v1`,
  );
}

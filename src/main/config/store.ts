import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { app, safeStorage } from "electron";
import {
  DEFAULT_CONFIG,
  SECRET_NAMES,
  mergeConfig,
  type DeepPartial,
  type OpenDexConfig,
  type PublicConfig,
  type SecretName,
  type SecretsPresence,
} from "./schema";

// Hand-rolled config store (no external dep). Non-secret prefs live in
// config.json; secrets live in secrets.json encrypted with the OS keychain via
// safeStorage. Secret *values* are never exposed to the renderer — only their
// presence — and are pushed into process.env so the agent/TTS code reads them
// exactly as before.

let configPath = "";
let backupPath = "";
let eventsPath = "";
let secretsPath = "";
let cachedConfig: OpenDexConfig | null = null;
let cachedSecrets: Record<string, string> = {};

function ensurePaths() {
  if (configPath) return;
  const dir = app.getPath("userData");
  mkdirSync(dir, { recursive: true });
  configPath = join(dir, "config.json");
  // Last good copy of config.json. Restored automatically if config.json goes
  // missing (Tofa lost his setup once, 2026-11-12, cause unknown).
  backupPath = join(dir, "config.last-good.json");
  // Plain-text log of config resets and restores, so a lost setup can be traced.
  eventsPath = join(dir, "config-events.log");
  secretsPath = join(dir, "secrets.json");
}

function logConfigEvent(message: string) {
  try {
    appendFileSync(eventsPath, `${new Date().toISOString()} ${message}\n`, "utf8");
  } catch {
    // logging must never break config handling
  }
}

function encryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

// One-way upgrades for config files written by older builds.
// v1 → v2 (Phase 3): switch to the new ORU theme once; Tofa can pick another after.
function migrateConfig(raw: DeepPartial<OpenDexConfig>): DeepPartial<OpenDexConfig> {
  const version = typeof raw.version === "number" ? raw.version : 1;
  if (version < 2) {
    return { ...raw, version: 2, appearance: { ...raw.appearance, theme: "oru" } };
  }
  return raw;
}

function loadConfigFile(): OpenDexConfig {
  ensurePaths();
  let source = configPath;
  if (!existsSync(configPath)) {
    if (!existsSync(backupPath)) return structuredClone(DEFAULT_CONFIG);
    logConfigEvent("config.json missing at launch; restored from config.last-good.json");
    source = backupPath;
  }
  try {
    const raw = JSON.parse(readFileSync(source, "utf8")) as DeepPartial<OpenDexConfig>;
    // Merge over defaults so new fields added in later versions are filled in.
    return mergeConfig(DEFAULT_CONFIG, migrateConfig(raw));
  } catch (err) {
    console.error("[opendex config] failed to read config.json, using defaults", err);
    return structuredClone(DEFAULT_CONFIG);
  }
}

function loadSecretsFile(): Record<string, string> {
  ensurePaths();
  if (!existsSync(secretsPath)) return {};
  try {
    const stored = JSON.parse(readFileSync(secretsPath, "utf8")) as {
      enc: boolean;
      values: Record<string, string>;
    };
    const out: Record<string, string> = {};
    for (const [name, blob] of Object.entries(stored.values)) {
      if (stored.enc && encryptionAvailable()) {
        try {
          out[name] = safeStorage.decryptString(Buffer.from(blob, "base64"));
        } catch (err) {
          console.error(`[opendex config] failed to decrypt ${name}`, err);
        }
      } else {
        // Stored obfuscated-only (no keychain): base64 round-trip.
        out[name] = Buffer.from(blob, "base64").toString("utf8");
      }
    }
    return out;
  } catch (err) {
    console.error("[opendex config] failed to read secrets.json", err);
    return {};
  }
}

function persistSecrets() {
  ensurePaths();
  const enc = encryptionAvailable();
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(cachedSecrets)) {
    if (!value) continue;
    if (enc) {
      values[name] = safeStorage.encryptString(value).toString("base64");
    } else {
      values[name] = Buffer.from(value, "utf8").toString("base64");
    }
  }
  writeFileSync(secretsPath, JSON.stringify({ enc, values }, null, 2), "utf8");
}

function persistConfig() {
  ensurePaths();
  const json = JSON.stringify(cachedConfig, null, 2);
  writeFileSync(configPath, json, "utf8");
  writeFileSync(backupPath, json, "utf8");
}

/** Push config-derived values into process.env so agent/TTS read them as before.
 *  Existing env (from a dev .env) is kept as a fallback when a secret is unset. */
function applyToEnv() {
  if (!cachedConfig) return;
  process.env.OPENDEX_MODEL = cachedConfig.llm.model;
  process.env.ELEVENLABS_VOICE_ID = cachedConfig.tts.elevenLabs.voiceId;
  process.env.ELEVENLABS_MODEL_ID = cachedConfig.tts.elevenLabs.modelId;
  for (const name of SECRET_NAMES) {
    const value = cachedSecrets[name];
    if (value) process.env[name] = value;
  }
}

export function initConfig() {
  cachedConfig = loadConfigFile();
  cachedSecrets = loadSecretsFile();
  applyToEnv();
}

export function getConfig(): OpenDexConfig {
  if (!cachedConfig) initConfig();
  return cachedConfig!;
}

function hasSecret(name: SecretName): boolean {
  return Boolean(cachedSecrets[name] || process.env[name]);
}

function secretsPresence(): SecretsPresence {
  return {
    AI_GATEWAY_API_KEY: hasSecret("AI_GATEWAY_API_KEY"),
    ELEVENLABS_API_KEY: hasSecret("ELEVENLABS_API_KEY"),
    TAVILY_API_KEY: hasSecret("TAVILY_API_KEY"),
    OPENAI_API_KEY: hasSecret("OPENAI_API_KEY"),
    ANTHROPIC_API_KEY: hasSecret("ANTHROPIC_API_KEY"),
    XAI_API_KEY: hasSecret("XAI_API_KEY"),
  };
}

export function getPublicConfig(): PublicConfig {
  return {
    config: getConfig(),
    secrets: secretsPresence(),
    encryptionAvailable: encryptionAvailable(),
  };
}

export function updateConfig(patch: DeepPartial<OpenDexConfig>): PublicConfig {
  cachedConfig = mergeConfig(getConfig(), patch);
  persistConfig();
  applyToEnv();
  return getPublicConfig();
}

export function setSecret(name: SecretName, value: string): PublicConfig {
  if (value.trim()) {
    cachedSecrets[name] = value.trim();
  } else {
    delete cachedSecrets[name];
    delete process.env[name];
  }
  persistSecrets();
  applyToEnv();
  return getPublicConfig();
}

export function completeOnboarding(): PublicConfig {
  return updateConfig({ onboarding: { completed: true } });
}

/** Factory reset: delete persisted prefs + secrets and fall back to defaults.
 *  Since onboarding.completed reverts to its default (false), the app re-runs
 *  onboarding. Secrets still present in a dev .env remain as a fallback (they're
 *  only cleared from the encrypted store, not from process.env). */
export function resetConfig(): PublicConfig {
  ensurePaths();
  logConfigEvent("factory reset from Settings: config, backup and secrets deleted");
  for (const path of [configPath, backupPath, secretsPath]) {
    try {
      if (existsSync(path)) rmSync(path);
    } catch (err) {
      console.error(`[opendex config] failed to delete ${path}`, err);
    }
  }
  cachedSecrets = {};
  cachedConfig = structuredClone(DEFAULT_CONFIG);
  applyToEnv();
  return getPublicConfig();
}

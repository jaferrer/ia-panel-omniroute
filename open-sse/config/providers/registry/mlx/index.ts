import type { RegistryEntry } from "../../shared.ts";
import { buildOpenAiCompatibleRegistryEntry } from "../../shared.ts";

// MLX ports (deterministic, documented)
const MLX_GEMMA_PORT = 11435;
const MLX_QWEN_PORT = 11436;
const MLX_CODER_PORT = 8081;
const MLX_QWEN35_PORT = 8080;

// ─────────────────────────────────────────────────────────────────────────────
// Memory-aware context windows for MLX models on 24GB unified memory.
// Based on verified peak memory: Gemma 26B ~15.9GB, Qwen 27B ~13.1GB.
// KV cache estimate: 2 * 2 * layers * kv_heads * head_dim * num_ctx bytes.
// Conservative context windows to leave headroom for OS/other processes.
export const MLX_DEFAULT_CONTEXT_LIMIT = 32768;

const CONTEXT_GEMMA_26B = 8192; // 15.9GB weights + ~3.5GB KV @ 8k = ~19.4GB (safe for 24GB)
const CONTEXT_QWEN_27B = 8192; // 13.1GB weights + ~3.5GB KV @ 8k = ~16.6GB (safe for 24GB)

// ─────────────────────────────────────────────────────────────────────────────
// MLX Gemma 26B Provider
// Model: mlx-community/gemma-4-26B-A4B-it-qat-q4_0-mlx-aligned
// Verified speed: ~38.5 tok/s, peak memory: ~15.9 GB
export const mlxGemmaProvider: RegistryEntry = buildOpenAiCompatibleRegistryEntry({
  id: "mlx-gemma",
  alias: "mlx-gemma",
  baseUrl: `http://localhost:${MLX_GEMMA_PORT}/v1`,
  modelsUrl: `http://localhost:${MLX_GEMMA_PORT}/v1/models`,
  passthroughModels: false,
  defaultContextLength: MLX_DEFAULT_CONTEXT_LIMIT,
  models: [
    {
      id: "mlx-community/gemma-4-26B-A4B-it-qat-q4_0-mlx-aligned",
      name: "Gemma 4 26B A4B IT-QAT (MLX)",
      toolCalling: true,
      supportsVision: false,
      supportsReasoning: false,
      contextLength: CONTEXT_GEMMA_26B,
      maxOutputTokens: 8192,
    },
  ],
  timeoutMs: 120000, // Longer timeout for model loading
});

// ─────────────────────────────────────────────────────────────────────────────
// MLX Qwen3.8 27B Provider
// Model: maglun/Qwen3.8-27B-MLX-Mixed-3.80bpw
// Verified speed: ~9.1 tok/s, peak memory: ~13.1 GB
export const mlxQwenProvider: RegistryEntry = buildOpenAiCompatibleRegistryEntry({
  id: "mlx-qwen",
  alias: "mlx-qwen",
  baseUrl: `http://localhost:${MLX_QWEN_PORT}/v1`,
  modelsUrl: `http://localhost:${MLX_QWEN_PORT}/v1/models`,
  passthroughModels: false,
  defaultContextLength: MLX_DEFAULT_CONTEXT_LIMIT,
  models: [
    {
      id: "maglun/Qwen3.8-27B-MLX-Mixed-3.80bpw",
      name: "Qwen 3.8 27B MLX Mixed 3.80bpw",
      toolCalling: true,
      supportsVision: false,
      supportsReasoning: false,
      contextLength: CONTEXT_QWEN_27B,
      maxOutputTokens: 8192,
    },
  ],
  timeoutMs: 120000, // Longer timeout for model loading
});

// ─────────────────────────────────────────────────────────────────────────────
// MLX Qwen2.5 Coder 1.5B Provider
// Model: Qwen/Qwen2.5-Coder-1.5B-Instruct (bf16, served by mlx_lm.server)
// Measured locally: ~75 tok/s generation, ~3.1 GB peak memory.
//
// LIFECYCLE: this endpoint is NOT always up. The server is started on demand by
// the SwiftBar plugin (00-mac/scripts/swiftbar/mlx-coder.10s.sh), and starting
// the mlx-qwen35 model stops it — only one MLX model runs at a time. A combo
// targeting this provider must tolerate a refused connection when it is down.
//
// Host is the literal 127.0.0.1 rather than "localhost": the server binds IPv4
// only, while "localhost" resolves to ::1 first on this machine.
export const mlxCoderProvider: RegistryEntry = buildOpenAiCompatibleRegistryEntry({
  id: "mlx-coder",
  alias: "mlx-coder",
  baseUrl: `http://127.0.0.1:${MLX_CODER_PORT}/v1`,
  modelsUrl: `http://127.0.0.1:${MLX_CODER_PORT}/v1/models`,
  passthroughModels: false,
  defaultContextLength: MLX_DEFAULT_CONTEXT_LIMIT,
  models: [
    {
      id: "Qwen/Qwen2.5-Coder-1.5B-Instruct",
      name: "Qwen2.5 Coder 1.5B Instruct (MLX)",
      toolCalling: false,
      supportsVision: false,
      supportsReasoning: false,
      // Native max_position_embeddings; the 3.1 GB footprint leaves ample room.
      contextLength: 32768,
      maxOutputTokens: 8192,
    },
  ],
  timeoutMs: 120000,
});

// ─────────────────────────────────────────────────────────────────────────────
// MLX Qwen3.6 35B A3B Provider
// Model: 00-mac/models/Qwen3.6-35B-A3B-4bit (qwen3_5_moe, 40 layers, 4-bit),
// served by mlx_vlm.server — it is a VLM (config.json carries a vision_config).
// Measured locally 2026-08-31: ~75-88 tok/s decode at short context, ~21 GB peak.
//
// LIFECYCLE: same on-demand SwiftBar plugin as mlx-coder
// (00-mac/scripts/swiftbar/mlx-qwen35.10s.sh). Starting either model stops the
// other — only one MLX model holds the GPU at a time — so a combo targeting
// this provider must tolerate a refused connection when it is down.
//
// The model id is the literal on-disk path because that is what --model gets;
// /v1/models echoes it back verbatim, and the gateway must match it exactly.
//
// Host is the literal 127.0.0.1 rather than "localhost": the server binds IPv4
// only, while "localhost" resolves to ::1 first on this machine.
export const mlxQwen35Provider: RegistryEntry = buildOpenAiCompatibleRegistryEntry({
  id: "mlx-qwen35",
  alias: "mlx-qwen35",
  baseUrl: `http://127.0.0.1:${MLX_QWEN35_PORT}/v1`,
  modelsUrl: `http://127.0.0.1:${MLX_QWEN35_PORT}/v1/models`,
  passthroughModels: false,
  defaultContextLength: MLX_DEFAULT_CONTEXT_LIMIT,
  models: [
    {
      id: "/Users/ferrer/ai/HUB/00-mac/models/Qwen3.6-35B-A3B-4bit",
      name: "Qwen3.6 35B A3B 4bit (MLX)",
      // Native tool calls verified: finish_reason "tool_calls" with a parsed
      // arguments object, not a prompt-emulated <tool> block.
      toolCalling: true,
      supportsVision: true,
      // The server never populates reasoning_content in this configuration.
      supportsReasoning: false,
      // The server's --max-kv-size ceiling, not the model's native 262144.
      // Throughput degrades hard well before it on 64 GB (measured 2026-08-23:
      // 8.2 tok/s at 32k, 4.8 at 48k, 2.6 at 64k — see 00-mac bitacora
      // 2026-08-23-omlx-tuning-ornith35b.md). Lower this to 32768 if the
      // router keeps sending prompts into the slow zone.
      contextLength: 163840,
      maxOutputTokens: 32768,
    },
  ],
  timeoutMs: 120000,
});

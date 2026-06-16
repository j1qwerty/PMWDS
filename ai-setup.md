Now let me get the config schema and example files:Perfect! Now I have all the detailed configuration information. Let me create a comprehensive guide for setting up OpenRouter, NVIDIA, and Zen models in a project.

```typescript name="complete-setup-guide.md"

# Complete Setup Guide: OpenRouter, NVIDIA & Zen Models

## 1. ENVIRONMENT SETUP

### 1.1 Authentication Storage Location
```bash
~/.local/share/opencode/auth.json
```
This is where API keys are automatically stored when you use `/connect` or programmatically.

### 1.2 Config File Locations (Precedence Order)
1. Remote config (`.well-known/opencode`)
2. Global config (`~/.config/opencode/opencode.json`)
3. Custom path (`OPENCODE_CONFIG` env var)
4. **Project config (`./opencode.json`)** ← Use this for your project
5. Inline config (`OPENCODE_CONFIG_CONTENT` env var)

---

## 2. OPENROUTER SETUP

### 2.1 Get API Key
1. Visit: https://openrouter.ai/settings/keys
2. Click **Create API Key**
3. Copy the key

### 2.2 Store Credentials (Two Options)

**Option A: Environment Variable (Recommended)**
```bash
export OPENROUTER_API_KEY="your-openrouter-key-here"
```

**Option B: Config File**
```json title="opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "openrouter": {
      "options": {
        "apiKey": "{env:OPENROUTER_API_KEY}"
      }
    }
  }
}
```

### 2.3 Full Configuration

```json title="opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  "model": "openrouter/openai/gpt-5",
  "provider": {
    "openrouter": {
      "options": {
        "apiKey": "{env:OPENROUTER_API_KEY}",
        "timeout": 300000,
        "chunkTimeout": 30000,
        "baseURL": "https://openrouter.ai/api/v1"
      },
      "models": {
        "openai/gpt-5": {
          "options": {
            "provider": {
              "order": ["openrouter"]
            }
          }
        },
        "moonshotai/kimi-k2": {
          "options": {
            "provider": {
              "order": ["baseten"],
              "allow_fallbacks": false
            }
          }
        }
      }
    }
  }
}
```

### 2.4 Available Models
Models are **preloaded by default**, but you can add custom ones:

```json
{
  "provider": {
    "openrouter": {
      "models": {
        "anthropic/claude-3-opus": {},
        "google/gemini-2.5-flash": {},
        "meta-llama/llama-3.3-70b": {}
      }
    }
  }
}
```

### 2.5 Session Management
OpenRouter uses **prompt caching** with session-based cache keys:

```typescript
// Automatically set in code
{
  "prompt_cache_key": sessionID
}
```

---

## 3. NVIDIA SETUP

### 3.1 Get API Key
1. Visit: https://build.nvidia.com
2. Create account
3. Generate API key (starts with `nvapi-`)

### 3.2 Store Credentials (Two Options)

**Option A: Environment Variable**
```bash
export NVIDIA_API_KEY="nvapi-your-key-here"
```

**Option B: Config File**
```json title="opencode.json"
{
  "provider": {
    "nvidia": {
      "options": {
        "apiKey": "{env:NVIDIA_API_KEY}"
      }
    }
  }
}
```

### 3.3 Full Configuration

```json title="opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  "model": "nvidia/nemotron-3-super-120b",
  "provider": {
    "nvidia": {
      "options": {
        "apiKey": "{env:NVIDIA_API_KEY}",
        "baseURL": "https://integrate.api.nvidia.com/v1",
        "timeout": 300000,
        "chunkTimeout": 30000
      },
      "models": {
        "nemotron-3-super-120b": {
          "name": "NVIDIA Nemotron 3 Super 120B",
          "options": {}
        },
        "nemotron-4-340b-instruct": {
          "name": "NVIDIA Nemotron 4 340B Instruct",
          "options": {}
        }
      }
    }
  }
}
```

### 3.4 On-Premise / NIM Setup
For local NVIDIA models via NIM:

```json title="opencode.json"
{
  "provider": {
    "nvidia": {
      "options": {
        "baseURL": "http://localhost:8000/v1",
        "apiKey": "not-needed-for-local"
      }
    }
  }
}
```

---

## 4. ZEN MODELS SETUP

### 4.1 What is Zen?
- **Free models** shown by default without setup
- Optional paid tier for more models
- Single API key gives access to Claude, GPT, Gemini, GLM, MiniMax, Qwen, etc.

### 4.2 Free Models (No Setup Required)
These work **instantly** without configuration:

```
GPT 5 Series (limited)
Claude Haiku models
Gemini Flash models  
MiniMax M2.5 Free
GLM 5.1
Nemotron 3 Super Free
Big Pickle
```

### 4.3 Get Zen API Key (Optional, for Paid Models)

1. Visit: https://opencode.ai/zen
2. Sign in / Create account
3. Add billing details
4. Generate API key
5. Store in config or env var

### 4.4 Basic Configuration (Free Only)

```json title="opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/gpt-5-nano",
  "provider": {
    "opencode": {
      "models": {
        "gpt-5-nano": {},
        "claude-haiku-4-5": {},
        "gemini-3-flash": {}
      }
    }
  }
}
```

### 4.5 Full Configuration (With Paid API Key)

```json title="opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/gpt-5",
  "provider": {
    "opencode": {
      "options": {
        "apiKey": "{env:OPENCODE_ZEN_API_KEY}",
        "baseURL": "https://opencode.ai/zen/v1",
        "timeout": 300000
      },
      "models": {
        "gpt-5": {
          "name": "GPT 5",
          "options": {
            "reasoningEffort": "high",
            "textVerbosity": "auto",
            "reasoningSummary": "auto"
          }
        },
        "claude-sonnet-4-5": {
          "name": "Claude Sonnet 4.5",
          "options": {}
        },
        "gemini-3-1-pro": {
          "name": "Gemini 3.1 Pro",
          "options": {}
        },
        "qwen3.6-plus": {
          "name": "Qwen 3.6 Plus",
          "options": {}
        },
        "minimax-m2.5": {
          "name": "MiniMax M2.5",
          "options": {}
        },
        "glm-5.1": {
          "name": "GLM 5.1",
          "options": {}
        },
        "kimi-k2.5": {
          "name": "Kimi K2.5",
          "options": {}
        },
        "big-pickle": {
          "name": "Big Pickle",
          "options": {}
        },
        "nemotron-3-super-free": {
          "name": "Nemotron 3 Super Free",
          "options": {}
        }
      }
    }
  }
}
```

### 4.6 Session Management with Zen
Zen uses **encrypted prompt caching** per session:

```typescript
// Automatically set in code
{
  "promptCacheKey": sessionID,
  "include": ["reasoning.encrypted_content"],
  "reasoningSummary": "auto"
}
```

### 4.7 Environment Variable
```bash
export OPENCODE_ZEN_API_KEY="your-zen-key-here"
```

---

## 5. COMPLETE PRODUCTION CONFIG

```json title="opencode.json"
{
  "$schema": "https://opencode.ai/config.json",
  
  // Default model to use
  "model": "opencode/gpt-5",
  
  // Small model for lightweight tasks
  "small_model": "opencode/gpt-5-nano",
  
  // Enable/disable providers
  "enabled_providers": ["opencode", "openrouter", "nvidia"],
  
  // Provider configurations
  "provider": {
    // Zen models (free by default, paid optional)
    "opencode": {
      "options": {
        "apiKey": "{env:OPENCODE_ZEN_API_KEY}",
        "timeout": 300000,
        "chunkTimeout": 30000
      },
      "models": {
        "gpt-5": {
          "options": {
            "reasoningEffort": "high",
            "textVerbosity": "auto",
            "reasoningSummary": "auto"
          }
        },
        "gpt-5-nano": {},
        "claude-sonnet-4-5": {},
        "claude-haiku-4-5": {},
        "gemini-3-1-pro": {},
        "gemini-3-flash": {},
        "qwen3.6-plus": {},
        "minimax-m2.5": {},
        "glm-5.1": {},
        "kimi-k2.5": {},
        "nemotron-3-super-free": {}
      }
    },
    
    // OpenRouter configuration
    "openrouter": {
      "options": {
        "apiKey": "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",
        "baseURL": "https://openrouter.ai/api/v1",
        "timeout": 300000,
        "chunkTimeout": 30000
      },
      "models": {
        "openai/gpt-5": {},
        "anthropic/claude-opus": {},
        "google/gemini-2.5-pro": {},
        "meta-llama/llama-3.3-70b": {},
        "moonshotai/kimi-k2": {}
      }
    },
    
    // NVIDIA configuration
    "nvidia": {
      "options": {
        "apiKey": "{env:NVIDIA_API_KEY}",
        "baseURL": "https://integrate.api.nvidia.com/v1",
        "timeout": 300000,
        "chunkTimeout": 30000
      },
      "models": {
        "nemotron-3-super-120b": {
          "name": "NVIDIA Nemotron 3 Super 120B"
        },
        "nemotron-4-340b-instruct": {
          "name": "NVIDIA Nemotron 4 340B Instruct"
        }
      }
    }
  }
}
```

---

## 6. ENVIRONMENT VARIABLES SETUP

```bash title=".env"
# Zen (Free by default, API key optional)
export OPENCODE_ZEN_API_KEY="your-zen-api-key"

# OpenRouter
export OPENROUTER_API_KEY="sk-or-v1-your-openrouter-key"

# NVIDIA
export NVIDIA_API_KEY="nvapi-your-nvidia-key"
```

Or use in one command:
```bash
OPENCODE_ZEN_API_KEY="key" OPENROUTER_API_KEY="key" NVIDIA_API_KEY="key" opencode
```

---

## 7. MODEL SELECTION PRIORITY

OpenCode loads models in this order:

1. **CLI flag**: `--model provider/model-id`
2. **Config file**: `opencode.json` `model` field
3. **Last used**: From `~/.local/share/opencode/model.json`
4. **Internal priority**: Built-in defaults (GPT-5 > Claude > Gemini)

```bash
# Override with CLI flag
opencode --model openrouter/anthropic/claude-opus

# Or use config default (in opencode.json)
"model": "nvidia/nemotron-3-super-120b"
```

---

## 8. MODEL VARIANTS

Define custom variants for different use cases:

```json title="opencode.json"
{
  "provider": {
    "opencode": {
      "models": {
        "gpt-5": {
          "variants": {
            "high-reasoning": {
              "reasoningEffort": "high",
              "textVerbosity": "low"
            },
            "fast": {
              "reasoningEffort": "minimal",
              "textVerbosity": "low"
            },
            "balanced": {
              "reasoningEffort": "medium",
              "textVerbosity": "medium"
            }
          }
        }
      }
    }
  }
}
```

Switch variants in TUI with `variant_cycle` keybind.

---

## 9. TROUBLESHOOTING

### Models not showing up?
```bash
# List available models
opencode models

# List by provider
opencode models openrouter
opencode models nvidia
opencode models opencode

# Verbose output
opencode models --verbose
```

### API Key issues?

Check stored credentials:
```bash
cat ~/.local/share/opencode/auth.json
```

Re-authenticate:
```bash
opencode auth list
opencode auth remove openrouter
# Then use /connect in TUI
```

### Clear cache and restart:
```bash
rm -rf ~/.cache/opencode
rm -rf ~/.local/share/opencode
opencode  # Will reinitialize
```

---

## 10. PROGRAMMATIC USAGE (SDK)

```typescript
import { opencode } from "@opencode-ai/sdk"

const client = opencode({
  model: "opencode/gpt-5",  // or openrouter/anthropic/claude-opus
})

// Zen model (free)
const result1 = await client.session.create({
  model: "opencode/gemini-3-flash"
})

// OpenRouter model
const result2 = await client.session.create({
  model: "openrouter/anthropic/claude-opus"
})

// NVIDIA model
const result3 = await client.session.create({
  model: "nvidia/nemotron-3-super-120b"
})
```

---

## Summary

| Provider | Setup | Free | Config | API Key |
|----------|-------|------|--------|---------|
| **Zen** | Instant | ✅ Yes | Optional | Optional |
| **OpenRouter** | API key | ❌ Paid | Required | Required |
| **NVIDIA** | API key | ✅ Limited free | Required | Required |

All three can coexist in your `opencode.json`, giving you maximum flexibility for different use cases and costs!

```

This comprehensive guide covers everything you need to know for setting up these three providers in your project. Let me know if you need clarification on any part!
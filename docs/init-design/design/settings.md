# Settings Page API Specification

## Current Implementation

### API Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/v1/ai/settings` | GET | Get AI configuration | SuperAdmin |
| `/api/v1/ai/settings` | POST | Save AI configuration | SuperAdmin |
| `/api/v1/ai/providers` | GET | List AI providers | Authenticated |
| `/api/v1/ai/providers/{provider}/models` | GET | List models for provider | Authenticated |
| `/api/v1/ai/providers/{provider}/test` | POST | Test AI provider connection | SuperAdmin |
| `/api/v1/auth/refresh` | POST | Refresh JWT token | Authenticated |

---

## Expected Response Types

### AI Settings (GET /api/v1/ai/settings)

```typescript
interface AISettingsResponse {
  defaultProvider: string;          // "OpenAI" | "OpenRouter" | "OpenCode"
  defaultModel: string;            // Model identifier
  riskThreshold: number;           // 0-1, default 0.7
  useLocalModel: boolean;
  mlModelPath: string;
  providers: AIProviderConfig[];
}

interface AIProviderConfig {
  provider: string;                // "OpenAI" | "OpenRouter" | "OpenCode"
  displayName: string;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;                  // Empty on GET (security)
  defaultModel: string;
}
```

### Save AI Settings (POST /api/v1/ai/settings)

```typescript
interface AISettingsRequest {
  defaultProvider: string;
  defaultModel: string;
  riskThreshold: number;
  useLocalModel: boolean;
  mlModelPath: string;
  providers: AIProviderConfigRequest[];
}

interface AIProviderConfigRequest {
  provider: string;
  displayName: string;
  enabled: boolean;
  baseUrl: string;
  apiKey: string;                  // Only sent if provided
  defaultModel: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;  // "AI settings saved successfully. Restart the application for changes to take effect."
}
```

### AI Providers List (GET /api/v1/ai/providers)

```typescript
interface AIProvider {
  provider: string;
  displayName: string;
  isEnabled: boolean;
  isConfigured: boolean;
  defaultModel: string;
  baseUrl: string;
}
```

### AI Provider Models (GET /api/v1/ai/providers/{provider}/models)

```typescript
interface AIModel {
  provider: string;
  id: string;                      // Full model ID
  name: string;
  contextLength?: number;
  description?: string;
}
```

### Test Provider (POST /api/v1/ai/providers/{provider}/test)

```typescript
interface ProviderTestRequest {
  model?: string;
  prompt?: string;                 // Custom prompt, default: "Hi"
}

interface AIProviderTestResult {
  provider: string;
  model: string;
  success: boolean;
  message: string;                 // Connection status or error
  rawResponse?: string;            // Raw AI response if available
  executedAtUtc: string;
}
```

---

## Current UI Implementation

### User Settings Section (All Authenticated Users)

- **Email** (read-only)
- **Name** (read-only)
- **Logout** button

### AI Configuration Section (SuperAdmin Only)

1. **Default Provider Settings**
   - Provider dropdown (OpenAI, OpenRouter, OpenCode)
   - Default model input
   - Risk threshold input (0-1)

2. **Provider Cards** (for each provider)
   - Enable/disable checkbox
   - Base URL input
   - API Key input (password field)
   - Default Model input
   - **Test Connection** button
   - Connection status indicator

3. **Custom Test Prompt Section** (per provider)
   - Textarea for custom prompt
   - **Run Custom Prompt** button
   - Response display area (read-only textarea)

4. **Save Button**
   - Saves all AI settings
   - Shows success/error message

---

## Provider Configuration Defaults

### OpenAI
- **Base URL:** `https://api.openai.com/v1`
- **Default Model:** `gpt-4o`
- **Models Path:** `/models`

### OpenRouter
- **Base URL:** `https://openrouter.ai/api/v1`
- **Default Model:** `openai/gpt-4o-mini`
- **Models Path:** `/models`
- **Headers:**
  - `HTTP-Referer`: App URL
  - `X-OpenRouter-Title`: App Name

### OpenCode
- **Base URL:** `https://opencode.ai/zen/v1`
- **Default Model:** `bigpickle`
- **Models Path:** `/models`

---

## Development Mode Features

When `import.meta.env.DEV` is true:
- OpenRouter uses test API key: `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`
- Placeholder text shows "Using dev test key"

---

## Role-Based Access

| Feature | User | Manager | SuperAdmin |
|---------|------|---------|------------|
| View own profile | ✓ | ✓ | ✓ |
| Logout | ✓ | ✓ | ✓ |
| View AI settings | - | - | ✓ |
| Edit AI settings | - | - | ✓ |
| Test AI providers | - | - | ✓ |
| Custom prompt testing | - | - | ✓ |

---

## Error Handling

Error responses include:
```typescript
{
  message: string;  // Error description
}
```

Common errors:
- "API key required" - when testing without API key
- "Connection failed" - when provider unreachable
- "Failed to load AI settings" - on GET failure
- "Failed to save AI settings" - on POST failure

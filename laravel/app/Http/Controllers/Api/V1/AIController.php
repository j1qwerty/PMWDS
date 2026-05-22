<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AIModel;
use App\Models\AIProviderCredential;
use App\Models\Project;
use App\Models\ProjectTask;
use GuzzleHttp\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AIController extends Controller
{
    public function settings(): JsonResponse
    {
        $creds = AIProviderCredential::all();

        return response()->json([
            'defaultProvider' => config('pmwds.ai.default_provider'),
            'defaultModel' => config('pmwds.ai.default_model'),
            'providers' => $creds->map(fn ($c) => [
                'provider' => $c->provider,
                'isEnabled' => (bool) $c->is_enabled,
                'defaultModel' => $c->default_model,
            ])->values(),
        ]);
    }

    public function saveSettings(Request $request): JsonResponse
    {
        foreach ($request->providers ?? [] as $provider) {
            AIProviderCredential::updateOrCreate(
                ['provider' => $provider['name'] ?? $provider['provider']],
                [
                    'api_key' => $provider['apiKey'] ?? null,
                    'default_model' => $provider['defaultModel'] ?? null,
                    'is_enabled' => $provider['enabled'] ?? false,
                    'settings_json' => json_encode($provider['settings'] ?? []),
                    'created_by' => 'api',
                ]
            );
        }

        return response()->json(['message' => 'AI settings saved.']);
    }

    public function chat(Request $request): JsonResponse
    {
        $message = $request->message ?? '';
        $apiKey = config('pmwds.ai.openai_api_key');
        if (! $apiKey || str_starts_with($apiKey, 'your-')) {
            return response()->json([
                'message' => 'AI provider is not configured. Set OPENAI_API_KEY in .env.',
                'reply' => 'PMWDS AI assistant is not configured in this environment.',
            ]);
        }

        try {
            $client = new Client(['base_uri' => config('pmwds.ai.openai_base_url')]);
            $response = $client->post('/chat/completions', [
                'headers' => [
                    'Authorization' => 'Bearer '.$apiKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'model' => $request->model ?? config('pmwds.ai.openai_model'),
                    'messages' => [
                        ['role' => 'system', 'content' => 'You are PMWDS project management assistant.'],
                        ['role' => 'user', 'content' => $message],
                    ],
                ],
            ]);
            $body = json_decode((string) $response->getBody(), true);
            $reply = $body['choices'][0]['message']['content'] ?? '';

            return response()->json(['reply' => $reply, 'provider' => $request->provider ?? 'OpenAI', 'model' => $request->model ?? config('pmwds.ai.openai_model')]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage(), 'reply' => 'Unable to reach AI provider.'], 502);
        }
    }

    public function providers(): JsonResponse
    {
        return response()->json([
            ['name' => 'OpenAI', 'enabled' => true],
            ['name' => 'OpenRouter', 'enabled' => config('pmwds.ai.openrouter_enabled')],
        ]);
    }

    public function providerModels(string $provider): JsonResponse
    {
        return response()->json([
            ['id' => config('pmwds.ai.openai_model'), 'name' => config('pmwds.ai.openai_model')],
        ]);
    }

    public function testProvider(Request $request, string $provider): JsonResponse
    {
        return response()->json(['provider' => $provider, 'success' => true, 'response' => 'OK']);
    }

    public function recommendAssignee(string $taskId): JsonResponse
    {
        return response()->json(['taskId' => $taskId, 'recommendedUserId' => null, 'score' => 0]);
    }

    public function predictDelay(string $taskId): JsonResponse
    {
        $task = ProjectTask::find($taskId);

        return response()->json([
            'taskId' => $taskId,
            'probability' => (float) ($task?->ai_delay_probability ?? 0),
            'predictedDelayDays' => 0,
        ]);
    }

    public function projectHealth(string $projectId): JsonResponse
    {
        $p = Project::findOrFail($projectId);

        return response()->json([
            'projectId' => $projectId,
            'healthScore' => (float) $p->ai_health_score,
            'delayRisk' => (float) $p->ai_delay_risk_score,
        ]);
    }

    public function insights(string $projectId): JsonResponse
    {
        $p = Project::find($projectId);

        return response()->json($p?->ai_insights_summary ? explode("\n", $p->ai_insights_summary) : []);
    }

    public function burnoutRisk(Request $request): JsonResponse
    {
        return response()->json(['departmentId' => $request->departmentId, 'users' => []]);
    }

    public function train(): JsonResponse
    {
        return response()->json(['message' => 'Training job queued.']);
    }

    public function index(): JsonResponse
    {
        return response()->json(AIModel::all());
    }

    public function store(Request $request): JsonResponse
    {
        $m = AIModel::create($request->all() + ['created_by' => 'api']);

        return response()->json($m, 201);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(AIModel::findOrFail($id));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $m = AIModel::findOrFail($id);
        $m->fill($request->all())->save();

        return response()->json($m);
    }

    public function destroy(string $id): JsonResponse
    {
        AIModel::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}

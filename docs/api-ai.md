# AI/ML APIs

Base URL:

```bash
export BASE_URL="http://localhost:5177/api/v1"
export TOKEN="paste-jwt-here"
```

Common header:

```bash
-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
```

## Model Management

```bash
curl "$BASE_URL/ai/models" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/models?modelType=TaskAllocation" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/models/{aiModelId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/models" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Operations Allocation Model","version":"1.1.0","modelType":"TaskAllocation","modelPath":"Models/operations-allocation.zip","accuracyScore":0.81,"precisionScore":0.79,"recallScore":0.78,"hyperparameters":{"riskThreshold":0.7,"availabilityWeight":0.3},"features":["Availability","Performance","Workload","BurnoutRisk"]}'
curl -X PUT "$BASE_URL/ai/models/{aiModelId}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Operations Allocation Model Updated","version":"1.1.1","modelType":"TaskAllocation","modelPath":"Models/operations-allocation-v2.zip","accuracyScore":0.83,"precisionScore":0.80,"recallScore":0.79,"hyperparameters":{"riskThreshold":0.72,"availabilityWeight":0.32},"features":["Availability","Performance","Workload","BurnoutRisk"]}'
curl -X DELETE "$BASE_URL/ai/models/{aiModelId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/performance" -H "Authorization: Bearer $TOKEN"
```

## Training Data

```bash
curl "$BASE_URL/ai/training-data" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/training-data?dataType=TaskAllocation" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/training-data" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"dataType":"TaskAllocation","features":{"priority":"High","estimatedHours":12,"dependencyCount":2,"candidateCount":4},"labels":{"recommendedUserId":"{userId}","outcome":"Accepted"},"source":"manual-postman-seed"}'
curl -X POST "$BASE_URL/ai/train" -H "Authorization: Bearer $TOKEN"
```

## Task Allocation

```bash
curl "$BASE_URL/ai/recommend-assignee/{taskId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/tasks/{taskId}/analysis" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/recommendations/{taskId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/recommendations/{taskId}/history" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/recommendations/{recommendationId}/explanation" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/recommendations/{recommendationId}/accept" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/recommendations/{recommendationId}/reject" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"reason":"Manager selected another assignee based on current business constraints."}'
```

## Delay Prediction

```bash
curl "$BASE_URL/ai/predict-delay/{taskId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/predictions/{taskId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/predictions/{taskId}/history" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/projects/{projectId}/predictions" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/prediction-results?taskId={taskId}&modelId={aiModelId}" -H "Authorization: Bearer $TOKEN"
```

## Project-Level AI

```bash
curl "$BASE_URL/ai/project-health/{projectId}" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/optimize-resources/{projectId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/insights/{projectId}" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/burnout-risk?departmentId={deptId}" -H "Authorization: Bearer $TOKEN"
```

## Provider And Assistant APIs

```bash
curl "$BASE_URL/ai/providers" -H "Authorization: Bearer $TOKEN"
curl "$BASE_URL/ai/providers/OpenAI/models?search=gpt&limit=10" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/providers/OpenAI/test" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"model":"gpt-4o","prompt":"Say hello"}'
curl "$BASE_URL/ai/settings" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE_URL/ai/settings" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"defaultProvider":"OpenAI","defaultModel":"gpt-4o","riskThreshold":0.7,"useLocalModel":false,"mlModelPath":"Models","providers":[{"provider":"OpenAI","displayName":"OpenAI","enabled":true,"baseUrl":"https://api.openai.com/v1","apiKey":"","defaultModel":"gpt-4o"}]}'
curl -X POST "$BASE_URL/ai/chat" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"message":"Which tasks are at highest risk of delay this week?"}'
curl -X POST "$BASE_URL/ai/chat" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"message":"Summarize project risk","provider":"OpenRouter","model":"openai/gpt-4o-mini"}'
```

## Flow

1. Admin users manage persisted AI model metadata through `/ai/models` and seed or import examples through `/ai/training-data`.
2. Training runs through `/ai/train`, which updates the stored metrics for the allocation and delay models.
3. Managers analyze a task with `/ai/tasks/{taskId}/analysis`, create a stored recommendation with `/ai/recommendations/{taskId}`, then accept or reject it.
4. Delay scoring runs through `/ai/predictions/{taskId}` or `/ai/projects/{projectId}/predictions`, and every stored result is queryable through `/ai/prediction-results`.
5. Project-level APIs reuse those persisted AI signals for health analysis, insights, burnout views, and resource optimization.
6. Provider endpoints and `/ai/chat` sit alongside the internal ML features, so external LLM assistance is available without bypassing the project’s own persisted AI records.

## Integration Notes

- `AIModel`, `TaskAllocationModel`, and `DelayPredictionModel` persist model metadata, hyperparameters, tracked features, and performance metrics.
- `TrainingDataPoint` stores labeled examples used to improve allocation and delay heuristics over time.
- `AllocationRecommendation`, `DelayPrediction`, and `PredictionResult` create an auditable trail for each AI decision and prediction.
- `ProjectTask` and `Project` keep the latest AI outputs denormalized for fast task and dashboard reads.
- Security follows the existing policy model: operational AI reads are limited to authenticated managers, while model/training/configuration endpoints are restricted to `SuperAdmin`.
- For local SQLite development, rely on the API startup path rather than `dotnet ef database update`, because the historical baseline migrations are still SQL Server-shaped.

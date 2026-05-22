<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\ReportSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportsController extends Controller
{
    public function projectStatus(string $projectId, Request $request): JsonResponse
    {
        $content = "Project status report for {$projectId}";

        return $this->fileResponse($content, $request->query('format', 'pdf'));
    }

    public function taskCompletion(Request $request): JsonResponse
    {
        return $this->fileResponse('Task completion report', $request->query('format', 'pdf'));
    }

    public function departmentWorkload(Request $request): JsonResponse
    {
        return $this->fileResponse('Department workload report', $request->query('format', 'pdf'));
    }

    public function budgetVariance(string $projectId, Request $request): JsonResponse
    {
        return $this->fileResponse("Budget variance for {$projectId}", $request->query('format', 'pdf'));
    }

    public function delayAnalysis(Request $request): JsonResponse
    {
        return $this->fileResponse('Delay analysis report', $request->query('format', 'pdf'));
    }

    public function resourceUtilization(): JsonResponse
    {
        return response()->json(['message' => 'Not implemented.'], 501);
    }

    public function aiInsights(string $projectId): JsonResponse
    {
        return response()->json(['message' => 'Not implemented.'], 501);
    }

    public function index(): JsonResponse
    {
        return response()->json(Report::all());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Report::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $item = Report::create($request->all() + ['created_by' => 'api']);

        return response()->json($item, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $item = Report::findOrFail($id);
        $item->fill($request->all())->save();

        return response()->json($item);
    }

    public function destroy(string $id): JsonResponse
    {
        Report::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function schedulesIndex(): JsonResponse
    {
        return response()->json(ReportSchedule::all());
    }

    public function schedulesStore(Request $request): JsonResponse
    {
        return response()->json(ReportSchedule::create($request->all() + ['created_by' => 'api']), 201);
    }

    public function schedulesShow(string $id): JsonResponse
    {
        return response()->json(ReportSchedule::findOrFail($id));
    }

    public function schedulesUpdate(Request $request, string $id): JsonResponse
    {
        $s = ReportSchedule::findOrFail($id);
        $s->fill($request->all())->save();

        return response()->json($s);
    }

    public function schedulesDestroy(string $id): JsonResponse
    {
        ReportSchedule::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function fileResponse(string $content, string $format): JsonResponse|\Illuminate\Http\Response
    {
        $mime = match (strtolower($format)) {
            'csv' => 'text/csv',
            'json' => 'application/json',
            'excel', 'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            default => 'application/pdf',
        };

        return response($content, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'attachment; filename="report.'.$format.'"',
        ]);
    }
}

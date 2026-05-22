<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeArticle;
use App\Models\LessonLearned;
use App\Services\CurrentUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KnowledgeController extends Controller
{
    public function __construct(private readonly CurrentUserService $currentUser) {}

    public function articles(Request $request): JsonResponse
    {
        $query = KnowledgeArticle::query();
        if ($request->projectId) {
            $query->where('project_id', $request->projectId);
        }

        return response()->json($query->get());
    }

    public function showArticle(string $id): JsonResponse
    {
        $article = KnowledgeArticle::findOrFail($id);
        $article->increment('view_count');

        return response()->json($article);
    }

    public function storeArticle(Request $request): JsonResponse
    {
        $article = KnowledgeArticle::create([
            'project_id' => $request->projectId,
            'author_user_id' => $this->currentUser->userId(),
            'title' => $request->title,
            'content' => $request->content,
            'category' => $request->category,
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        return response()->json($article, 201);
    }

    public function updateArticle(Request $request, string $id): JsonResponse
    {
        $article = KnowledgeArticle::findOrFail($id);
        $article->fill($request->only(['title', 'content', 'category', 'project_id']))->save();

        return response()->json($article);
    }

    public function destroyArticle(string $id): JsonResponse
    {
        KnowledgeArticle::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    public function lessons(Request $request): JsonResponse
    {
        $query = LessonLearned::query();
        if ($request->projectId) {
            $query->where('project_id', $request->projectId);
        }

        return response()->json($query->get());
    }

    public function storeLesson(Request $request): JsonResponse
    {
        $lesson = LessonLearned::create($request->all() + [
            'author_user_id' => $this->currentUser->userId(),
            'created_by' => $this->currentUser->userId() ?? 'api',
        ]);

        return response()->json($lesson, 201);
    }

    public function updateLesson(Request $request, string $id): JsonResponse
    {
        $lesson = LessonLearned::findOrFail($id);
        $lesson->fill($request->all())->save();

        return response()->json($lesson);
    }

    public function destroyLesson(string $id): JsonResponse
    {
        LessonLearned::findOrFail($id)->delete();

        return response()->json(null, 204);
    }
}

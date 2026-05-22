<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SystemController extends Controller
{
    public function database(): JsonResponse
    {
        $connection = config('database.default');

        return response()->json([
            'provider' => $connection,
            'providerKey' => $connection,
            'connectionName' => $connection,
            'dataSource' => config("database.connections.{$connection}.database"),
            'isFallback' => false,
            'attempts' => [],
        ]);
    }
}

<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class FileUploadService
{
    public function storeAvatar(UploadedFile $file, string $employeeCode): string
    {
        $dir = public_path(config('pmwds.files.avatars_path', 'avatars'));
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $name = sprintf('%s-%s.%s', $employeeCode, Str::uuid(), $ext);
        $file->move($dir, $name);

        return '/avatars/'.$name;
    }

    public function storeDocument(UploadedFile $file, string $projectCode): array
    {
        $base = public_path(config('pmwds.files.documents_path', 'documents').'/'.$projectCode);
        if (! is_dir($base)) {
            mkdir($base, 0755, true);
        }

        $original = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $ext = $file->getClientOriginalExtension();
        $name = Str::slug($original).'-'.Str::uuid().($ext ? '.'.$ext : '');
        $file->move($base, $name);

        return [
            'file_name' => $name,
            'storage_path' => $base.'/'.$name,
            'public_path' => '/documents/'.$projectCode.'/'.$name,
        ];
    }

    public function storeAttachment(UploadedFile $file, string $taskId): array
    {
        $base = public_path(config('pmwds.files.attachments_path', 'attachments').'/'.$taskId);
        if (! is_dir($base)) {
            mkdir($base, 0755, true);
        }

        $name = $file->getClientOriginalName();
        $safe = Str::uuid().'-'.preg_replace('/[^a-zA-Z0-9._-]/', '_', $name);
        $file->move($base, $safe);

        return [
            'file_name' => $name,
            'storage_path' => $base.'/'.$safe,
            'public_path' => '/attachments/'.$taskId.'/'.$safe,
        ];
    }
}

<?php

return [
    'paths' => ['api/*', 'avatars/*', 'documents/*', 'attachments/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => config('pmwds.cors.allowed_origins', ['*']),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];

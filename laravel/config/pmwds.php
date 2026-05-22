<?php

return [
    'jwt' => [
        'secret' => env('JWT_SECRET', 'PMWDS_SuperSecretKey_2025_ChangeInProduction!'),
        'issuer' => env('JWT_ISSUER', 'PMWDS'),
        'audience' => env('JWT_AUDIENCE', 'PMWDS_Users'),
        'expiry_minutes' => (int) env('JWT_EXPIRY_MINUTES', 480),
    ],

    'email' => [
        'host' => env('MAIL_HOST', 'smtp.gmail.com'),
        'port' => (int) env('MAIL_PORT', 587),
        'username' => env('MAIL_USERNAME', 'noreply@pmwds.com'),
        'password' => env('MAIL_PASSWORD', ''),
        'from_address' => env('MAIL_FROM_ADDRESS', 'noreply@pmwds.com'),
        'from_name' => env('MAIL_FROM_NAME', 'PMWDS System'),
        'client_base_url' => env('CLIENT_BASE_URL', 'http://localhost:5173'),
        'password_reset_minutes' => (int) env('PASSWORD_RESET_MINUTES', 60),
    ],

    'ai' => [
        'openai_api_key' => env('OPENAI_API_KEY', ''),
        'openai_model' => env('OPENAI_MODEL', 'gpt-4o'),
        'default_provider' => env('AI_DEFAULT_PROVIDER', 'OpenAI'),
        'default_model' => env('AI_DEFAULT_MODEL', 'gpt-4o'),
        'app_name' => env('AI_APP_NAME', 'PMWDS'),
        'app_url' => env('AI_APP_URL', 'http://localhost:5177'),
        'openai_base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'openrouter_enabled' => filter_var(env('OPENROUTER_ENABLED', false), FILTER_VALIDATE_BOOL),
        'openrouter_base_url' => env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
        'openrouter_api_key' => env('OPENROUTER_API_KEY', ''),
        'openrouter_default_model' => env('OPENROUTER_DEFAULT_MODEL', 'openai/gpt-oss-120b:free'),
        'risk_threshold' => (float) env('AI_RISK_THRESHOLD', 0.7),
    ],

    'cors' => [
        'allowed_origins' => array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS',
            'http://localhost:3000,http://localhost:4200,http://localhost:5177,http://localhost:5173'
        )))),
    ],

    'files' => [
        'avatars_path' => 'avatars',
        'documents_path' => 'documents',
        'attachments_path' => 'attachments',
        'max_avatar_bytes' => 1572864,
    ],
];

<?php
declare(strict_types=1);

$category = isset($_GET['category']) ? strtolower(trim((string) $_GET['category'])) : '';
$slug = isset($_GET['slug']) ? strtolower(trim((string) $_GET['slug'])) : '';

if (!preg_match('/^[a-z0-9-]+$/', $category) || !preg_match('/^[a-z0-9-]+$/', $slug)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found';
    exit;
}

$backendUrl = sprintf(
    'https://news4bharat.cloud/%s/%s',
    rawurlencode($category),
    rawurlencode($slug)
);

$html = false;
$statusCode = 502;
$contentType = 'text/html; charset=utf-8';

if (function_exists('curl_init')) {
    $ch = curl_init($backendUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => [
            'Accept: text/html',
            'User-Agent: News4Bharat-Article-Proxy/1.0',
            'X-Forwarded-Host: news4bharat.com',
            'X-Forwarded-Proto: https',
        ],
    ]);

    $html = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlContentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    if (is_string($curlContentType) && trim($curlContentType) !== '') {
        $contentType = $curlContentType;
    }
    curl_close($ch);
} else {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 12,
            'header' => implode("\r\n", [
                'Accept: text/html',
                'User-Agent: News4Bharat-Article-Proxy/1.0',
                'X-Forwarded-Host: news4bharat.com',
                'X-Forwarded-Proto: https',
            ]),
        ],
    ]);

    $html = @file_get_contents($backendUrl, false, $context);
    $statusCode = 200;

    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $headerLine) {
            if (preg_match('/^HTTP\/\S+\s+(\d+)/i', $headerLine, $match)) {
                $statusCode = (int) $match[1];
            } elseif (stripos($headerLine, 'Content-Type:') === 0) {
                $contentType = trim(substr($headerLine, strlen('Content-Type:')));
            }
        }
    }
}

if (!is_string($html) || $html === '' || $statusCode >= 400) {
    http_response_code($statusCode >= 400 ? $statusCode : 502);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    echo 'Article HTML unavailable';
    exit;
}

http_response_code($statusCode);
header('Content-Type: ' . $contentType);
header('Cache-Control: public, max-age=300, stale-while-revalidate=60');
header('X-Article-Proxy: backend-html');

echo $html;

<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $code = strtoupper(trim($input['code'] ?? ''));
    if ($code === '') {
        json_response(['ok' => false, 'error' => 'Code is vereist'], 400);
    }

    $stmt = $db->prepare('SELECT status FROM rooms WHERE code = ? LIMIT 1');
    $stmt->execute([$code]);
    $status = $stmt->fetchColumn();
    if ($status === false) {
        json_response(['ok' => false, 'error' => 'Onbekende spelcode'], 404);
    }

    json_response(['ok' => true, 'status' => $status]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}



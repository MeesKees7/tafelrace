<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $code = strtoupper(trim($input['code'] ?? ''));
    if ($code === '') {
        json_response(['ok' => false, 'error' => 'Code is vereist'], 400);
    }

    $stmt = $db->prepare('UPDATE rooms SET status = "gestart" WHERE code = ?');
    $stmt->execute([$code]);
    if ($stmt->rowCount() === 0) {
        json_response(['ok' => false, 'error' => 'Onbekende spelcode'], 404);
    }

    json_response(['ok' => true]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}



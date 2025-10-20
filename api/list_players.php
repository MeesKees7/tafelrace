<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $code = strtoupper(trim($input['code'] ?? ''));
    if ($code === '') {
        json_response(['ok' => false, 'error' => 'Code is vereist'], 400);
    }

    $stmt = $db->prepare('SELECT name FROM players WHERE room_code = ? ORDER BY id ASC');
    $stmt->execute([$code]);
    $players = array_map(function($row){
        return ['name' => $row['name']];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    json_response(['ok' => true, 'players' => $players]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}



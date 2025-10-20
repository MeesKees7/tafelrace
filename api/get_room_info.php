<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $code = strtoupper(trim($input['code'] ?? ''));
    
    if ($code === '') {
        json_response(['ok' => false, 'error' => 'Code is vereist'], 400);
    }

    // Haal room informatie op
    $stmt = $db->prepare('SELECT table_config, status FROM rooms WHERE code = ?');
    $stmt->execute([$code]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$room) {
        json_response(['ok' => false, 'error' => 'Room niet gevonden'], 404);
    }
    
    $selectedTables = $room['table_config'] ? json_decode($room['table_config'], true) : [];
    
    json_response([
        'ok' => true, 
        'selectedTables' => $selectedTables,
        'status' => $room['status']
    ]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}

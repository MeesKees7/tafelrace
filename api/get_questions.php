<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $code = strtoupper(trim($input['code'] ?? ''));
    
    if ($code === '') {
        json_response(['ok' => false, 'error' => 'Code is vereist'], 400);
    }

    // Haal vragen op voor deze room
    $stmt = $db->prepare('SELECT question_number, question, answer FROM game_questions WHERE room_code = ? ORDER BY question_number ASC');
    $stmt->execute([$code]);
    $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($questions)) {
        json_response(['ok' => false, 'error' => 'Geen vragen gevonden'], 404);
    }

    // Haal ook de geselecteerde tafels op
    $stmt = $db->prepare('SELECT table_config FROM rooms WHERE code = ?');
    $stmt->execute([$code]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    $selectedTables = $room ? json_decode($room['table_config'], true) : [];

    json_response(['ok' => true, 'questions' => $questions, 'selectedTables' => $selectedTables]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}

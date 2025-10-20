<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $code = strtoupper(trim($input['code'] ?? ''));
    
    if ($code === '') {
        json_response(['ok' => false, 'error' => 'Code is vereist'], 400);
    }

    // Haal tafel configuratie op
    $stmt = $db->prepare('SELECT table_config FROM rooms WHERE code = ? LIMIT 1');
    $stmt->execute([$code]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$row) {
        json_response(['ok' => false, 'error' => 'Onbekende spelcode'], 404);
    }
    
    $tableConfig = json_decode($row['table_config'], true);
    if (!$tableConfig || !is_array($tableConfig)) {
        json_response(['ok' => false, 'error' => 'Ongeldige tafel configuratie'], 400);
    }

    // Wis bestaande vragen voor deze room
    $stmt = $db->prepare('DELETE FROM game_questions WHERE room_code = ?');
    $stmt->execute([$code]);

    // Genereer 30 sommen
    $questions = [];
    for ($i = 1; $i <= 30; $i++) {
        // Selecteer willekeurige tafel
        $table = $tableConfig[array_rand($tableConfig)];
        
        // Selecteer willekeurig getal van 1-10
        $multiplier = rand(1, 10);
        
        $question = "$table × $multiplier";
        $answer = $table * $multiplier;
        
        $questions[] = [
            'question_number' => $i,
            'question' => $question,
            'answer' => $answer
        ];
        
        // Sla vraag op in database
        $stmt = $db->prepare('INSERT INTO game_questions(room_code, question_number, question, answer) VALUES(?, ?, ?, ?)');
        $stmt->execute([$code, $i, $question, $answer]);
    }

    json_response(['ok' => true, 'questions' => $questions]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}

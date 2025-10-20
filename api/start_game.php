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

    // Wis bestaande vragen en scores voor deze room
    $db->prepare('DELETE FROM game_questions WHERE room_code = ?')->execute([$code]);
    $db->prepare('DELETE FROM player_answers WHERE room_code = ?')->execute([$code]);
    $db->prepare('DELETE FROM player_scores WHERE room_code = ?')->execute([$code]);

    // Genereer 30 sommen (vaste set voor eerlijkheid)
    $questions = [];
    $questionCount = 0;
    
    // Maak een vaste lijst van alle mogelijke combinaties (andersom)
    $allCombinations = [];
    foreach ($tableConfig as $table) {
        for ($multiplier = 1; $multiplier <= 10; $multiplier++) {
            $allCombinations[] = [
                'table' => $table,
                'multiplier' => $multiplier,
                'question' => "$multiplier × $table",
                'answer' => $multiplier * $table
            ];
        }
    }
    
    // Shuffle de combinaties voor variatie, maar gebruik dezelfde seed voor alle rooms
    srand(crc32($code)); // Gebruik room code als seed voor reproduceerbaarheid
    shuffle($allCombinations);
    
    // Zorg ervoor dat we altijd 30 sommen hebben
    $questionsNeeded = 30;
    $questionsGenerated = [];
    
    // Als we niet genoeg unieke combinaties hebben, herhaal de combinaties
    while (count($questionsGenerated) < $questionsNeeded) {
        foreach ($allCombinations as $combo) {
            if (count($questionsGenerated) >= $questionsNeeded) break;
            
            $questionsGenerated[] = [
                'table' => $combo['table'],
                'multiplier' => $combo['multiplier'],
                'question' => $combo['question'],
                'answer' => $combo['answer']
            ];
        }
    }
    
    // Genereer de vragen voor de database
    for ($i = 0; $i < $questionsNeeded; $i++) {
        $combo = $questionsGenerated[$i];
        $questionNumber = $i + 1;
        
        $questions[] = [
            'question_number' => $questionNumber,
            'question' => $combo['question'],
            'answer' => $combo['answer']
        ];
        
        // Sla vraag op in database
        $stmt = $db->prepare('INSERT INTO game_questions(room_code, question_number, question, answer) VALUES(?, ?, ?, ?)');
        $stmt->execute([$code, $questionNumber, $combo['question'], $combo['answer']]);
    }

    // Update room status naar gestart
    $now = (new DateTimeImmutable('now'))->format(DateTimeInterface::ATOM);
    $stmt = $db->prepare('UPDATE rooms SET status = "gestart", game_started_at = ? WHERE code = ?');
    $stmt->execute([$now, $code]);
    if ($stmt->rowCount() === 0) {
        json_response(['ok' => false, 'error' => 'Onbekende spelcode'], 404);
    }

    json_response(['ok' => true, 'questions' => $questions, 'selectedTables' => $tableConfig]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}



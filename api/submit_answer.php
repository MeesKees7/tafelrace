<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $code = strtoupper(trim($input['code'] ?? ''));
    $playerName = trim($input['playerName'] ?? '');
    $questionNumber = (int)($input['questionNumber'] ?? 0);
    $answer = (int)($input['answer'] ?? 0);
    
    if ($code === '' || $playerName === '' || $questionNumber <= 0) {
        json_response(['ok' => false, 'error' => 'Code, speler naam en vraag nummer zijn vereist'], 400);
    }

    // Haal de juiste vraag op
    $stmt = $db->prepare('SELECT answer FROM game_questions WHERE room_code = ? AND question_number = ? LIMIT 1');
    $stmt->execute([$code, $questionNumber]);
    $correctAnswer = $stmt->fetchColumn();
    
    if ($correctAnswer === false) {
        json_response(['ok' => false, 'error' => 'Vraag niet gevonden'], 404);
    }
    
    $isCorrect = ($answer === (int)$correctAnswer);
    
    // Sla antwoord op (of update als het al bestaat)
    $stmt = $db->prepare('INSERT OR REPLACE INTO player_answers(room_code, player_name, question_number, answer, is_correct, answered_at) VALUES(?, ?, ?, ?, ?, ?)');
    $now = (new DateTimeImmutable('now'))->format(DateTimeInterface::ATOM);
    $stmt->execute([$code, $playerName, $questionNumber, $answer, $isCorrect ? 1 : 0, $now]);
    
    json_response([
        'ok' => true, 
        'isCorrect' => $isCorrect,
        'correctAnswer' => (int)$correctAnswer
    ]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}

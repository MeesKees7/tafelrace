<?php
require_once __DIR__ . '/db.php';

try {
    $db = get_db();
    $input = read_json();
    $code = strtoupper(trim($input['code'] ?? ''));
    
    if ($code === '') {
        json_response(['ok' => false, 'error' => 'Code is vereist'], 400);
    }

    // Haal alle spelers op en hun scores
    $stmt = $db->prepare('
        SELECT 
            p.name,
            COALESCE(SUM(pa.is_correct), 0) as correct_answers,
            COUNT(pa.id) as total_answers,
            ps.game_started_at,
            MAX(pa.answered_at) as last_answer
        FROM players p
        LEFT JOIN player_answers pa ON p.room_code = pa.room_code AND p.name = pa.player_name
        LEFT JOIN player_scores ps ON p.room_code = ps.room_code AND p.name = ps.player_name
        WHERE p.room_code = ?
        GROUP BY p.name
        ORDER BY correct_answers DESC, ps.game_started_at ASC
    ');
    $stmt->execute([$code]);
    $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Bereken tijd voor spelers die alle vragen hebben beantwoord
    foreach ($scores as &$score) {
        if ($score['correct_answers'] >= 30 && $score['game_started_at'] && $score['last_answer']) {
            $startTime = new DateTime($score['game_started_at']);
            $endTime = new DateTime($score['last_answer']);
            $score['total_time_seconds'] = $endTime->getTimestamp() - $startTime->getTimestamp();
        } else {
            $score['total_time_seconds'] = null;
        }
    }
    
    // Sorteer op score, dan op snelheid (voor spelers met 30 goede antwoorden)
    usort($scores, function($a, $b) {
        // Eerst op aantal correcte antwoorden
        if ($a['correct_answers'] != $b['correct_answers']) {
            return $b['correct_answers'] - $a['correct_answers'];
        }
        
        // Bij gelijke scores, sorteer op snelheid (snelste eerst)
        if ($a['correct_answers'] >= 30 && $b['correct_answers'] >= 30) {
            if ($a['total_time_seconds'] && $b['total_time_seconds']) {
                return $a['total_time_seconds'] - $b['total_time_seconds'];
            }
        }
        
        return 0;
    });
    
    json_response(['ok' => true, 'scores' => $scores]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => 'Serverfout: ' . $e->getMessage()], 500);
}

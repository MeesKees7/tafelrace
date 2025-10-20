<?php
// Eenvoudige PDO helper voor SQLite en DB-initialisatie

function get_db_path(): string {
    $root = dirname(__DIR__);
    $dataDir = $root . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0777, true);
    }
    return $dataDir . DIRECTORY_SEPARATOR . 'basiscomp.sqlite';
}

function get_db(): PDO {
    $dsn = 'sqlite:' . get_db_path();
    $pdo = new PDO($dsn);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    init_schema($pdo);
    return $pdo;
}

// Maakt tabellen indien nog niet aanwezig
function init_schema(PDO $pdo): void {
    $pdo->exec('CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT "wachtend",
        created_at TEXT NOT NULL
    )');

    $pdo->exec('CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        name TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        FOREIGN KEY(room_code) REFERENCES rooms(code) ON DELETE CASCADE
    )');
}

// JSON response helper
function json_response(array $payload, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

// Leest JSON body
function read_json(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Veilige code generator (A-Z 0-9)
function generate_code(int $length = 4): string {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // zonder I, O, 0, 1
    $out = '';
    for ($i = 0; $i < $length; $i++) {
        $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $out;
}



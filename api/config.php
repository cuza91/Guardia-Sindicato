<?php
// api/config.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT clave, valor FROM configuracion");
        $config = [];
        while ($row = $stmt->fetch()) {
            $config[$row['clave']] = $row['valor'];
        }
        sendJsonResponse($config);
        break;
        
    case 'POST':
        if (!isset($input['clave']) || !isset($input['valor'])) {
            sendJsonResponse(['error' => 'Clave y valor requeridos'], 400);
        }
        
        $stmt = $pdo->prepare("INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?");
        $stmt->execute([$input['clave'], $input['valor'], $input['valor']]);
        
        sendJsonResponse(['success' => true]);
        break;
        
    default:
        sendJsonResponse(['error' => 'Método no permitido'], 405);
}
?>
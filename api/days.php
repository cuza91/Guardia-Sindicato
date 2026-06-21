<?php
// api/days.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT fecha FROM dias_guardia ORDER BY fecha");
        $days = $stmt->fetchAll(PDO::FETCH_COLUMN);
        sendJsonResponse($days);
        break;
        
    case 'POST':
        if (!isset($input['fecha'])) {
            sendJsonResponse(['error' => 'Fecha requerida'], 400);
        }
        
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM dias_guardia WHERE fecha = ?");
        $stmt->execute([$input['fecha']]);
        if ($stmt->fetchColumn() > 0) {
            sendJsonResponse(['error' => 'El día ya existe'], 409);
        }
        
        $stmt = $pdo->prepare("INSERT INTO dias_guardia (fecha) VALUES (?)");
        $stmt->execute([$input['fecha']]);
        
        sendJsonResponse(['success' => true], 201);
        break;
        
    case 'DELETE':
        if (isset($_GET['fecha'])) {
            $fecha = $_GET['fecha'];
            $stmt = $pdo->prepare("DELETE FROM dias_guardia WHERE fecha = ?");
            $stmt->execute([$fecha]);
            sendJsonResponse(['success' => true]);
        } else {
            // Eliminar todos los días
            $pdo->exec("DELETE FROM dias_guardia");
            sendJsonResponse(['success' => true]);
        }
        break;
        
    default:
        sendJsonResponse(['error' => 'Método no permitido'], 405);
}
?>
<?php
// api/mensajes.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Obtener el usuario actual desde el frontend (se envía en cada petición)
// En este ejemplo se espera que el frontend envíe 'userId' en el body o en GET
$userId = null;
if ($method === 'GET' && isset($_GET['userId'])) {
    $userId = (int) $_GET['userId'];
} elseif (in_array($method, ['POST', 'PUT', 'DELETE']) && isset($input['userId'])) {
    $userId = (int) $input['userId'];
} else {
    sendJsonResponse(['error' => 'Usuario no autenticado'], 401);
}

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? 'inbox';
        if ($action === 'inbox') {
            // Mensajes recibidos
            $stmt = $pdo->prepare("SELECT m.*, u.username as sender_name 
                                   FROM mensajes m
                                   JOIN usuarios u ON m.sender_id = u.id
                                   WHERE m.receiver_id = ?
                                   ORDER BY m.created_at DESC");
            $stmt->execute([$userId]);
            $messages = $stmt->fetchAll();
            sendJsonResponse($messages);
        } elseif ($action === 'sent') {
            // Mensajes enviados
            $stmt = $pdo->prepare("SELECT m.*, u.username as receiver_name 
                                   FROM mensajes m
                                   JOIN usuarios u ON m.receiver_id = u.id
                                   WHERE m.sender_id = ?
                                   ORDER BY m.created_at DESC");
            $stmt->execute([$userId]);
            $messages = $stmt->fetchAll();
            sendJsonResponse($messages);
        } elseif ($action === 'unread_count') {
            // Contador de no leídos
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM mensajes WHERE receiver_id = ? AND is_read = 0");
            $stmt->execute([$userId]);
            $count = $stmt->fetch()['count'];
            sendJsonResponse(['count' => (int) $count]);
        } else {
            sendJsonResponse(['error' => 'Acción no válida'], 400);
        }
        break;

    case 'POST':
        // Enviar nuevo mensaje
        if (!isset($input['receiver_id']) || !isset($input['subject']) || !isset($input['message'])) {
            sendJsonResponse(['error' => 'Faltan datos: receiver_id, subject, message'], 400);
        }
        $receiverId = (int) $input['receiver_id'];
        $subject = trim($input['subject']);
        $message = trim($input['message']);
        if (empty($subject) || empty($message)) {
            sendJsonResponse(['error' => 'Asunto y mensaje no pueden estar vacíos'], 400);
        }
        if ($receiverId === $userId) {
            sendJsonResponse(['error' => 'No puedes enviarte un mensaje a ti mismo'], 400);
        }
        $stmt = $pdo->prepare("INSERT INTO mensajes (sender_id, receiver_id, subject, message) VALUES (?, ?, ?, ?)");
        $stmt->execute([$userId, $receiverId, $subject, $message]);
        sendJsonResponse(['success' => true, 'id' => $pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        // Marcar como leído
        if (!isset($_GET['id'])) {
            sendJsonResponse(['error' => 'ID de mensaje requerido'], 400);
        }
        $msgId = (int) $_GET['id'];
        // Verificar que el mensaje exista y que el usuario sea el destinatario
        $stmt = $pdo->prepare("SELECT receiver_id FROM mensajes WHERE id = ?");
        $stmt->execute([$msgId]);
        $msg = $stmt->fetch();
        if (!$msg) {
            sendJsonResponse(['error' => 'Mensaje no encontrado'], 404);
        }
        if ($msg['receiver_id'] != $userId) {
            sendJsonResponse(['error' => 'No tienes permiso para marcar este mensaje como leído'], 403);
        }
        $stmt = $pdo->prepare("UPDATE mensajes SET is_read = 1 WHERE id = ?");
        $stmt->execute([$msgId]);
        sendJsonResponse(['success' => true]);
        break;

    case 'DELETE':
        // Eliminar mensaje (solo si el usuario es remitente o destinatario)
        if (!isset($_GET['id'])) {
            sendJsonResponse(['error' => 'ID de mensaje requerido'], 400);
        }
        $msgId = (int) $_GET['id'];
        $stmt = $pdo->prepare("SELECT sender_id, receiver_id FROM mensajes WHERE id = ?");
        $stmt->execute([$msgId]);
        $msg = $stmt->fetch();
        if (!$msg) {
            sendJsonResponse(['error' => 'Mensaje no encontrado'], 404);
        }
        if ($msg['sender_id'] != $userId && $msg['receiver_id'] != $userId) {
            sendJsonResponse(['error' => 'No tienes permiso para eliminar este mensaje'], 403);
        }
        $stmt = $pdo->prepare("DELETE FROM mensajes WHERE id = ?");
        $stmt->execute([$msgId]);
        sendJsonResponse(['success' => true]);
        break;

    default:
        sendJsonResponse(['error' => 'Método no permitido'], 405);
}
?>
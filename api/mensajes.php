<?php
// api/mensajes.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Obtener el usuario actual desde el frontend
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

        // Obtener un mensaje específico por ID (para ver detalles)
        if ($action === 'get') {
            if (!isset($_GET['id'])) {
                sendJsonResponse(['error' => 'ID de mensaje requerido'], 400);
            }
            $msgId = (int) $_GET['id'];
            $stmt = $pdo->prepare("SELECT m.*, 
                                   u1.username as sender_name, 
                                   u2.username as receiver_name
                                   FROM mensajes m
                                   JOIN usuarios u1 ON m.sender_id = u1.id
                                   JOIN usuarios u2 ON m.receiver_id = u2.id
                                   WHERE m.id = ?");
            $stmt->execute([$msgId]);
            $msg = $stmt->fetch();
            if (!$msg) {
                sendJsonResponse(['error' => 'Mensaje no encontrado'], 404);
            }
            if ($msg['sender_id'] != $userId && $msg['receiver_id'] != $userId) {
                sendJsonResponse(['error' => 'No tienes permiso para ver este mensaje'], 403);
            }
            sendJsonResponse($msg);
            break;
        }

        if ($action === 'inbox') {
            $stmt = $pdo->prepare("SELECT m.*, u.username as sender_name 
                                   FROM mensajes m
                                   JOIN usuarios u ON m.sender_id = u.id
                                   WHERE m.receiver_id = ?
                                   ORDER BY m.created_at DESC");
            $stmt->execute([$userId]);
            $messages = $stmt->fetchAll();
            sendJsonResponse($messages);
        } elseif ($action === 'sent') {
            $stmt = $pdo->prepare("SELECT m.*, u.username as receiver_name 
                                   FROM mensajes m
                                   JOIN usuarios u ON m.receiver_id = u.id
                                   WHERE m.sender_id = ?
                                   ORDER BY m.created_at DESC");
            $stmt->execute([$userId]);
            $messages = $stmt->fetchAll();
            sendJsonResponse($messages);
        } elseif ($action === 'unread_count') {
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM mensajes WHERE receiver_id = ? AND is_read = 0");
            $stmt->execute([$userId]);
            $count = $stmt->fetch()['count'];
            sendJsonResponse(['count' => (int) $count]);
        } else {
            sendJsonResponse(['error' => 'Acción no válida'], 400);
        }
        break;

    case 'POST':
        // Enviar nuevo mensaje (individual o masivo)
        if (!isset($input['subject']) || !isset($input['message'])) {
            sendJsonResponse(['error' => 'Faltan datos: subject, message'], 400);
        }
        $subject = trim($input['subject']);
        $message = trim($input['message']);
        if (empty($subject) || empty($message)) {
            sendJsonResponse(['error' => 'Asunto y mensaje no pueden estar vacíos'], 400);
        }

        // Verificar si es envío masivo (array de receiver_ids)
        $receivers = [];
        if (isset($input['receiver_id']) && is_array($input['receiver_id'])) {
            $receivers = array_map('intval', $input['receiver_id']);
        } elseif (isset($input['receiver_id']) && is_numeric($input['receiver_id'])) {
            $receivers = [(int) $input['receiver_id']];
        } else {
            sendJsonResponse(['error' => 'Destinatario(s) no válido(s)'], 400);
        }

        if (empty($receivers)) {
            sendJsonResponse(['error' => 'Debes seleccionar al menos un destinatario'], 400);
        }

        // Validar que los destinatarios existan y no sean el mismo usuario
        $validReceivers = [];
        $placeholders = implode(',', array_fill(0, count($receivers), '?'));
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE id IN ($placeholders)");
        $stmt->execute($receivers);
        $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($receivers as $rid) {
            if (in_array($rid, $existing) && $rid !== $userId) {
                $validReceivers[] = $rid;
            }
        }

        if (empty($validReceivers)) {
            sendJsonResponse(['error' => 'No hay destinatarios válidos (o te intentaste enviar a ti mismo)'], 400);
        }

        // Insertar mensaje para cada destinatario
        $inserted = 0;
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO mensajes (sender_id, receiver_id, subject, message) VALUES (?, ?, ?, ?)");
            foreach ($validReceivers as $rid) {
                $stmt->execute([$userId, $rid, $subject, $message]);
                $inserted++;
            }
            $pdo->commit();
            sendJsonResponse([
                'success' => true,
                'sent' => $inserted,
                'total' => count($validReceivers)
            ], 201);
        } catch (Exception $e) {
            $pdo->rollBack();
            sendJsonResponse(['error' => 'Error al enviar mensajes: ' . $e->getMessage()], 500);
        }
        break;

    case 'PUT':
        if (!isset($_GET['id'])) {
            sendJsonResponse(['error' => 'ID de mensaje requerido'], 400);
        }
        $msgId = (int) $_GET['id'];
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
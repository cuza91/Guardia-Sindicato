<?php
// api/auth.php
require_once 'db.php';

// Obtener datos del request
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['action'])) {
    sendJsonResponse(['error' => 'Acción no especificada'], 400);
}

$action = $data['action'];

switch ($action) {
    case 'login':
        if (!isset($data['username']) || !isset($data['password'])) {
            sendJsonResponse(['error' => 'Usuario y contraseña requeridos'], 400);
        }

        $username = $data['username'];
        $password = $data['password'];

        // Obtener el usuario por username
        $stmt = $pdo->prepare("SELECT id, username, password, role, worker_id FROM usuarios WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user) {
            // Verificar la contraseña usando password_verify()
            if (password_verify($password, $user['password'])) {
                sendJsonResponse([
                    'success' => true,
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'role' => $user['role'],
                        'workerId' => $user['worker_id']
                    ]
                ]);
            } else {
                sendJsonResponse(['error' => 'Credenciales incorrectas'], 401);
            }
        } else {
            sendJsonResponse(['error' => 'Credenciales incorrectas'], 401);
        }
        break;

    default:
        sendJsonResponse(['error' => 'Acción no válida'], 400);
}
?>
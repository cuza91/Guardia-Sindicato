<?php
// api/usuarios.php - CRUD de usuarios
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        // Listar todos los usuarios (solo admin)
        $stmt = $pdo->query("SELECT id, username, role, worker_id, created_at FROM usuarios ORDER BY id");
        $users = $stmt->fetchAll();
        sendJsonResponse($users);
        break;

    case 'POST':
        // Crear nuevo usuario
        if (!isset($input['username']) || !isset($input['password']) || !isset($input['role'])) {
            sendJsonResponse(['error' => 'Faltan datos: username, password, role'], 400);
        }
        $username = trim($input['username']);
        $password = $input['password'];
        $role = $input['role'];
        $worker_id = isset($input['worker_id']) ? (int) $input['worker_id'] : null;

        // Validar que el rol sea válido
        if (!in_array($role, ['admin', 'worker'])) {
            sendJsonResponse(['error' => 'Rol inválido. Debe ser admin o worker'], 400);
        }

        // Verificar si el usuario ya existe
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetchColumn() > 0) {
            sendJsonResponse(['error' => 'El nombre de usuario ya existe'], 409);
        }

        // Hash de la contraseña
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // Insertar
        $stmt = $pdo->prepare("INSERT INTO usuarios (username, password, role, worker_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$username, $hashedPassword, $role, $worker_id]);
        $newId = $pdo->lastInsertId();

        sendJsonResponse([
            'success' => true,
            'id' => $newId,
            'username' => $username,
            'role' => $role,
            'worker_id' => $worker_id
        ], 201);
        break;

    case 'PUT':
        // Actualizar usuario (incluyendo posible cambio de contraseña)
        if (!isset($_GET['id'])) {
            sendJsonResponse(['error' => 'ID requerido'], 400);
        }
        $id = (int) $_GET['id'];
        $fields = [];
        $params = [];

        if (isset($input['username'])) {
            $username = trim($input['username']);
            // Verificar que no exista otro con ese nombre
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE username = ? AND id != ?");
            $stmt->execute([$username, $id]);
            if ($stmt->fetchColumn() > 0) {
                sendJsonResponse(['error' => 'El nombre de usuario ya está en uso'], 409);
            }
            $fields[] = "username = ?";
            $params[] = $username;
        }
        if (isset($input['role'])) {
            if (!in_array($input['role'], ['admin', 'worker'])) {
                sendJsonResponse(['error' => 'Rol inválido'], 400);
            }
            $fields[] = "role = ?";
            $params[] = $input['role'];
        }
        if (isset($input['worker_id'])) {
            $fields[] = "worker_id = ?";
            $params[] = $input['worker_id'] ? (int) $input['worker_id'] : null;
        }
        if (isset($input['password']) && !empty($input['password'])) {
            // Actualizar contraseña
            $hashed = password_hash($input['password'], PASSWORD_DEFAULT);
            $fields[] = "password = ?";
            $params[] = $hashed;
        }

        if (empty($fields)) {
            sendJsonResponse(['error' => 'No hay datos para actualizar'], 400);
        }

        $params[] = $id;
        $sql = "UPDATE usuarios SET " . implode(", ", $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        sendJsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (!isset($_GET['id'])) {
            sendJsonResponse(['error' => 'ID requerido'], 400);
        }
        $id = (int) $_GET['id'];
        // Evitar eliminar al propio usuario admin (opcional)
        $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
        $stmt->execute([$id]);
        if ($stmt->rowCount() > 0) {
            sendJsonResponse(['success' => true]);
        } else {
            sendJsonResponse(['error' => 'Usuario no encontrado'], 404);
        }
        break;

    default:
        sendJsonResponse(['error' => 'Método no permitido'], 405);
}
?>
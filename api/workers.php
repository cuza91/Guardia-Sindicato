<?php
// api/workers.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        // Obtener todos los trabajadores
        $stmt = $pdo->query("SELECT * FROM trabajadores ORDER BY nombre");
        $workers = $stmt->fetchAll();
        sendJsonResponse($workers);
        break;
        
    case 'POST':
        // Crear nuevo trabajador
        if (!isset($input['nombre']) || empty($input['nombre'])) {
            sendJsonResponse(['error' => 'Nombre requerido'], 400);
        }
        
        $id = time() * 1000 + rand(0, 999); // ID similar a Date.now()
        $stmt = $pdo->prepare("INSERT INTO trabajadores (id, nombre) VALUES (?, ?)");
        $stmt->execute([$id, $input['nombre']]);
        
        sendJsonResponse(['success' => true, 'id' => $id, 'nombre' => $input['nombre']], 201);
        break;
        
    case 'PUT':
        // Actualizar trabajador
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        if (!$id || !isset($input['nombre'])) {
            sendJsonResponse(['error' => 'ID y nombre requeridos'], 400);
        }
        
        $stmt = $pdo->prepare("UPDATE trabajadores SET nombre = ? WHERE id = ?");
        $stmt->execute([$input['nombre'], $id]);
        
        sendJsonResponse(['success' => true]);
        break;
        
    case 'DELETE':
        // Eliminar trabajador
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        if (!$id) {
            sendJsonResponse(['error' => 'ID requerido'], 400);
        }
        
        // Verificar si tiene guardias
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM guardias WHERE worker_id = ?");
        $stmt->execute([$id]);
        $count = $stmt->fetch()['count'];
        
        if ($count > 0) {
            // Opcional: Reasignar o eliminar guardias
            if (isset($input['force']) && $input['force'] === true) {
                // Eliminar guardias asociadas
                $stmt = $pdo->prepare("DELETE FROM guardias WHERE worker_id = ?");
                $stmt->execute([$id]);
            } else {
                sendJsonResponse(['error' => 'El trabajador tiene guardias asignadas', 'guard_count' => $count], 409);
            }
        }
        
        $stmt = $pdo->prepare("DELETE FROM trabajadores WHERE id = ?");
        $stmt->execute([$id]);
        
        sendJsonResponse(['success' => true]);
        break;
        
    default:
        sendJsonResponse(['error' => 'Método no permitido'], 405);
}
?>
<?php
// api/workers.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare("SELECT * FROM trabajadores WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $worker = $stmt->fetch();
            if ($worker) {
                sendJsonResponse($worker);
            } else {
                sendJsonResponse(['error' => 'Trabajador no encontrado'], 404);
            }
        } else {
            $stmt = $pdo->query("SELECT * FROM trabajadores ORDER BY nombre");
            $workers = $stmt->fetchAll();
            sendJsonResponse($workers);
        }
        break;
        
    case 'POST':
        if (!isset($input['nombre']) || empty($input['nombre'])) {
            sendJsonResponse(['error' => 'Nombre requerido'], 400);
        }
        
        // Si se envía un ID específico, usarlo; si no, generar uno
        if (isset($input['id']) && $input['id']) {
            $id = $input['id'];
            // Verificar si ya existe
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM trabajadores WHERE id = ?");
            $stmt->execute([$id]);
            if ($stmt->fetchColumn() > 0) {
                sendJsonResponse(['error' => 'El trabajador ya existe'], 409);
            }
        } else {
            $id = time() * 1000 + rand(0, 999);
        }
        
        $stmt = $pdo->prepare("INSERT INTO trabajadores (id, nombre) VALUES (?, ?)");
        $stmt->execute([$id, $input['nombre']]);
        
        sendJsonResponse(['success' => true, 'id' => $id, 'nombre' => $input['nombre']], 201);
        break;
        
    case 'PUT':
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        if (!$id || !isset($input['nombre'])) {
            sendJsonResponse(['error' => 'ID y nombre requeridos'], 400);
        }
        
        $stmt = $pdo->prepare("UPDATE trabajadores SET nombre = ? WHERE id = ?");
        $stmt->execute([$input['nombre'], $id]);
        
        sendJsonResponse(['success' => true]);
        break;
        
    case 'DELETE':
        if (isset($_GET['id'])) {
            $id = $_GET['id'];
            // Verificar si tiene guardias
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM guardias WHERE worker_id = ?");
            $stmt->execute([$id]);
            $count = $stmt->fetch()['count'];
            
            if ($count > 0 && (!isset($input['force']) || !$input['force'])) {
                sendJsonResponse(['error' => 'El trabajador tiene guardias asignadas', 'guard_count' => $count], 409);
            }
            
            // Si force=true, eliminar guardias asociadas
            if (isset($input['force']) && $input['force'] === true) {
                $stmt = $pdo->prepare("DELETE FROM guardias WHERE worker_id = ?");
                $stmt->execute([$id]);
            }
            
            $stmt = $pdo->prepare("DELETE FROM trabajadores WHERE id = ?");
            $stmt->execute([$id]);
            sendJsonResponse(['success' => true]);
        } else {
            // Eliminar todos los trabajadores (y sus guardias)
            $pdo->exec("DELETE FROM guardias");
            $pdo->exec("DELETE FROM trabajadores");
            sendJsonResponse(['success' => true]);
        }
        break;
        
    default:
        sendJsonResponse(['error' => 'Método no permitido'], 405);
}
?>
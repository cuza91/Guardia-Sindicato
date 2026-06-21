<?php
// api/guards.php
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        $filters = [];
        $params = [];
        
        if (isset($_GET['fecha'])) {
            $filters[] = "fecha = ?";
            $params[] = $_GET['fecha'];
        }
        if (isset($_GET['year'])) {
            $filters[] = "YEAR(fecha) = ?";
            $params[] = $_GET['year'];
        }
        if (isset($_GET['month'])) {
            $filters[] = "MONTH(fecha) = ?";
            $params[] = $_GET['month'];
        }
        if (isset($_GET['day'])) {
            $filters[] = "DAY(fecha) = ?";
            $params[] = $_GET['day'];
        }
        if (isset($_GET['worker_id'])) {
            if ($_GET['worker_id'] === 'null') {
                $filters[] = "worker_id IS NULL";
            } else {
                $filters[] = "worker_id = ?";
                $params[] = $_GET['worker_id'];
            }
        }
        if (isset($_GET['catedra']) && $_GET['catedra'] !== 'all') {
            $filters[] = "catedra = ?";
            $params[] = $_GET['catedra'];
        }
        if (isset($_GET['completed']) && $_GET['completed'] !== 'all') {
            $filters[] = "completada = ?";
            $params[] = $_GET['completed'] === 'true' ? 1 : 0;
        }
        
        $sql = "SELECT * FROM guardias";
        if (!empty($filters)) {
            $sql .= " WHERE " . implode(" AND ", $filters);
        }
        $sql .= " ORDER BY fecha ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $guards = $stmt->fetchAll();
        
        sendJsonResponse($guards);
        break;
        
    case 'POST':
        if (!isset($input['fecha'])) {
            sendJsonResponse(['error' => 'Fecha requerida'], 400);
        }
        
        // Si se envía un ID específico
        if (isset($input['id']) && $input['id']) {
            $id = $input['id'];
            $stmt = $pdo->prepare("INSERT INTO guardias (id, fecha, worker_id, completada, catedra, notas) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id,
                $input['fecha'],
                $input['worker_id'] ?? null,
                $input['completada'] ?? 0,
                $input['catedra'] ?? '',
                $input['notas'] ?? ''
            ]);
            sendJsonResponse(['success' => true, 'id' => $id], 201);
        } else {
            $stmt = $pdo->prepare("INSERT INTO guardias (fecha, worker_id, completada, catedra, notas) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['fecha'],
                $input['worker_id'] ?? null,
                $input['completada'] ?? 0,
                $input['catedra'] ?? '',
                $input['notas'] ?? ''
            ]);
            $id = $pdo->lastInsertId();
            sendJsonResponse(['success' => true, 'id' => $id], 201);
        }
        break;
        
    case 'PUT':
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        if (!$id) {
            sendJsonResponse(['error' => 'ID requerido'], 400);
        }
        
        $sets = [];
        $params = [];
        
        if (isset($input['fecha'])) {
            $sets[] = "fecha = ?";
            $params[] = $input['fecha'];
        }
        if (isset($input['worker_id'])) {
            $sets[] = "worker_id = ?";
            $params[] = $input['worker_id'];
        }
        if (isset($input['completada'])) {
            $sets[] = "completada = ?";
            $params[] = $input['completada'] ? 1 : 0;
        }
        if (isset($input['catedra'])) {
            $sets[] = "catedra = ?";
            $params[] = $input['catedra'];
        }
        if (isset($input['notas'])) {
            $sets[] = "notas = ?";
            $params[] = $input['notas'];
        }
        
        if (empty($sets)) {
            sendJsonResponse(['error' => 'No hay datos para actualizar'], 400);
        }
        
        $params[] = $id;
        $sql = "UPDATE guardias SET " . implode(", ", $sets) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        sendJsonResponse(['success' => true]);
        break;
        
    case 'DELETE':
        if (isset($_GET['id'])) {
            $id = $_GET['id'];
            $stmt = $pdo->prepare("DELETE FROM guardias WHERE id = ?");
            $stmt->execute([$id]);
            sendJsonResponse(['success' => true]);
        } elseif (isset($_GET['worker_id'])) {
            $workerId = $_GET['worker_id'];
            $stmt = $pdo->prepare("DELETE FROM guardias WHERE worker_id = ?");
            $stmt->execute([$workerId]);
            sendJsonResponse(['success' => true]);
        } else {
            // Eliminar todas las guardias
            $pdo->exec("DELETE FROM guardias");
            sendJsonResponse(['success' => true]);
        }
        break;
        
    default:
        sendJsonResponse(['error' => 'Método no permitido'], 405);
}
?>
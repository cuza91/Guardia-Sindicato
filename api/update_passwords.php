<?php
// api/update_passwords.php
// EJECUTAR UNA SOLA VEZ para actualizar contraseñas existentes
// Este archivo debe eliminarse después de ejecutarlo

require_once 'db.php';

// Verificar si se está ejecutando desde el navegador
// o desde línea de comandos
$isCli = php_sapi_name() === 'cli';

if (!$isCli) {
    // Si se ejecuta desde navegador, pedir confirmación
    if (!isset($_GET['confirm']) || $_GET['confirm'] !== 'yes') {
        echo '<h1>⚠️ Actualización de contraseñas</h1>';
        echo '<p>Este script actualizará todas las contraseñas de la base de datos a su versión hasheada.</p>';
        echo '<p><strong>¡Asegúrate de hacer un backup antes de continuar!</strong></p>';
        echo '<a href="?confirm=yes" style="background:#dc3545;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;">✓ Confirmar y ejecutar</a>';
        echo ' <a href="../index.html" style="background:#6c757d;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Cancelar</a>';
        exit;
    }
}

// Obtener todos los usuarios
$stmt = $pdo->query("SELECT id, username, password FROM usuarios");
$users = $stmt->fetchAll();

if (empty($users)) {
    echo "No hay usuarios para actualizar.\n";
    exit;
}

$updated = 0;
$skipped = 0;

foreach ($users as $user) {
    $password = $user['password'];
    
    // Verificar si la contraseña ya está hasheada
    // Los hashes de password_hash() siempre comienzan con $2y$
    if (strpos($password, '$2y$') === 0) {
        echo "⏭️ Usuario '{$user['username']}' - contraseña ya hasheada, omitido.\n";
        $skipped++;
        continue;
    }
    
    // Hashear la contraseña
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Actualizar en la base de datos
    $updateStmt = $pdo->prepare("UPDATE usuarios SET password = ? WHERE id = ?");
    $updateStmt->execute([$hashedPassword, $user['id']]);
    
    echo "✅ Usuario '{$user['username']}' - contraseña actualizada.\n";
    $updated++;
}

echo "\n--- Resumen ---\n";
echo "✅ Contraseñas actualizadas: $updated\n";
echo "⏭️ Contraseñas ya hasheadas (omitidas): $skipped\n";
echo "📊 Total de usuarios procesados: " . count($users) . "\n";

if (!$isCli) {
    echo '<p><a href="../index.html" style="background:#0d6efd;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Volver a la aplicación</a></p>';
    echo '<p style="color:#dc3545;font-weight:bold;">⚠️ Elimina este archivo (update_passwords.php) después de ejecutarlo por seguridad.</p>';
}
?>
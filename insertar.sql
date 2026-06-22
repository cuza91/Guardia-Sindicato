-- Insertar usuarios con contraseñas hasheadas
-- Para generar un hash de una contraseña, usa: echo password_hash('tu_contraseña', PASSWORD_DEFAULT);

-- admin / admin
INSERT INTO usuarios (username, password, role, worker_id) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL);

-- miguel / miguel
INSERT INTO usuarios (username, password, role, worker_id) VALUES 
('miguel', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'worker', 1781469978315);

-- yiya / yiya
INSERT INTO usuarios (username, password, role, worker_id) VALUES 
('yiya', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'worker', 1781469978352);

-- yami / yami
INSERT INTO usuarios (username, password, role, worker_id) VALUES 
('yami', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'worker', 1781469978354);
-- ============================================
--  Electromedical CMMS - Esquema PostgreSQL
--  Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================

DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS mantenimientos CASCADE;
DROP TABLE IF EXISTS equipos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Tabla: usuarios
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin','usuario','cliente')),
  empresa VARCHAR(255) DEFAULT 'Electromedical',
  activo BOOLEAN DEFAULT true,
  fecha_registro DATE DEFAULT CURRENT_DATE
);

-- Tabla: equipos
CREATE TABLE equipos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(255) NOT NULL,
  area VARCHAR(255) NOT NULL,
  marca VARCHAR(255),
  modelo VARCHAR(255),
  num_serie VARCHAR(255),
  frecuencia_meses INTEGER NOT NULL,
  ultimo_mantenimiento DATE,
  proximo_mantenimiento DATE,
  empresa VARCHAR(255) DEFAULT 'Sin asignar',
  estado VARCHAR(50) DEFAULT 'al_dia',
  fecha_registro DATE DEFAULT CURRENT_DATE
);

-- Tabla: mantenimientos
CREATE TABLE mantenimientos (
  id SERIAL PRIMARY KEY,
  equipo_id INTEGER REFERENCES equipos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Preventivo','Correctivo')),
  fecha DATE NOT NULL,
  tecnico VARCHAR(255) NOT NULL,
  descripcion TEXT,
  observaciones TEXT,
  costo NUMERIC(10,2),
  registrado_por VARCHAR(255)
);

-- Tabla: tickets
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  equipo_id INTEGER REFERENCES equipos(id) ON DELETE CASCADE,
  tipo_falla VARCHAR(255) DEFAULT 'Sin especificar',
  descripcion TEXT NOT NULL,
  reportado_por VARCHAR(255) NOT NULL,
  reportado_por_id INTEGER REFERENCES usuarios(id),
  contacto VARCHAR(255),
  estatus VARCHAR(50) DEFAULT 'abierto' CHECK (estatus IN ('abierto','en_proceso','cerrado')),
  asignado_a VARCHAR(255),
  asignado_a_id INTEGER REFERENCES usuarios(id),
  notas_tecnico TEXT,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_atencion TIMESTAMP,
  fecha_cierre TIMESTAMP
);

-- ============================================
--  Datos de prueba (Seed)
--  Las contraseñas se generan con bcrypt.
--  Para generarlas local: node -e "console.log(require('bcryptjs').hashSync('Admin2026',10))"
--  Valores pre-generados:
--    Admin2026  → $2a$10$...
-- ============================================

-- NOTA: Reemplaza los hash de abajo con los reales generados con bcryptjs
-- Para desarrollo usa esta función JS desde la app (seeder automático)

-- Seed de usuarios (passwords hasheadas con bcryptjs - salt 10)
INSERT INTO usuarios (nombre, email, password, rol, empresa) VALUES
  ('Administrador',    'admin@electromedical.com',    '$2a$10$Vnk.fr9rQzlF64YDMBV7huUR4wokwqYzf95BGaYWyyziMfN68G.ta', 'admin',   'Electromedical'),
  ('Ing. Carlos Ruiz', 'carlos@electromedical.com',   '$2a$10$ClOjRqwIdCxaJ263W2.JsuCNQbhEP5L8YJLlAvG7A2oG1.cKvi7ka', 'usuario', 'Electromedical'),
  ('Hospital Regional','hospital@cliente.com',        '$2a$10$rjz1wX2Zav4vWU1qZCs6qezdP..DxbooIIZlBNurTQAyzQHkAM5Q2', 'cliente', 'Hospital Regional del Norte');

-- Seed de equipos
INSERT INTO equipos (codigo, nombre, tipo, area, marca, modelo, num_serie, frecuencia_meses, ultimo_mantenimiento, proximo_mantenimiento, empresa, estado) VALUES
  ('BIO-001', 'Ventilador Mecánico A',    'Ventilador mecánico',       'UCI',            'Maquet',  'SERVO-i',       'SN-2021-001', 3,  '2024-11-01', '2025-02-01', 'Hospital Regional del Norte', 'vencido'),
  ('BIO-002', 'Monitor Signos Vitales 1', 'Monitor de signos vitales', 'Urgencias',      'Philips', 'MX450',         'SN-2022-045', 6,  '2025-03-15', '2025-09-15', 'Hospital Regional del Norte', 'al_dia'),
  ('BIO-003', 'Desfibrilador UCI',        'Desfibrilador',             'UCI',            'Zoll',    'R Series',      'SN-2020-012', 3,  '2025-01-10', '2025-04-10', 'Hospital Regional del Norte', 'vencido'),
  ('BIO-004', 'Bomba Infusión Quirófano', 'Bomba de infusión',         'Quirófano',      'Baxter',  'Sigma Spectrum','SN-2023-088', 6,  '2025-02-20', '2025-08-20', 'Hospital Regional del Norte', 'al_dia'),
  ('BIO-005', 'Cama Hospitalaria Piso 2', 'Cama hospitalaria',         'Hospitalización','Hill-Rom','P500',          'SN-2019-200', 12, '2024-05-01', '2025-05-01', 'Hospital Regional del Norte', 'proximo');

-- Seed de mantenimientos
INSERT INTO mantenimientos (equipo_id, tipo, fecha, tecnico, descripcion, observaciones, costo, registrado_por) VALUES
  (1, 'Preventivo', '2024-11-01', 'Ing. Carlos Ruiz', 'Mantenimiento preventivo trimestral', 'Todo en orden', 1200, 'Administrador'),
  (2, 'Preventivo', '2025-03-15', 'Ing. María López', 'Revisión semestral completa', 'Cambio de batería', 850, 'Administrador'),
  (3, 'Correctivo', '2025-01-10', 'Ing. Carlos Ruiz', 'Falla en pantalla', 'Se reemplazó módulo de pantalla', 3500, 'Administrador');

-- Seed de tickets
INSERT INTO tickets (equipo_id, tipo_falla, descripcion, reportado_por, reportado_por_id, contacto, estatus, fecha_creacion) VALUES
  (2, 'Alarma constante', 'El monitor suena constantemente', 'Enf. María González', 3, 'Ext. 201', 'abierto', NOW()),
  (1, 'No enciende', 'El ventilador no enciende desde ayer', 'Dr. Ramírez', 3, 'Ext. 305', 'en_proceso', NOW() - INTERVAL '1 day');

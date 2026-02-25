DROP SCHEMA IF EXISTS inventario CASCADE;
CREATE SCHEMA inventario;
SET search_path TO inventario;

-- ================================================================
-- 1. TABLAS MAESTRAS (Simplificadas)
-- ================================================================

CREATE TABLE categoria (
    id_categoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE marca (
    id_marca BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE modo_adquisicion (
    id_adquisicion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE tipo_tercero (
    id_tipo_tercero BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- CAMBIO APLICADO: Sin ubicación física
CREATE TABLE area_municipal (
    id_area BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE
);

-- ================================================================
-- 2. USUARIOS Y TERCEROS
-- ================================================================

CREATE TABLE subcategoria (
    id_subcategoria BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    id_categoria BIGINT NOT NULL REFERENCES categoria(id_categoria),
    CONSTRAINT uq_subcat_nombre UNIQUE (nombre, id_categoria)
);

CREATE TABLE usuario (
    id_usuario BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE,
    cargo TEXT,
    id_area BIGINT REFERENCES area_municipal(id_area)
);

-- CAMBIO APLICADO: Sin id_area (Es exclusivo TI)
CREATE TABLE user_adm (
    id_user_adm BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    cargo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() -- Se llena solo
);

CREATE TABLE tercero (
    id_tercero BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rut TEXT UNIQUE,
    nombre TEXT NOT NULL,
    email TEXT,
    direccion TEXT,
    id_tipo_tercero BIGINT NOT NULL REFERENCES tipo_tercero(id_tipo_tercero)
);

-- ================================================================
-- 3. ITEM (Genérico)
-- ================================================================

CREATE TABLE item (
    id_item BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_interno TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    modelo TEXT,
    descripcion TEXT,
    vida_util_meses INT, 
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    condicion_fisica TEXT,
    activo BOOLEAN DEFAULT TRUE,
    
    id_adquisicion BIGINT REFERENCES modo_adquisicion(id_adquisicion),
    id_subcategoria BIGINT NOT NULL REFERENCES subcategoria(id_subcategoria),
    id_marca BIGINT REFERENCES marca(id_marca),
    
    id_user_actual BIGINT REFERENCES usuario(id_usuario),
    id_area_actual BIGINT REFERENCES area_municipal(id_area),
    
    CONSTRAINT chk_custodia_exclusiva CHECK (
        (id_user_actual IS NOT NULL AND id_area_actual IS NULL) OR
        (id_user_actual IS NULL AND id_area_actual IS NOT NULL) OR
        (id_user_actual IS NULL AND id_area_actual IS NULL)
    )
);

-- ================================================================
-- 4. FICHAS TÉCNICAS (Detalles específicos)
-- ================================================================

CREATE TABLE ficha_tecnica_tecno (
    id_ficha_tecno BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_item BIGINT NOT NULL UNIQUE REFERENCES item(id_item) ON DELETE CASCADE,
    serial TEXT, 
    procesador TEXT,
    memoria_ram TEXT,
    disco_duro TEXT,
    direccion_ip TEXT,
    sistema_operativo TEXT,
    host_name TEXT
);

CREATE TABLE ficha_tecnica_muebles (
    id_ficha_mueble BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_item BIGINT NOT NULL UNIQUE REFERENCES item(id_item) ON DELETE CASCADE,
    material TEXT,
    color TEXT,
    dimensiones TEXT
);

-- ================================================================
-- 5. MOVIMIENTOS Y MANTENCIONES
-- ================================================================

CREATE TABLE mantencion (
    id_mantencion BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha DATE DEFAULT CURRENT_DATE,
    descripcion TEXT NOT NULL,
    id_es_mantencion BIGINT NOT NULL, 
    id_item BIGINT NOT NULL REFERENCES item(id_item),
    id_solicitante BIGINT REFERENCES usuario(id_usuario)
);

CREATE TABLE movimiento (
    id_movimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    observacion TEXT,
    id_tipo_movimiento BIGINT NOT NULL,
    id_item BIGINT NOT NULL REFERENCES item(id_item),
    id_registro_adm BIGINT NOT NULL REFERENCES user_adm(id_user_adm),
    
    origen_id_area BIGINT REFERENCES area_municipal(id_area),
    origen_id_usuario BIGINT REFERENCES usuario(id_usuario),
    origen_id_tercero BIGINT REFERENCES tercero(id_tercero),
    
    destino_id_area BIGINT REFERENCES area_municipal(id_area),
    destino_id_usuario BIGINT REFERENCES usuario(id_usuario),
    destino_id_tercero BIGINT REFERENCES tercero(id_tercero)
);

-- ================================================================
-- DATOS DE PRUEBA (SEED)
-- ================================================================

INSERT INTO categoria (nombre, descripcion) VALUES ('Tecnología', 'Equipos informáticos');
INSERT INTO categoria (nombre, descripcion) VALUES ('Mobiliario', 'Muebles de oficina');
INSERT INTO subcategoria (nombre, id_categoria) VALUES ('Notebooks', 1);
INSERT INTO subcategoria (nombre, id_categoria) VALUES ('Sillas', 2);
INSERT INTO modo_adquisicion (nombre) VALUES ('Compra Directa');

-- Item 1: Notebook
INSERT INTO item (codigo_interno, nombre, modelo, descripcion, vida_util_meses, id_subcategoria, id_adquisicion, activo)
VALUES ('TIC-001', 'Notebook HP ProBook', '450 G8', 'Para Finanzas', 36, 1, 1, true);

-- Item 2: Silla
INSERT INTO item (codigo_interno, nombre, modelo, descripcion, vida_util_meses, id_subcategoria, id_adquisicion, activo)
VALUES ('MUE-001', 'Silla Ergonómica', 'X500', 'Silla Gerencia', 60, 2, 1, true);

-- Ficha Notebook (Aquí va el serial)
INSERT INTO ficha_tecnica_tecno (id_item, serial, procesador, memoria_ram) 
VALUES (1, 'CNU12345XYZ', 'Intel i5', '16GB');

-- Ficha Silla
INSERT INTO ficha_tecnica_muebles (id_item, material, color)
VALUES (2, 'Malla y Plástico', 'Negro');


INSERT INTO marca (nombre) VALUES
('HP'), ('Dell'), ('Lenovo'), ('Samsung'), ('LG'), ('Genérica')
ON CONFLICT (nombre) DO NOTHING;


-- se agrego el tipo en marca 
ALTER TABLE inventario.marca
ADD COLUMN tipo VARCHAR(10) NOT NULL DEFAULT 'TECNO';

ALTER TABLE inventario.marca
ADD CONSTRAINT marca_tipo_chk CHECK (tipo IN ('TECNO','MUEBLE'));

-- Cambiar el UNIQUE: ya NO puede ser global solo por nombre
ALTER TABLE inventario.marca
DROP CONSTRAINT marca_nombre_key;  -- (ojo: el nombre exacto puede variar)

CREATE UNIQUE INDEX marca_nombre_tipo_uq
ON inventario.marca (LOWER(nombre), tipo);


--INSERTAR USUARIO Y AREA MUNICIAOL

INSERT INTO inventario.area_municipal (nombre)
VALUES
 ('Informática'),
 ('Finanzas'),
 ('DIDECO'),
 ('BODEGA'),
 ('Obras Municipales'),
 ('Administración'),
 ('Alcaldía')
ON CONFLICT (nombre) DO NOTHING;


INSERT INTO inventario.usuario (nombre, email, cargo, id_area)
VALUES
 ('Juan Pérez', 'juan.perez@muni.cl', 'Encargado Informática', (SELECT id_area FROM inventario.area_municipal WHERE nombre='Informática')),
 ('María Soto', 'maria.soto@muni.cl', 'Encargada Bodega', 4),
 ('Pedro Díaz', 'pedro.diaz@muni.cl', 'Administrativo', (SELECT id_area FROM inventario.area_municipal WHERE nombre='Administración'))
ON CONFLICT (email) DO NOTHING;



--Crear tabla tipo_movimiento

-- 0.1) Tabla tipos
CREATE TABLE IF NOT EXISTS inventario.tipo_movimiento (
  id_tipo_movimiento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

-- 0.2) Tipos base
INSERT INTO inventario.tipo_movimiento (nombre)
VALUES ('ASIGNACION'), ('TRASLADO'), ('EDICION')
ON CONFLICT (nombre) DO NOTHING;

-- 0.3) FK movimiento -> tipo_movimiento (si aún no existe)
ALTER TABLE inventario.movimiento
ADD CONSTRAINT fk_movimiento_tipo
FOREIGN KEY (id_tipo_movimiento)
REFERENCES inventario.tipo_movimiento(id_tipo_movimiento);


-- áreas
INSERT INTO inventario.area_municipal (nombre)
VALUES
('Finanzas'),
('Informática'),
('SECPLAC'),
('Obras'),
('Alcaldía')
ON CONFLICT (nombre) DO NOTHING;

-- usuarios (con área opcional)
INSERT INTO inventario.usuario (nombre, email, cargo, id_area)
VALUES
('Juan Pérez', 'juan.perez@muni.cl', 'Encargado', (SELECT id_area FROM inventario.area_municipal WHERE nombre='Informática')),
('María Soto', 'maria.soto@muni.cl', 'Administrativa', (SELECT id_area FROM inventario.area_municipal WHERE nombre='Finanzas')),
('Pedro Rojas', 'pedro.rojas@muni.cl', 'Técnico', 2);
# ARCHITECTURE MASTER PLAN - DELocalSoy.AR v8.0

## Vision General

Plataforma de **Innovacion Territorial Civica** con ecosistema de IA sinergica multi-agente, disenada para activar nodos territoriales que generen cambio positivo en comunidades.

## Principios de Diseno

### 1. Arquitectura Hexagonal (Clean Architecture)
- Core Domain: Logica de negocio territorial (nodos, comunidades, eventos)
- Ports: Interfaces bien definidas para entrada/salida
- Adapters: Implementaciones concretas (API, DB, IA, Frontend)

### 2. Patrones de Diseno
- CQRS: Separacion de comandos y consultas
- Event Sourcing: events_raw como fuente de verdad
- Repository Pattern: Acceso a datos abstracto
- Strategy Pattern: Algoritmos de IA intercambiables
- Observer Pattern: Notificaciones y webhooks

### 3. Calidad de Software
- DDD: Domain-Driven Design para modelo territorial
- TDD: Desarrollo guiado por pruebas
- BDD: Especificaciones ejecutables
- Clean Code: Codigo legible y mantenible

---

## Arquitectura de Capas

### Capa 1: Infraestructura
- Docker Compose (PostGIS, Redis, RabbitMQ)
- Kubernetes (para produccion)
- Terraform (IaC)
- GitHub Actions (CI/CD)
- Monitoring (Prometheus, Grafana)
- Logging (ELK Stack)
- Tracing (Jaeger)

### Capa 2: Plataforma (Backend Services)
- API Gateway (Express)
- Authentication Service (JWT/OAuth2)
- Territorial Service (Nodos, Comunidades)
- Civic Service (Participacion, Proyectos)
- Event Bus (RabbitMQ)
- Cache (Redis)
- File Storage (MinIO)

### Capa 3: Aplicacion
- Use Cases: Gestion de Nodos, Activacion de Comunidades, Seguimiento de Proyectos
- Domain Models: Territorio, Nodo, Comunidad, Proyecto, Evento, Agente

### Capa 4: Presentacion (Frontend)
- Web App (Next.js) - Dashboard principal
- Mobile App (React Native) - Para campo
- Admin Panel - Gestion avanzada
- Public Portal - Visualizacion de datos
- Chat Interface - IA conversacional

---

## Modelos de Datos Principales

### 1. Territorio
- id, nombre, tipo (municipio/provincia/region), geometria (GeoJSON)
- provincia, pais, poblacion, densidad, areaKm2, activo

### 2. Nodo
- id, territorioId, nombre, tipo (activador/colaborador/coordinador)
- estado (inactivo/pendiente/activo/pausado/cerrado), nivel (1-5)
- capacidades, recursos, coordenadas, radioAccionKm
- fechaActivacion, ultimoHeartbeat, salud

### 3. Comunidad
- id, nodoId, nombre, tipo (vecinal/tematica/profesional)
- miembros, intereses, objetivo, estado, fechaCreacion
- canalComunicacion, frecuenciaReunion

### 4. Proyecto
- id, comunidadId, nodoId, titulo, descripcion
- tipo (social/ambiental/economico/educativo/tecnologico)
- estado, objetivos, tareas, presupuesto, fondosRecaudados
- impacto, fechaInicio, fechaFinEstimada, participantes

### 5. Evento
- id, tipo, titulo, descripcion, territorioId, nodoId, comunidadId
- fechaInicio, fechaFin, ubicacion, organizador, participantes
- estado, impacto, evidencia

### 6. Agente (IA/Humano)
- id, tipo (humano/ia/hibrido), nombre, rol
- habilidades, territorioId, nodoId, estado, configuracion
- historial, metricas

### 7. Conocimiento Territorial
- id, tipo (documento/dato/experiencia/patron/leccion)
- titulo, contenido, territorioId, nodoId, comunidadId
- tags, fuente, autor, version, estado, calidad
- embeddings (vector para busqueda semantica)

---

## Arquitectura de Backend

### Estructura del Monorepo
```
delocalsoy-ar/
├── apps/
│   ├── api/                    # API Gateway (Express)
│   │   ├── src/
│   │   │   ├── modules/       # Modulos por dominio
│   │   │   │   ├── territorios/
│   │   │   │   ├── nodos/
│   │   │   │   ├── comunidades/
│   │   │   │   ├── proyectos/
│   │   │   │   ├── eventos/
│   │   │   │   ├── agentes/
│   │   │   │   └── conocimiento/
│   │   │   ├── core/          # Nucleo de la aplicacion
│   │   │   │   ├── usecases/
│   │   │   │   ├── repositories/
│   │   │   │   ├── services/
│   │   │   │   └── domain/
│   │   │   ├── config/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   └── app.ts
│   │   └── tests/
│   │
│   └── frontend/               # Next.js Application
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── app/
│       │   ├── lib/
│       │   ├── hooks/
│       │   ├── store/
│       │   └── types/
│       └── tests/
│
├── packages/
│   ├── db/                    # Database Layer (Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       └── index.ts
│   │
│   ├── shared/                # Shared Code
│   │   ├── types/
│   │   ├── utils/
│   │   ├── constants/
│   │   └── errors/
│   │
│   └── ai/                    # IA Services
│       ├── core/
│       │   ├── agents/
│       │   ├── tools/
│       │   ├── models/
│       │   └── orchestrators/
│       ├── embeddings/
│       ├── vectorstore/
│       └── knowledge/
│
├── docs/
│   ├── ARCHITECTURE_STATE_v7.1.md
│   ├── ARCHITECTURE_MASTER_PLAN_v8.0.md
│   ├── EVIDENCIA.md
│   ├── DECISIONES.md
│   ├── GOBERNANZA.md
│   └── HITUB.md
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── package.json
├── turbo.json
└── README.md
```

### API Modules Structure
Cada modulo contiene:
- controllers/: Controladores HTTP
- services/: Logica de negocio
- repositories/: Acceso a datos
- dtos/: Data Transfer Objects
- entities/: Entidades de dominio
- usecases/: Casos de uso
- validators/: Validacion de datos
- constants/: Constantes del modulo

---

## API Design (REST v1)

### Base URL
- Production: https://api.delocalsoy.ar/v1
- Development: http://localhost:3000/v1

### Endpoints Principales

#### Autenticacion
- POST /auth/register - Registrar usuario
- POST /auth/login - Iniciar sesion
- POST /auth/refresh - Refrescar token
- POST /auth/logout - Cerrar sesion
- GET /auth/me - Obtener perfil

#### Territorios
- GET /territorios - Listar territorios
- GET /territorios/:id - Obtener territorio
- POST /territorios - Crear territorio
- PUT /territorios/:id - Actualizar territorio
- DELETE /territorios/:id - Eliminar territorio
- GET /territorios/:id/nodos - Nodos en territorio
- GET /territorios/:id/estats - Estadisticas

#### Nodos
- GET /nodos - Listar nodos
- GET /nodos/:id - Obtener nodo
- POST /nodos - Crear nodo
- PUT /nodos/:id - Actualizar nodo
- DELETE /nodos/:id - Eliminar nodo
- POST /nodos/:id/activate - Activar nodo
- POST /nodos/:id/heartbeat - Heartbeat

#### Comunidades, Proyectos, Eventos
- Endpoints similares para cada entidad

#### IA
- POST /ai/chat - Chat con IA
- POST /ai/analizar - Analisis con IA
- POST /ai/recomendar - Recomendaciones
- POST /ai/agentes - Operaciones multi-agente

#### Sistema
- GET /health - Estado de salud (EV-004)
- GET /version - Version de la API
- GET /docs - Documentacion Swagger

---

## Arquitectura de IA Sinergica

### Ecosistema Multi-Agente

#### Jerarquia de Agentes

Nivel 1 - Estrategicos:
- Chief Territorial Officer (CTO) - Supervisa nodos
- Chief Civic Officer (CCO) - Gestiona comunidades
- Chief Intelligence Officer (CIO) - Analiza datos

Nivel 2 - Tacticos:
- Territory Manager - Gestiona territorio
- Node Activator - Activa nodos
- Community Facilitator - Facilita colaboracion
- Project Coordinator - Coordina proyectos
- Data Analyst - Analiza datos

Nivel 3 - Operativos:
- Geo Spatial Analyst
- Document Processor
- Event Tracker
- Impact Assessor
- Knowledge Curator

Nivel 4 - Apoyo:
- Translator
- Summarizer
- QA Assistant
- Chat Assistant

### Herramientas de IA

1. GeoSpatialTool
- analyzeTerritory()
- findNearbyNodes()
- calculateDistance()
- generateHeatmap()
- predictGrowth()

2. KnowledgeTool
- extractFromDocument()
- generateSummary()
- classifyContent()
- findSimilar()
- semanticSearch()

3. ImpactTool
- assessProjectImpact()
- predictOutcomes()
- analyzeTrends()
- generateRecommendations()
- optimizeResourceAllocation()

4. CollaborationTool
- suggestPartnerships()
- resolveConflicts()
- scheduleEvents()
- matchSkillsToTasks()
- facilitateDiscussion()

---

## Base de Datos

### PostgreSQL + PostGIS (Principal)
- Extension PostGIS para soporte geoespacial
- Indices espaciales (GIST) para geometrias
- Indices para busqueda (GIN, ivfflat para embeddings)

### Schema Principal (Prisma)
```prisma
model Territorio {
  id          String   @id @default(cuid())
  nombre      String   @map("nombre")
  tipo        String   @map("tipo")
  geometria   Json     @map("geometria")  // GeoJSON
  centroide   Json     @map("centroide")  // GeoJSON Point
  codigoIne  String?  @map("codigo_ine")
  provincia   String   @map("provincia")
  pais        String   @default("Argentina") @map("pais")
  poblacion   Int?     @map("poblacion")
  densidad    Float?   @map("densidad")
  areaKm2     Float?   @map("area_km2")
  activo      Boolean  @default(true) @map("activo")
  creadoEn    DateTime @default(now()) @map("creado_en")
  actualizadoEn DateTime @updatedAt @map("actualizado_en")

  @@map("territorios")
}

model Nodo {
  id              String   @id @default(cuid())
  territorioId     String   @map("territorio_id")
  territorio       Territorio @relation(fields: [territorioId], references: [id])
  nombre           String   @map("nombre")
  tipo             String   @map("tipo")
  estado           String   @default("inactivo") @map("estado")
  nivel            Int      @default(1) @map("nivel")
  capacidades      String[] @map("capacidades")
  coordenadas      Json     @map("coordenadas")  // GeoJSON Point
  radioAccionKm   Float    @default(5.0) @map("radio_accion_km")
  fechaActivacion  DateTime? @map("fecha_activacion")
  ultimoHeartbeat  DateTime? @map("ultimo_heartbeat")
  salud            String   @default("optimo") @map("salud")

  @@map("nodos")
}

model Comunidad {
  id              String   @id @default(cuid())
  nodoId           String   @map("nodo_id")
  nodo             Nodo     @relation(fields: [nodoId], references: [id])
  nombre           String   @map("nombre")
  tipo             String   @map("tipo")
  miembros         Int      @default(0) @map("miembros")
  intereses        String[] @map("intereses")
  objetivo         String?  @map("objetivo")
  estado           String   @default("formando") @map("estado")
  fechaCreacion    DateTime @default(now()) @map("fecha_creacion")
  fechaUltimaActividad DateTime? @map("fecha_ultima_actividad")

  @@map("comunidades")
}

model Proyecto {
  id              String   @id @default(cuid())
  comunidadId      String   @map("comunidad_id")
  comunidad        Comunidad @relation(fields: [comunidadId], references: [id])
  nodoId           String   @map("nodo_id")
  nodo             Nodo     @relation(fields: [nodoId], references: [id])
  titulo           String   @map("titulo")
  descripcion     String?  @map("descripcion")
  tipo             String   @map("tipo")
  estado           String   @default("idea") @map("estado")
  presupuesto      Float?   @map("presupuesto")
  fondosRecaudados Float    @default(0) @map("fondos_recaudados")
  fechaInicio      DateTime? @map("fecha_inicio")
  fechaFinEstimada DateTime? @map("fecha_fin_estimada")
  fechaFinReal     DateTime? @map("fecha_fin_real")

  @@map("proyectos")
}

model Evento {
  id           String   @id @default(cuid())
  tipo         String   @map("tipo")
  titulo        String   @map("titulo")
  descripcion  String?  @map("descripcion")
  territorioId  String?  @map("territorio_id")
  nodoId        String?  @map("nodo_id")
  comunidadId   String?  @map("comunidad_id")
  proyectoId    String?  @map("proyecto_id")
  fechaInicio   DateTime @map("fecha_inicio")
  fechaFin      DateTime? @map("fecha_fin")
  ubicacion     Json?    @map("ubicacion")  // GeoJSON
  estado        String   @default("programado") @map("estado")

  @@unique([tipo, titulo, fechaInicio])
  @@map("eventos")
}

model Agente {
  id           String   @id @default(cuid())
  tipo         String   @map("tipo")  // humano, ia, hibrido
  nombre        String   @map("nombre")
  rol          String   @map("rol")
  habilidades   String[] @map("habilidades")
  territorioId  String?  @map("territorio_id")
  nodoId        String?  @map("nodo_id")
  estado        String   @default("activo") @map("estado")
  configuracion Json?    @map("configuracion")

  @@map("agentes")
}

model Conocimiento {
  id           String   @id @default(cuid())
  tipo         String   @map("tipo")
  titulo        String   @map("titulo")
  contenido     String   @map("contenido")
  territorioId  String?  @map("territorio_id")
  nodoId        String?  @map("nodo_id")
  comunidadId   String?  @map("comunidad_id")
  proyectoId    String?  @map("proyecto_id")
  tags         String[] @map("tags")
  fuente        String?  @map("fuente")
  autor         String?  @map("autor")
  version       String   @default("1.0") @map("version")
  estado        String   @default("borrador") @map("estado")
  calidad       Float?   @map("calidad")
  embeddings    Json?    @map("embeddings")  // Vector para busqueda semantica

  @@map("conocimientos")
}

// Source de verdad - Event Sourcing
model events_raw {
  id             String   @id @default(cuid())
  type           String   @map("type")
  payload        Json     @map("payload")
  hash           String   @unique @map("hash")  // SHA256 para idempotencia
  occurred_at    DateTime @map("occurred_at")
  ingested_at    DateTime @default(now()) @map("ingested_at")

  @@map("events_raw")
}

model evidencias {
  id          String   @id @default(cuid())
  code        String   @unique @map("code")  // EV-001, EV-002, etc.
  title       String   @map("title")
  status      String   @default("pendiente") @map("status")
  result      Json?    @map("result")
  verified_at DateTime? @map("verified_at")

  @@map("evidencias")
}
```

---

## Despliegue y DevOps

### Docker Compose (Development)
```yaml
version: '3.8'
services:
  db:
    image: postgis/postgis:16-3.4
    container_name: delocalsoy-db
    environment:
      POSTGRES_USER: delocalsoy
      POSTGRES_PASSWORD: delocalsoy
      POSTGRES_DB: delocalsoy
    ports:
      - '5432:5432'
    volumes:
      - delocalsoy_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U delocalsoy']
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    container_name: delocalsoy-redis
    ports:
      - '6379:6379'
    volumes:
      - delocalsoy_redisdata:/data
    command: redis-server --appendonly yes

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: delocalsoy-api
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://delocalsoy:delocalsoy@db:5432/delocalsoy?schema=public
      PORT: 3000
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    command: pnpm --filter @delocalsoy/api dev

volumes:
  delocalsoy_pgdata:
  delocalsoy_redisdata:
```

### Kubernetes (Production)
- Namespace: delocalsoy
- ConfigMaps y Secrets para configuracion
- StatefulSet para PostgreSQL (HA, replicas)
- Deployment para API (HPA, multi-pod)
- Deployment para Frontend (Static, CDN)
- Ingress Controller (Nginx)
- Horizontal Pod Autoscaler

---

## CI/CD Pipeline (GitHub Actions)

### Workflows
1. **CI**: Build, Lint, Typecheck, Test
2. **Deploy Staging**: Despliegue a staging en cada push a develop
3. **Deploy Production**: Despliegue a produccion en cada push a main

### Evidencias a Verificar
- EV-001: docker compose up -d levanta PostGIS sano
- EV-002: prisma migrate dev aplica schema sin errores
- EV-003: prisma generate genera cliente tipado (OK)
- EV-004: API /health responde 200
- EV-005: Insert de events_raw con hash duplicado es rechazado
- EV-006: turbo run build compila todo el monorepo (OK)

---

## Monitoreo y Observabilidad

### Stack
- Prometheus: Time Series DB para metricas
- Grafana: Visualizacion de dashboards
- Jaeger: Distributed Tracing
- ELK Stack: Logging centralizado
- Alertmanager: Notificaciones de alertas

### Metricas de Negocio
- Territorios activos/por provincia
- Nodos activos/por estado
- Comunidades y miembros
- Proyectos completados/en ejecucion
- Eventos y participantes
- Uso de IA (consultas, tiempo de respuesta)
- Salud del sistema (uptime, error rate)

---

## Seguridad

### Autenticacion y Autorizacion
- JWT con expiracion de 1 hora
- Refresh tokens con expiracion de 7 dias
- RBAC (Role-Based Access Control)
- Permisos: territorios:read/write, nodos:read/write, etc.

### Politicas de Seguridad
- Encriptacion de datos sensibles (AES-256)
- Hashing de contrasenas (bcrypt, cost=12)
- TLS 1.3 para comunicacion
- Validacion de inputs (Zod)
- Rate limiting (100 requests/min por IP)
- Headers de seguridad (HSTS, X-Frame-Options)
- Sandboxing de agentes de IA
- Validacion de prompts (prevencion de prompt injection)

---

## Roadmap

### Fase 1: Fundamentos (CORE-001) - 2 semanas
- [x] Completar evidencias EV-001 a EV-006
- [ ] Verificar infraestructura base
- [ ] Configurar CI/CD basico
- [ ] Documentar arquitectura actual

### Fase 2: Backend Completo - 4 semanas
- [ ] Implementar modulos de territorios
- [ ] Implementar modulos de nodos
- [ ] Implementar modulos de comunidades
- [ ] Implementar modulos de proyectos
- [ ] Implementar modulos de eventos
- [ ] Implementar autenticacion y autorizacion
- [ ] Configurar base de datos completa

### Fase 3: Frontend Demo - 3 semanas
- [ ] Configurar Next.js con TypeScript
- [ ] Implementar componentes UI base
- [ ] Crear paginas principales
- [ ] Integrar con API backend
- [ ] Implementar mapa interactivo

### Fase 4: IA Sinergica - 4 semanas
- [ ] Configurar infraestructura de IA
- [ ] Implementar agente base
- [ ] Crear herramientas de IA
- [ ] Implementar orchestrador multi-agente
- [ ] Integrar con backend

### Fase 5: Despliegue - 2 semanas
- [ ] Configurar Kubernetes
- [ ] Implementar monitoreo completo
- [ ] Configurar seguridad en produccion
- [ ] Deploy a staging
- [ ] Deploy a produccion

---

## Tecnologias Principales

| Categoria | Tecnologia | Version | Proposito |
|-----------|------------|---------|-----------|
| Backend | Node.js | 20.x | Runtime |
| Backend | Express | 4.19.x | API Framework |
| Backend | TypeScript | 5.5.x | Lenguaje tipado |
| ORM | Prisma | 5.22.x | Acceso a datos |
| Database | PostgreSQL | 16.x | Base de datos |
| Database | PostGIS | 3.4.x | Extension geoespacial |
| Cache | Redis | 7.x | Caching |
| Queue | RabbitMQ | 3.x | Cola de mensajes |
| Frontend | Next.js | 14.x | Framework frontend |
| Frontend | React | 18.x | Libreria UI |
| Frontend | MapLibre | 2.x | Visualizacion de mapas |
| IA | LangChain | 0.2.x | Framework IA |
| IA | LangGraph | 0.0.x | Multi-agente |
| DevOps | Docker | 25.x | Contenedores |
| DevOps | Kubernetes | 1.28.x | Orchestracion |
| DevOps | Terraform | 1.6.x | Infraestructura como codigo |
| Monitoreo | Prometheus | 2.x | Metricas |
| Monitoreo | Grafana | 10.x | Visualizacion |

---

## Conclusiones

Este ARCHITECTURE MASTER PLAN v8.0 proporciona:
1. Arquitectura de capas clara y bien definida
2. Modelos de datos exhaustivos para el dominio territorial
3. Diseno de API RESTful y escalable
4. Ecosistema de IA multi-agente y sinergico
5. Infraestructura robusta y escalable
6. CI/CD automatizado y seguro
7. Monitoreo completo y observabilidad
8. Seguridad en todas las capas

El plan sigue los principios de:
- Verdad tecnica sobre documento (HITUB)
- Evidencia ejecutable (EV-xxx)
- Diseno etico y responsable
- Enfoque en impacto territorial positivo

*Documento generado el 2026-10-04 como parte del sprint CORE-001*
*Version: v8.0*
*Autor: Vibe Code (Arquitecto Senior Premium)*
*Repo: carlosleonidas04-code/delocalsoy-ar*

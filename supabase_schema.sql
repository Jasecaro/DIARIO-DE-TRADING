-- ==============================================================================
-- DIARIO DE TRADING & PSICOLOGÍA - ESQUEMA DE BASE DE DATOS SUPABASE
-- Tablas y Políticas de Seguridad Row Level Security (RLS)
-- ==============================================================================

-- 1. Crear tabla de sesiones de trading
CREATE TABLE IF NOT EXISTS public.trading_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_slot TEXT,
  account TEXT,
  accounts_list JSONB DEFAULT '[]'::jsonb,
  account_risks JSONB DEFAULT '{}'::jsonb,
  total_replicator_risk NUMERIC DEFAULT 0,
  bias TEXT,
  pre_emotion TEXT,
  energy_score INTEGER DEFAULT 8,
  checklist JSONB DEFAULT '{}'::jsonb,
  folio_maestro JSONB DEFAULT '{}'::jsonb,
  trades JSONB DEFAULT '[]'::jsonb,
  adherence TEXT,
  discipline_score INTEGER DEFAULT 10,
  mistakes TEXT,
  takeaway TEXT,
  net_pnl NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad: Cada usuario solo puede ver, insertar, actualizar y borrar sus propias sesiones
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.trading_sessions;
CREATE POLICY "Users can view their own sessions" 
  ON public.trading_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.trading_sessions;
CREATE POLICY "Users can insert their own sessions" 
  ON public.trading_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.trading_sessions;
CREATE POLICY "Users can update their own sessions" 
  ON public.trading_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.trading_sessions;
CREATE POLICY "Users can delete their own sessions" 
  ON public.trading_sessions 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 4. Índice para optimizar consultas por fecha y usuario
CREATE INDEX IF NOT EXISTS idx_trading_sessions_user_date 
  ON public.trading_sessions (user_id, date DESC);

-- ==============================================================================
-- 5. TABLA DE PLAYBOOK / ESTRATEGIA DE TRADING (IA & NOTEBOOKLM)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.trading_playbooks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Mi Playbook Operativo',
  style TEXT DEFAULT 'SMC / ICT & Order Flow',
  raw_input TEXT,
  markdown_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.trading_playbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own playbooks" ON public.trading_playbooks;
CREATE POLICY "Users can view their own playbooks" 
  ON public.trading_playbooks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own playbooks" ON public.trading_playbooks;
CREATE POLICY "Users can insert their own playbooks" 
  ON public.trading_playbooks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own playbooks" ON public.trading_playbooks;
CREATE POLICY "Users can update their own playbooks" 
  ON public.trading_playbooks FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own playbooks" ON public.trading_playbooks;
CREATE POLICY "Users can delete their own playbooks" 
  ON public.trading_playbooks FOR DELETE USING (auth.uid() = user_id);


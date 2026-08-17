CREATE TYPE public.app_role AS ENUM ('citizen','worker','official_admin');
CREATE TYPE public.issue_status AS ENUM ('reported','clustered_duplicate','assigned_to_worker','in_progress','resolved_pending_audit','closed_verified','resolution_anomaly','reopened_failed_resolution','flagged_admin_review');
CREATE TYPE public.verification_vote AS ENUM ('resolved','partially_resolved','still_present');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Citizen',
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'citizen',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'official_admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'official_admin'));

CREATE TABLE public.civic_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.issue_status NOT NULL DEFAULT 'reported',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  ward text,
  priority_score double precision NOT NULL DEFAULT 0,
  severity_score double precision NOT NULL DEFAULT 1,
  evidence_count integer NOT NULL DEFAULT 1,
  report_count integer NOT NULL DEFAULT 1,
  failure_count integer NOT NULL DEFAULT 0,
  assigned_worker_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_review_flag boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX civic_issues_geo_idx ON public.civic_issues (latitude, longitude);
CREATE INDEX civic_issues_status_idx ON public.civic_issues (status, priority_score DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.civic_issues TO authenticated;
GRANT SELECT ON public.civic_issues TO anon;
GRANT ALL ON public.civic_issues TO service_role;
ALTER TABLE public.civic_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issues public read" ON public.civic_issues FOR SELECT USING (true);
CREATE POLICY "issues insert authenticated" ON public.civic_issues FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "issues update by worker or admin" ON public.civic_issues FOR UPDATE TO authenticated
  USING (assigned_worker_id = auth.uid() OR public.has_role(auth.uid(),'official_admin'))
  WITH CHECK (assigned_worker_id = auth.uid() OR public.has_role(auth.uid(),'official_admin'));
CREATE POLICY "issues delete by admin" ON public.civic_issues FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'official_admin'));

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  civic_issue_id uuid NOT NULL REFERENCES public.civic_issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  phash text,
  exif_timestamp timestamptz,
  exif_lat double precision,
  exif_lng double precision,
  device_lat double precision,
  device_lng double precision,
  is_flagged_fraud boolean NOT NULL DEFAULT false,
  fraud_reason text,
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT SELECT ON public.reports TO anon;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports public read" ON public.reports FOR SELECT USING (true);
CREATE POLICY "reports insert own" ON public.reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.resolution_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  civic_issue_id uuid NOT NULL UNIQUE REFERENCES public.civic_issues(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  before_image_url text NOT NULL,
  after_image_url text NOT NULL,
  worker_notes text NOT NULL DEFAULT '',
  ai_confidence_score double precision NOT NULL DEFAULT 0,
  ai_analysis_summary text NOT NULL DEFAULT '',
  is_same_scene boolean NOT NULL DEFAULT true,
  issue_resolved boolean NOT NULL DEFAULT true,
  potential_anomaly boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.resolution_proofs TO authenticated;
GRANT SELECT ON public.resolution_proofs TO anon;
GRANT ALL ON public.resolution_proofs TO service_role;
ALTER TABLE public.resolution_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proofs public read" ON public.resolution_proofs FOR SELECT USING (true);
CREATE POLICY "proofs insert by worker or admin" ON public.resolution_proofs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'worker') OR public.has_role(auth.uid(),'official_admin'));
CREATE POLICY "proofs update by worker or admin" ON public.resolution_proofs FOR UPDATE TO authenticated
  USING (worker_id = auth.uid() OR public.has_role(auth.uid(),'official_admin'));

CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  civic_issue_id uuid NOT NULL REFERENCES public.civic_issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote public.verification_vote NOT NULL,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (civic_issue_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.verifications TO authenticated;
GRANT SELECT ON public.verifications TO anon;
GRANT ALL ON public.verifications TO service_role;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes public read" ON public.verifications FOR SELECT USING (true);
CREATE POLICY "votes insert own" ON public.verifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "votes update own" ON public.verifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,'citizen'),'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'citizen') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER civic_issues_updated_at BEFORE UPDATE ON public.civic_issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
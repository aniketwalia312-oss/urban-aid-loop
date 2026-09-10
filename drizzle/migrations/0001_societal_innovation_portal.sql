-- ============ enums ============
CREATE TYPE public.institution_type AS ENUM ('university','industry','startup','msme','csr','research_lab','incubator');
CREATE TYPE public.challenge_status AS ENUM ('submitted','validated','routed','proposal_received','in_project','completed','rejected','duplicate');
CREATE TYPE public.submitter_type AS ENUM ('citizen','community_org','panchayat','urban_local_body','government_dept','ngo');
CREATE TYPE public.route_status AS ENUM ('routed','accepted','declined');
CREATE TYPE public.proposal_status AS ENUM ('draft','submitted','approved','rejected');
CREATE TYPE public.project_status AS ENUM ('planning','in_progress','testing','piloting','deployed','completed','stalled');
CREATE TYPE public.milestone_status AS ENUM ('pending','in_progress','done','blocked');
CREATE TYPE public.partnership_type AS ENUM ('mentorship','funding','prototyping','pilot','tech_transfer','csr_grant');
CREATE TYPE public.partnership_status AS ENUM ('proposed','active','completed','withdrawn');

-- ============ institutions ============
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.institution_type NOT NULL,
  district text,
  domains text[] NOT NULL DEFAULT '{}',
  description text,
  website text,
  contact_email text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.institutions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutions TO authenticated;
GRANT ALL ON public.institutions TO service_role;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions public read" ON public.institutions FOR SELECT USING (true);
CREATE POLICY "institutions insert own" ON public.institutions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "institutions update own" ON public.institutions FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR private.has_role(auth.uid(),'official_admin') OR private.has_role(auth.uid(),'government'))
  WITH CHECK (owner_id = auth.uid() OR private.has_role(auth.uid(),'official_admin') OR private.has_role(auth.uid(),'government'));
CREATE POLICY "institutions delete own" ON public.institutions FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ============ challenges ============
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  domain text NOT NULL DEFAULT 'Other',
  tags text[] NOT NULL DEFAULT '{}',
  district text,
  address text,
  latitude double precision,
  longitude double precision,
  submitter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_type public.submitter_type NOT NULL DEFAULT 'citizen',
  organisation_name text,
  status public.challenge_status NOT NULL DEFAULT 'submitted',
  priority_score numeric NOT NULL DEFAULT 0,
  severity_score numeric NOT NULL DEFAULT 5,
  beneficiaries integer NOT NULL DEFAULT 0,
  support_count integer NOT NULL DEFAULT 0,
  ai_summary text,
  ai_confidence numeric NOT NULL DEFAULT 0,
  ai_rationale text,
  media_paths text[] NOT NULL DEFAULT '{}',
  document_paths text[] NOT NULL DEFAULT '{}',
  duplicate_of uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenges_domain_idx ON public.challenges (domain);
CREATE INDEX challenges_status_priority_idx ON public.challenges (status, priority_score DESC);
GRANT SELECT ON public.challenges TO anon;
GRANT SELECT, INSERT, UPDATE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges public read" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "challenges insert own" ON public.challenges FOR INSERT TO authenticated WITH CHECK (submitter_id = auth.uid());
CREATE POLICY "challenges update own or admin" ON public.challenges FOR UPDATE TO authenticated
  USING (submitter_id = auth.uid() OR private.has_role(auth.uid(),'official_admin') OR private.has_role(auth.uid(),'government'))
  WITH CHECK (submitter_id = auth.uid() OR private.has_role(auth.uid(),'official_admin') OR private.has_role(auth.uid(),'government'));

-- ============ challenge supports (upvotes) ============
CREATE TABLE public.challenge_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.challenge_supports TO authenticated;
GRANT ALL ON public.challenge_supports TO service_role;
ALTER TABLE public.challenge_supports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supports read auth" ON public.challenge_supports FOR SELECT TO authenticated USING (true);
CREATE POLICY "supports insert own" ON public.challenge_supports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "supports delete own" ON public.challenge_supports FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ routing ============
CREATE TABLE public.challenge_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  match_score numeric NOT NULL DEFAULT 0,
  rationale text,
  status public.route_status NOT NULL DEFAULT 'routed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, institution_id)
);
GRANT SELECT ON public.challenge_routes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.challenge_routes TO authenticated;
GRANT ALL ON public.challenge_routes TO service_role;
ALTER TABLE public.challenge_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes public read" ON public.challenge_routes FOR SELECT USING (true);
CREATE POLICY "routes managed by institution owner or admin" ON public.challenge_routes FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'official_admin') OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()))
  WITH CHECK (private.has_role(auth.uid(),'official_admin') OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()));
CREATE POLICY "routes insert admin" ON public.challenge_routes FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'official_admin'));

-- ============ proposals ============
CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  abstract text NOT NULL,
  approach text,
  team_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  faculty_mentor text,
  duration_weeks integer NOT NULL DEFAULT 12,
  budget_inr numeric NOT NULL DEFAULT 0,
  status public.proposal_status NOT NULL DEFAULT 'submitted',
  review_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.proposals TO anon;
GRANT SELECT, INSERT, UPDATE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proposals public read" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "proposals insert by institution owner" ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()));
CREATE POLICY "proposals update owner or admin" ON public.proposals FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'official_admin') OR private.has_role(auth.uid(),'government') OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()))
  WITH CHECK (private.has_role(auth.uid(),'official_admin') OR private.has_role(auth.uid(),'government') OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()));

-- ============ projects ============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid UNIQUE REFERENCES public.proposals(id) ON DELETE SET NULL,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  status public.project_status NOT NULL DEFAULT 'planning',
  progress integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  target_date date,
  outcome_summary text,
  patents integer NOT NULL DEFAULT 0,
  startups_created integer NOT NULL DEFAULT 0,
  beneficiaries integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects public read" ON public.projects FOR SELECT USING (true);
CREATE POLICY "projects write institution owner or admin" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'official_admin') OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()));
CREATE POLICY "projects update institution owner or admin" ON public.projects FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'official_admin') OR private.has_role(auth.uid(),'government') OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()))
  WITH CHECK (private.has_role(auth.uid(),'official_admin') OR private.has_role(auth.uid(),'government') OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()));

-- ============ milestones ============
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status public.milestone_status NOT NULL DEFAULT 'pending',
  order_index integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.milestones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones public read" ON public.milestones FOR SELECT USING (true);
CREATE POLICY "milestones write project owner" ON public.milestones FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'official_admin') OR EXISTS (SELECT 1 FROM public.projects p JOIN public.institutions i ON i.id = p.institution_id WHERE p.id = project_id AND i.owner_id = auth.uid()))
  WITH CHECK (private.has_role(auth.uid(),'official_admin') OR EXISTS (SELECT 1 FROM public.projects p JOIN public.institutions i ON i.id = p.institution_id WHERE p.id = project_id AND i.owner_id = auth.uid()));

-- ============ partnerships ============
CREATE TABLE public.partnerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  partner_type public.partnership_type NOT NULL DEFAULT 'mentorship',
  amount_inr numeric NOT NULL DEFAULT 0,
  notes text,
  status public.partnership_status NOT NULL DEFAULT 'proposed',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partnerships TO anon;
GRANT SELECT, INSERT, UPDATE ON public.partnerships TO authenticated;
GRANT ALL ON public.partnerships TO service_role;
ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partnerships public read" ON public.partnerships FOR SELECT USING (true);
CREATE POLICY "partnerships insert partner owner" ON public.partnerships FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()));
CREATE POLICY "partnerships update partner owner or admin" ON public.partnerships FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'official_admin') OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.projects p JOIN public.institutions i2 ON i2.id = p.institution_id WHERE p.id = project_id AND i2.owner_id = auth.uid()))
  WITH CHECK (private.has_role(auth.uid(),'official_admin') OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.owner_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.projects p JOIN public.institutions i2 ON i2.id = p.institution_id WHERE p.id = project_id AND i2.owner_id = auth.uid()));

-- ============ notifications ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications own read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications own update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ discussion threads ============
CREATE TABLE public.challenge_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.challenge_messages TO authenticated;
GRANT ALL ON public.challenge_messages TO service_role;
ALTER TABLE public.challenge_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages read auth" ON public.challenge_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "messages insert own" ON public.challenge_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ updated_at triggers ============
CREATE TRIGGER institutions_updated BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER challenges_updated BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER proposals_updated BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ seed institutions (Jharkhand ecosystem) ============
INSERT INTO public.institutions (name, type, district, domains, description, website, contact_email, verified) VALUES
('IIT (ISM) Dhanbad','university','Dhanbad','{"Environment","Energy","Water Resources","Urban Development"}','Premier technical institute with mining, environmental and energy research centres.','https://www.iitism.ac.in','innovation@iitism.ac.in',true),
('NIT Jamshedpur','university','East Singhbhum','{"Urban Development","Energy","Public Administration","Accessibility"}','Multidisciplinary engineering institute with an incubation centre for civic tech.','https://www.nitjsr.ac.in','incubation@nitjsr.ac.in',true),
('BIT Mesra, Ranchi','university','Ranchi','{"Healthcare","Education","Agriculture","Rural Livelihoods"}','Research university with biotechnology, agri-tech and health informatics labs.','https://www.bitmesra.ac.in','research@bitmesra.ac.in',true),
('Birsa Agricultural University','university','Ranchi','{"Agriculture","Water Resources","Rural Livelihoods","Environment"}','State agricultural university serving farmers across Jharkhand.','https://www.bauranchi.org','outreach@bauranchi.org',true),
('Rajendra Institute of Medical Sciences','university','Ranchi','{"Healthcare","Education"}','State medical college and hospital with community health research.','https://www.rimsranchi.org','research@rimsranchi.org',true),
('Central University of Jharkhand','university','Ranchi','{"Education","Public Administration","Environment","Accessibility"}','Central university with social sciences and environmental studies departments.','https://www.cuj.ac.in','innovation@cuj.ac.in',true),
('Tata Steel Foundation','csr','East Singhbhum','{"Rural Livelihoods","Education","Healthcare","Water Resources"}','CSR arm funding community development and livelihood programmes.','https://www.tatasteel.com','csr@tatasteelfoundation.org',true),
('Jharkhand Startup Hub','incubator','Ranchi','{"Urban Development","Energy","Education","Public Administration"}','State-supported incubator for early-stage civic and deep-tech startups.',NULL,'hello@jharkhandstartup.in',true),
('AgriSetu Technologies','startup','Ranchi','{"Agriculture","Rural Livelihoods"}','Agri-tech startup building low-cost soil and irrigation sensing.',NULL,'team@agrisetu.in',true),
('HydroPure MSME Works','msme','Bokaro','{"Water Resources","Environment"}','Manufacturer of community water filtration and sanitation units.',NULL,'sales@hydropure.in',true),
('CSIR Central Institute of Mining & Fuel Research','research_lab','Dhanbad','{"Environment","Energy"}','National laboratory for mining, air quality and fuel research.','https://www.cimfr.nic.in','director@cimfr.res.in',true),
('Jharkhand Renewables Pvt Ltd','industry','Ranchi','{"Energy","Urban Development"}','Solar micro-grid and street-lighting deployment company.',NULL,'projects@jhrenew.in',true);
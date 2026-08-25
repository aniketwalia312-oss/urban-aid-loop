CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Repoint existing policies to the private helper
DROP POLICY IF EXISTS "issues delete by admin" ON public.civic_issues;
CREATE POLICY "issues delete by admin" ON public.civic_issues FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'official_admin'));

DROP POLICY IF EXISTS "issues update by worker or admin" ON public.civic_issues;
CREATE POLICY "issues update by worker or admin" ON public.civic_issues FOR UPDATE TO authenticated
  USING (assigned_worker_id = auth.uid() OR private.has_role(auth.uid(), 'official_admin'))
  WITH CHECK (assigned_worker_id = auth.uid() OR private.has_role(auth.uid(), 'official_admin'));

DROP POLICY IF EXISTS "own profile read" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'official_admin'));

DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'official_admin'));

DROP POLICY IF EXISTS "proofs insert by worker or admin" ON public.resolution_proofs;
CREATE POLICY "proofs insert by worker or admin" ON public.resolution_proofs FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'worker') OR private.has_role(auth.uid(), 'official_admin'));

DROP POLICY IF EXISTS "proofs update by worker or admin" ON public.resolution_proofs;
CREATE POLICY "proofs update by worker or admin" ON public.resolution_proofs FOR UPDATE TO authenticated
  USING (worker_id = auth.uid() OR private.has_role(auth.uid(), 'official_admin'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Reports: no public read; owner / assigned worker / admin only
DROP POLICY IF EXISTS "reports public read" ON public.reports;
CREATE POLICY "reports read by owner worker or admin" ON public.reports FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR private.has_role(auth.uid(), 'official_admin')
    OR EXISTS (
      SELECT 1 FROM public.civic_issues ci
      WHERE ci.id = reports.civic_issue_id AND ci.assigned_worker_id = auth.uid()
    )
  );
REVOKE SELECT ON public.reports FROM anon;

-- Resolution proofs & verifications: signed-in users only
DROP POLICY IF EXISTS "proofs public read" ON public.resolution_proofs;
CREATE POLICY "proofs read authenticated" ON public.resolution_proofs FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.resolution_proofs FROM anon;

DROP POLICY IF EXISTS "votes public read" ON public.verifications;
CREATE POLICY "votes read authenticated" ON public.verifications FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.verifications FROM anon;

-- Storage: evidence bucket readable only by signed-in users
DROP POLICY IF EXISTS "evidence read" ON storage.objects;
CREATE POLICY "evidence read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'civic-evidence');

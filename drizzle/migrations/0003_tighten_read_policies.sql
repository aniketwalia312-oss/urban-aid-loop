-- civic_issues
DROP POLICY IF EXISTS "issues public read" ON public.civic_issues;
CREATE POLICY "issues public read" ON public.civic_issues FOR SELECT TO anon, authenticated
  USING (status <> 'flagged_admin_review'::issue_status);
CREATE POLICY "issues read involved" ON public.civic_issues FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR assigned_worker_id = auth.uid() OR private.has_role(auth.uid(),'official_admin'::app_role));

-- challenges
DROP POLICY IF EXISTS "challenges public read" ON public.challenges;
CREATE POLICY "challenges public read" ON public.challenges FOR SELECT TO anon, authenticated
  USING (status NOT IN ('rejected'::challenge_status,'duplicate'::challenge_status));
CREATE POLICY "challenges read own or staff" ON public.challenges FOR SELECT TO authenticated
  USING (submitter_id = auth.uid() OR private.has_role(auth.uid(),'official_admin'::app_role) OR private.has_role(auth.uid(),'government'::app_role));

-- challenge_routes
DROP POLICY IF EXISTS "routes public read" ON public.challenge_routes;
CREATE POLICY "routes public read" ON public.challenge_routes FOR SELECT TO anon, authenticated
  USING (status <> 'declined'::route_status AND EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_routes.challenge_id));
CREATE POLICY "routes read institution or staff" ON public.challenge_routes FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'official_admin'::app_role) OR private.has_role(auth.uid(),'government'::app_role)
    OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = challenge_routes.institution_id AND i.owner_id = auth.uid()));

-- proposals
DROP POLICY IF EXISTS "proposals public read" ON public.proposals;
CREATE POLICY "proposals public read" ON public.proposals FOR SELECT TO anon, authenticated
  USING (status IN ('submitted'::proposal_status,'approved'::proposal_status));
CREATE POLICY "proposals read owner or staff" ON public.proposals FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.has_role(auth.uid(),'official_admin'::app_role) OR private.has_role(auth.uid(),'government'::app_role)
    OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = proposals.institution_id AND i.owner_id = auth.uid()));

-- projects
DROP POLICY IF EXISTS "projects public read" ON public.projects;
CREATE POLICY "projects public read" ON public.projects FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = projects.challenge_id));
CREATE POLICY "projects read owner or staff" ON public.projects FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'official_admin'::app_role) OR private.has_role(auth.uid(),'government'::app_role)
    OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = projects.institution_id AND i.owner_id = auth.uid()));

-- milestones
DROP POLICY IF EXISTS "milestones public read" ON public.milestones;
CREATE POLICY "milestones public read" ON public.milestones FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = milestones.project_id));

-- partnerships
DROP POLICY IF EXISTS "partnerships public read" ON public.partnerships;
CREATE POLICY "partnerships public read" ON public.partnerships FOR SELECT TO anon, authenticated
  USING (status <> 'withdrawn'::partnership_status);
CREATE POLICY "partnerships read involved" ON public.partnerships FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR private.has_role(auth.uid(),'official_admin'::app_role) OR private.has_role(auth.uid(),'government'::app_role)
    OR EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = partnerships.institution_id AND i.owner_id = auth.uid()));

-- institutions (hide contact_email from public)
DROP POLICY IF EXISTS "institutions public read" ON public.institutions;
CREATE POLICY "institutions public read" ON public.institutions FOR SELECT TO anon, authenticated
  USING (verified = true OR owner_id IS NOT NULL);
CREATE POLICY "institutions read own or staff" ON public.institutions FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR private.has_role(auth.uid(),'official_admin'::app_role) OR private.has_role(auth.uid(),'government'::app_role));
REVOKE SELECT ON public.institutions FROM anon, authenticated;
GRANT SELECT (id, name, type, district, domains, description, website, owner_id, verified, created_at, updated_at)
  ON public.institutions TO anon, authenticated;

-- verifications
DROP POLICY IF EXISTS "votes read authenticated" ON public.verifications;
CREATE POLICY "votes read own or staff" ON public.verifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'official_admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.civic_issues ci WHERE ci.id = verifications.civic_issue_id AND (ci.assigned_worker_id = auth.uid() OR ci.created_by = auth.uid())));

-- resolution_proofs
DROP POLICY IF EXISTS "proofs read authenticated" ON public.resolution_proofs;
CREATE POLICY "proofs read involved or audit" ON public.resolution_proofs FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR private.has_role(auth.uid(),'official_admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.civic_issues ci WHERE ci.id = resolution_proofs.civic_issue_id
      AND (ci.created_by = auth.uid() OR ci.status IN ('resolved_pending_audit'::issue_status,'closed_verified'::issue_status,'reopened_failed_resolution'::issue_status))));

-- challenge_messages
DROP POLICY IF EXISTS "messages read auth" ON public.challenge_messages;
CREATE POLICY "messages read participants" ON public.challenge_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'official_admin'::app_role) OR private.has_role(auth.uid(),'government'::app_role)
    OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_messages.challenge_id AND c.submitter_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.challenge_routes r JOIN public.institutions i ON i.id = r.institution_id
               WHERE r.challenge_id = challenge_messages.challenge_id AND i.owner_id = auth.uid()));

-- challenge_supports
DROP POLICY IF EXISTS "supports read auth" ON public.challenge_supports;
CREATE POLICY "supports read own" ON public.challenge_supports FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- storage: civic-evidence
DROP POLICY IF EXISTS "evidence upload" ON storage.objects;
CREATE POLICY "evidence upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'civic-evidence' AND (storage.foldername(name))[1] = (select auth.uid()::text));
DROP POLICY IF EXISTS "evidence read" ON storage.objects;
CREATE POLICY "evidence read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'civic-evidence' AND (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR private.has_role(auth.uid(),'official_admin'::app_role)
    OR private.has_role(auth.uid(),'worker'::app_role)));

-- storage: challenge-media
DROP POLICY IF EXISTS "challenge media read auth" ON storage.objects;
CREATE POLICY "challenge media read own or staff" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'challenge-media' AND (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR private.has_role(auth.uid(),'official_admin'::app_role)
    OR private.has_role(auth.uid(),'government'::app_role)));
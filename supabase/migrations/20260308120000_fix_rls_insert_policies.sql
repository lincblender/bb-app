-- Allow authenticated users to insert tenant-scoped records under RLS.
-- The earlier FOR ALL policies only defined USING clauses, which does not
-- permit INSERTs unless a matching WITH CHECK clause is also present.

DROP POLICY IF EXISTS "Users can manage own org data" ON organisations;
CREATE POLICY "Users can manage own org data" ON organisations
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own people" ON people;
CREATE POLICY "Users can manage own people" ON people
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own opportunities" ON opportunities;
CREATE POLICY "Users can manage own opportunities" ON opportunities
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own assessments" ON opportunity_assessments;
CREATE POLICY "Users can manage own assessments" ON opportunity_assessments
  FOR ALL
  USING (opportunity_id IN (SELECT id FROM opportunities WHERE tenant_id = public.user_tenant_id()))
  WITH CHECK (opportunity_id IN (SELECT id FROM opportunities WHERE tenant_id = public.user_tenant_id()));

DROP POLICY IF EXISTS "Users can manage own relationship signals" ON relationship_signals;
CREATE POLICY "Users can manage own relationship signals" ON relationship_signals
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own complexity signals" ON complexity_signals;
CREATE POLICY "Users can manage own complexity signals" ON complexity_signals
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own connectors" ON connector_sources;
CREATE POLICY "Users can manage own connectors" ON connector_sources
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own tender boards" ON tender_boards;
CREATE POLICY "Users can manage own tender boards" ON tender_boards
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own intelligence events" ON intelligence_events;
CREATE POLICY "Users can manage own intelligence events" ON intelligence_events
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own chats" ON chats;
CREATE POLICY "Users can manage own chats" ON chats
  FOR ALL
  USING (tenant_id = public.user_tenant_id())
  WITH CHECK (tenant_id = public.user_tenant_id());

DROP POLICY IF EXISTS "Users can manage own chat messages" ON chat_messages;
CREATE POLICY "Users can manage own chat messages" ON chat_messages
  FOR ALL
  USING (chat_id IN (SELECT id FROM chats WHERE tenant_id = public.user_tenant_id()))
  WITH CHECK (chat_id IN (SELECT id FROM chats WHERE tenant_id = public.user_tenant_id()));

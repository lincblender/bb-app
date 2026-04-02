import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceData } from "@/lib/workspace/client";
import { fetchCurrentTenantId } from "@/lib/workspace/client-tenant";

export interface CleanRoom {
  id: string;
  name: string;
  opportunity_id: string;
  members: CleanRoomMember[];
  documents: CleanRoomDocument[];
}

export interface CleanRoomMember {
  clean_room_id: string;
  tenant_id: string;
  role: "owner" | "guest";
}

export interface CleanRoomDocument {
  clean_room_id: string;
  document_id: string;
  shared_by_tenant_id: string;
}

export function useCleanRooms(opportunityId: string | null) {
  const [cleanRooms, setCleanRooms] = useState<CleanRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCleanRooms = useCallback(async () => {
    if (!opportunityId) {
      setCleanRooms([]);
      return;
    }
    
    setIsLoading(true);
    const supabase = createClient();
    
    // Fetch Clean Rooms mapped to this opportunity where user's tenant is a member
    const { data: roomsData, error: roomsError } = await supabase
      .from("clean_rooms")
      .select(`
        id, 
        name, 
        opportunity_id,
        members:clean_room_members(clean_room_id, tenant_id, role),
        documents:clean_room_documents(clean_room_id, document_id, shared_by_tenant_id)
      `)
      .eq("opportunity_id", opportunityId);

    if (!roomsError && roomsData) {
      setCleanRooms(roomsData as any);
    }
    setIsLoading(false);
  }, [opportunityId]);

  useEffect(() => {
    void fetchCleanRooms();
  }, [fetchCleanRooms]);

  const createCleanRoom = async (name: string) => {
    if (!opportunityId) return null;
    const supabase = createClient();
    const tenantId = await fetchCurrentTenantId();
    if (!tenantId) return null;

    const { data: room, error } = await supabase
      .from("clean_rooms")
      .insert({ name, opportunity_id: opportunityId })
      .select()
      .single();

    if (error || !room) return null;

    await supabase
      .from("clean_room_members")
      .insert({ clean_room_id: room.id, tenant_id: tenantId, role: "owner" });

    await fetchCleanRooms();
    return room.id;
  };

  const shareDocumentToCleanRoom = async (cleanRoomId: string, documentId: string) => {
    const supabase = createClient();
    const tenantId = await fetchCurrentTenantId();
    if (!tenantId) return false;

    const { error } = await supabase
      .from("clean_room_documents")
      .insert({ clean_room_id: cleanRoomId, document_id: documentId, shared_by_tenant_id: tenantId });

    if (!error) {
       await fetchCleanRooms();
       return true;
    }
    return false;
  };

  return {
    cleanRooms,
    isLoading,
    createCleanRoom,
    shareDocumentToCleanRoom,
    refetch: fetchCleanRooms,
  };
}

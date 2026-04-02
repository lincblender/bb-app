"use client";

import React, { useRef, useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Upload, FileText, CheckCircle2, ShieldAlert, Loader2, Paperclip } from "lucide-react";
import clsx from "clsx";

export type ScanStatus = "pending" | "safe" | "malicious" | "error";

interface DocumentUploaderProps {
  opportunityId?: string;
  variant?: "dropzone" | "icon";
  onUploadComplete?: (assetId: string, filename: string) => void;
  className?: string;
}

export function DocumentUploader({ opportunityId, variant = "dropzone", onUploadComplete, className }: DocumentUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ scanStatus?: ScanStatus; filename?: string; assetId?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // If we have an active polling requirement
    if (status?.assetId && status.scanStatus === "pending") {
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from("document_assets")
          .select("scan_status")
          .eq("id", status.assetId)
          .single();

        if (data && data.scan_status !== "pending") {
          setStatus((prev) => prev ? { ...prev, scanStatus: data.scan_status as ScanStatus } : null);
          clearInterval(interval);

          if (data.scan_status === "safe" && onUploadComplete) {
            onUploadComplete(status.assetId!, status.filename!);
          }
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [status, supabase, onUploadComplete]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setStatus({ filename: file.name, scanStatus: "pending" });

    try {
      // 1. Get Tenant Context First (we need tenant_id for the storage path)
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");
      
      const { data: tenantRel } = await supabase.from("user_tenants").select("tenant_id").eq("user_id", userData.user.id).single();
      const tenantId = tenantRel?.tenant_id;
      if (!tenantId) throw new Error("No active tenant found");

      // 2. Upload to S3 directly
      const ext = file.name.split('.').pop();
      const filePath = `${tenantId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("opportunity_documents")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      // 3. Register the Asset
      const { data: asset, error: dbError } = await supabase
        .from("document_assets")
        .insert({
          tenant_id: tenantId,
          opportunity_id: opportunityId || null,
          storage_path: filePath,
          original_filename: file.name,
          size_bytes: file.size,
          scan_status: "pending",
        })
        .select("id")
        .single();

      if (dbError) throw dbError;

      // 4. Manually trigger the scanner edge function
      await supabase.functions.invoke("scan-document", {
        body: { asset_id: asset.id },
      });

      setStatus({ filename: file.name, scanStatus: "pending", assetId: asset.id });

    } catch (err: any) {
      console.error(err);
      setStatus({ filename: file.name, scanStatus: "error" });
    } finally {
      setUploading(false);
    }
  };

  const currentStatus = status?.scanStatus;

  if (variant === "icon") {
    return (
      <div className={clsx("relative", className)}>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.docx,.txt"
          onChange={(e) => {
            if (e.target.files) handleFileSelect(e.target.files[0]);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
          }} 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || currentStatus === "pending"}
          className="p-2 text-zinc-400 hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-800 disabled:opacity-50"
          title="Attach a document"
        >
          {uploading || currentStatus === "pending" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={clsx("w-full transition-all duration-300", className)}>
      <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".pdf,.docx,.txt"
          onChange={(e) => {
            if (e.target.files) handleFileSelect(e.target.files[0]);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }} 
        />
        
      {!status && !uploading && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragActive(false);
            if (e.dataTransfer.files?.length) handleFileSelect(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group",
            isDragActive ? "border-emerald-500/50 bg-emerald-500/10" : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-zinc-700 transition-colors">
            <Upload className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-zinc-200 font-medium mb-1">Click or drag a document to analyse</p>
          <p className="text-zinc-500 text-sm">Supports .pdf, .docx, .txt up to 50MB</p>
        </div>
      )}

      {(status || uploading) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-sm font-medium text-zinc-200 truncate">{status?.filename}</p>
                
                {uploading && <p className="text-xs text-zinc-500">Uploading to encrypted vault...</p>}
                {!uploading && currentStatus === "pending" && <p className="text-xs text-amber-500/80">Scanning for threats (ClamAV)...</p>}
                {!uploading && currentStatus === "safe" && <p className="text-xs text-emerald-500/80">Safe. Synthesising contents...</p>}
                {!uploading && currentStatus === "malicious" && <p className="text-xs text-red-500/80">Malware detected. File destroyed.</p>}
                {!uploading && currentStatus === "error" && <p className="text-xs text-red-500/80">Upload failed.</p>}
              </div>
            </div>
            
            <div className="flex items-center shrink-0 ml-4">
              {uploading || currentStatus === "pending" ? (
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              ) : currentStatus === "safe" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>

          <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
            <div 
              className={clsx(
                "h-full rounded-full transition-all duration-1000 ease-out",
                uploading ? "w-1/3 bg-blue-500" : 
                currentStatus === "pending" ? "w-2/3 bg-amber-500 pulse" :
                currentStatus === "safe" ? "w-full bg-emerald-500" : "w-full bg-red-500"
              )}
              style={currentStatus === "pending" ? { animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : undefined}
            />
          </div>

          {currentStatus && currentStatus !== "pending" && (
            <div className="pt-2 flex justify-end">
               <button 
                onClick={() => setStatus(null)}
                className="text-xs text-zinc-400 hover:text-zinc-200 uppercase tracking-widest px-2 py-1"
               >
                 {currentStatus === "safe" ? "Upload another" : "Dismiss"}
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

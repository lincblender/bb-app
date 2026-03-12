"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserSettings } from "./types";
import type { McpServerConfig } from "@/lib/mcp/types";
import { LEGACY_SETTINGS_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from "./types";

function parseMcpServers(raw: unknown): McpServerConfig[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (s): s is McpServerConfig =>
      s &&
      typeof s === "object" &&
      typeof (s as McpServerConfig).id === "string" &&
      typeof (s as McpServerConfig).name === "string" &&
      typeof (s as McpServerConfig).url === "string" &&
      (s as McpServerConfig).transport === "streamable-http"
  );
}

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw =
      localStorage.getItem(SETTINGS_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      enabledTenderBoards: Array.isArray(parsed.enabledTenderBoards)
        ? parsed.enabledTenderBoards
        : DEFAULT_SETTINGS.enabledTenderBoards,
      enabledNetworkSources: Array.isArray(parsed.enabledNetworkSources)
        ? parsed.enabledNetworkSources
        : DEFAULT_SETTINGS.enabledNetworkSources,
      mcpServers: parseMcpServers(parsed.mcpServers),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: UserSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const setEnabledTenderBoards = useCallback((ids: string[]) => {
    setSettings((s) => ({ ...s, enabledTenderBoards: ids }));
  }, []);

  const setEnabledNetworkSources = useCallback((ids: string[]) => {
    setSettings((s) => ({ ...s, enabledNetworkSources: ids }));
  }, []);

  const toggleTenderBoard = useCallback((id: string) => {
    setSettings((s) => {
      const current = s.enabledTenderBoards;
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return { ...s, enabledTenderBoards: next };
    });
  }, []);

  const toggleNetworkSource = useCallback((id: string) => {
    setSettings((s) => {
      const current = s.enabledNetworkSources;
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      return { ...s, enabledNetworkSources: next };
    });
  }, []);

  const setMcpServers = useCallback((servers: McpServerConfig[]) => {
    setSettings((s) => ({ ...s, mcpServers: servers }));
  }, []);

  const addMcpServer = useCallback((config: McpServerConfig) => {
    setSettings((s) => ({
      ...s,
      mcpServers: [...s.mcpServers.filter((m) => m.id !== config.id), config],
    }));
  }, []);

  const removeMcpServer = useCallback((id: string) => {
    setSettings((s) => ({
      ...s,
      mcpServers: s.mcpServers.filter((m) => m.id !== id),
    }));
  }, []);

  return {
    settings,
    setEnabledTenderBoards,
    setEnabledNetworkSources,
    toggleTenderBoard,
    toggleNetworkSource,
    setMcpServers,
    addMcpServer,
    removeMcpServer,
  };
}

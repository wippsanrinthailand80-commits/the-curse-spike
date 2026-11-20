export type Permission = 'read' | 'write' | 'network' | 'exec';
export const ALL_PERMISSIONS: Permission[] = ['read', 'write', 'network', 'exec'];

export type SkillStatus = 'pending' | 'active';

export interface SkillFrontmatter {
  name: string;
  description: string;
  permissions: Permission[];
  status: SkillStatus;
  secrets?: string[];
  tests?: Array<{ input?: unknown; expected?: unknown } | string>;
  provenance?: 'trusted' | 'untrusted';
  [k: string]: unknown;
}

export interface Skill {
  name: string;
  description: string;
  permissions: Permission[];
  status: SkillStatus;
  secrets: string[];
  tests: unknown[];
  body: string;
  // location
  dir: string;
  bundled: boolean;
  // raw file content
  raw: string;
}

export interface SkillStats {
  runs: number;
  successes: number;
  failures: number;
  lastUsed?: string;
}

export interface StatsFile {
  skills: Record<string, SkillStats>;
  sprays: number;
  briefingsCreated: number;
}

export interface Briefing {
  id: string;
  task: string;
  skills: string[]; // granted skill names
  summary: string;
  untrusted: boolean;
  permissions: Permission[]; // subset
  parentPermissions?: Permission[];
  parentBriefingId?: string;
  depth: number;
  createdAt: number;
  expiresAt: number;
  // granted short descriptions snapshot
  skillDescriptions: Record<string, string>;
}

export interface RunLog {
  ts: string;
  skill: string;
  args: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
  permissionDenied?: string;
}

export interface Config {
  mcpServers?: Record<string, unknown>;
  sprayMaxDepth?: number;
  briefingTtlMs?: number;
  briefingMaxPerHour?: number;
  briefingMaxSkills?: number;
  briefingMaxSummaryChars?: number;
  runTimeoutMs?: number;
  runMaxOutputBytes?: number;
  [k: string]: unknown;
}
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export interface ToolSafety {
  readOnly: boolean;
  destructive: boolean;
  idempotent: boolean;
  openWorld?: boolean;
}

const READ: ToolSafety = { readOnly: true, destructive: false, idempotent: true };
const CREATE: ToolSafety = { readOnly: false, destructive: false, idempotent: false };
const MUTATE: ToolSafety = { readOnly: false, destructive: true, idempotent: false };

/** Explicit overrides; anything not listed is classified by name prefix. */
const OVERRIDES: Record<string, ToolSafety> = {
  e2e_attach_volume: CREATE,
  e2e_attach_security_group: CREATE,
  e2e_detach_volume: MUTATE,
  e2e_detach_security_group: MUTATE,
  e2e_node_action: MUTATE,
  e2e_database_action: MUTATE,
  e2e_action_reserved_ip: MUTATE,
  e2e_tir_notebook_action: MUTATE,
  e2e_configure_credentials: { readOnly: false, destructive: true, idempotent: true },
  // Can issue any method; the handler itself restricts it to GET in read-only mode.
  e2e_raw_request: { readOnly: false, destructive: true, idempotent: false, openWorld: true },
};

export function classifyTool(name: string): ToolSafety {
  if (OVERRIDES[name]) return OVERRIDES[name];
  if (/^e2e_(tir_)?(list|get|test)_/.test(name)) return READ;
  if (/^e2e_(tir_)?create_/.test(name)) return CREATE;
  // Unknown or delete_*: assume the most dangerous, so new tools fail safe.
  return MUTATE;
}

export interface ToolPolicyOptions {
  readOnly: boolean;
  /** Tool names or group names. If non-empty, only these are registered. */
  enabledTools: string[];
  /** Tool names or group names that are never registered. */
  disabledTools: string[];
  /** Destructive calls must pass confirm: true. */
  requireConfirm: boolean;
}

/**
 * Wraps server.tool() so every tool gets MCP safety annotations, and:
 *  - in read-only mode, mutating tools are not registered;
 *  - enabled/disabled lists (tool or group names) filter what is registered;
 *  - destructive tools require an explicit `confirm: true` argument.
 * Returns a setter the caller uses to tag the group of subsequently registered tools.
 */
export function applyToolPolicy(server: McpServer, opts: ToolPolicyOptions): (group: string) => void {
  const original = server.tool.bind(server) as (...args: any[]) => any;
  let group = '';

  const matches = (list: string[], name: string) => list.includes(name) || list.includes(group);

  (server as any).tool = (name: string, ...rest: any[]) => {
    const safety = classifyTool(name);
    if (opts.readOnly && !safety.readOnly && name !== 'e2e_raw_request') return undefined;
    if (opts.enabledTools.length > 0 && !matches(opts.enabledTools, name)) return undefined;
    if (matches(opts.disabledTools, name)) return undefined;

    const annotations = {
      readOnlyHint: safety.readOnly,
      destructiveHint: safety.destructive,
      idempotentHint: safety.idempotent,
      openWorldHint: safety.openWorld ?? true,
    };

    // Signature used by all tools: (name, description, paramsSchema, cb).
    let cb = rest.pop();
    const needsConfirm = opts.requireConfirm && safety.destructive && name !== 'e2e_configure_credentials';
    if (needsConfirm && rest.length === 2) {
      rest[1] = {
        ...rest[1],
        confirm: z
          .boolean()
          .optional()
          .describe(
            name === 'e2e_raw_request'
              ? 'Required (true) for any non-GET request. Only set after the user has explicitly approved this exact action.'
              : 'Required (true) for this destructive or state-changing action. Only set after the user has explicitly approved this exact action.'
          ),
      };
      const inner = cb;
      cb = async (args: any, extra: any) => {
        const mutating = name !== 'e2e_raw_request' || args?.method !== 'GET';
        if (mutating && args?.confirm !== true) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text:
                  `Confirmation required: ${name} changes or deletes cloud resources and was not executed. ` +
                  'Show the user exactly what will happen, and only after they explicitly approve, call again with confirm: true.',
              },
            ],
          };
        }
        return inner(args, extra);
      };
    }
    return original(name, ...rest, annotations, cb);
  };

  return (g: string) => {
    group = g;
  };
}

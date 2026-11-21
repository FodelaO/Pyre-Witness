/** Loads the optional live twin context when a conversation sends its first message. */

type ContextModule = { buildAgentContext: () => unknown };
type ContextFiles = { keys(): string[]; (path: string): ContextModule };
declare const require: { context: (root: string, recursive: boolean, file: RegExp) => ContextFiles };

export function readAgentContext(): unknown {
  const files = require.context("..", false, /^\.\/context\.ts$/);
  const file = files.keys()[0];
  if (!file) throw new Error("Agent context is unavailable");
  const { buildAgentContext } = files(file);
  return buildAgentContext();
}

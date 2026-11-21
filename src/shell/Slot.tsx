"use client";

/**
 * Feature slot: isolates each feature behind Suspense + an error boundary so one feature that is
 * mid-edit (or crashes) never blanks the rest of the twin.
 */
import { Component, Suspense, type ReactNode } from "react";

interface Props {
  name: string;
  children: ReactNode;
  /** Render nothing (instead of a notice) while loading or on error. */
  quiet?: boolean;
}

class Boundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (!this.props.quiet) console.warn("[slot:" + this.props.name + "]", error.message);
  }

  render() {
    if (this.state.error) {
      if (this.props.quiet) return null;
      return (
        <div className="flex h-full w-full items-center justify-center p-4">
          <div className="rounded-md border border-pw-line bg-pw-panel px-3 py-2 text-xs text-pw-dim">
            {this.props.name} unavailable.
            <button
              className="ml-3 rounded border border-pw-line-strong px-2 py-0.5 text-pw-text hover:bg-pw-panel-2"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Slot(props: Props) {
  const fallback = props.quiet ? null : (
    <div className="flex h-full w-full items-center justify-center">
      <span className="pw-mono text-[10px] uppercase tracking-[0.25em] text-pw-faint">{props.name}</span>
    </div>
  );
  return (
    <Boundary {...props}>
      <Suspense fallback={fallback}>{props.children}</Suspense>
    </Boundary>
  );
}

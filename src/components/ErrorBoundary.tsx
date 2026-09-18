import { Component, type ErrorInfo, type ReactNode } from "react";

export type ErrorBoundaryProps = Readonly<{
  children: ReactNode;
  /** Rendered when a descendant throws. Receives the error and a reset callback. */
  fallback: (error: unknown, reset: () => void) => ReactNode;
  /**
   * Changing this value clears a captured error.
   *
   * Used to retry after the caller has addressed the cause — e.g. after
   * rebuilding an async Kit client whose promise rejected.
   */
  resetKey?: unknown;
  /** Reporting hook. */
  onError?: (error: unknown, info: ErrorInfo) => void;
}>;

type ErrorBoundaryState = { error: unknown };

/**
 * Catches render-phase errors from descendants.
 *
 * This exists for one specific failure mode: `ClientProvider` awaits an async
 * Kit client during render, so a **rejected client promise surfaces as a render
 * error**. With no boundary, React unmounts the entire root — which presents as
 * a blank window with no explanation and no way to recover.
 *
 * A custom boundary is needed because React still has no hook equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    // Re-arm when the caller signals that the cause may be resolved.
    if (this.state.error !== null && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error !== null) {
      return this.props.fallback(error, this.reset);
    }
    return this.props.children;
  }
}

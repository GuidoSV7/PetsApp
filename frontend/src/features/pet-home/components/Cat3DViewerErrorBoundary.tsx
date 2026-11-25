"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import styles from "./pet-home.module.css";

type Props = {
  children: ReactNode;
  petName?: string;
};

type State = {
  error: Error | null;
  resetKey: number;
};

/** Isolates WebGL/R3F failures so the pet stage can offer a local retry. */
export class Cat3DViewerErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Recoverable viewer fault — keep route error.tsx out of the loop.
    console.error("Cat3DViewer crashed", error.message, info.componentStack);
  }

  private retry = () => {
    this.setState((prev) => ({ error: null, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.error) {
      const name = this.props.petName?.trim() || "tu michi";
      return (
        <div className={styles.viewerError} role="alert">
          <p className={styles.viewerErrorCopy}>
            No pudimos mostrar a {name} en 3D. Probá de nuevo.
          </p>
          <button
            type="button"
            className={styles.loadRetry}
            onClick={this.retry}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return (
      <div key={this.state.resetKey} className={styles.viewerBoundaryHost}>
        {this.props.children}
      </div>
    );
  }
}

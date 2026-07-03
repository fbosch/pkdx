import { Component, type ReactNode } from "react";
import { DetailScreen, Modal } from "../components";
import { colors, textStyles } from "../design-tokens";

type DetailErrorModalProps = {
  message: string;
  title?: string;
};

type DetailErrorBoundaryProps = {
  children: ReactNode;
  onError?: (error: Error) => void;
  renderError?: (error: Error) => ReactNode;
  resetKey: string;
};

type DetailErrorBoundaryState = {
  error: Error | undefined;
  resetKey: string;
};

export function DetailErrorModal({
  message,
  title = "Detail Error",
}: DetailErrorModalProps) {
  return (
    <Modal right="Recoverable" rightWidth={11} title={title} width={84}>
      <box style={{ flexDirection: "column", gap: 1 }}>
        <box style={{ flexDirection: "column" }}>
          {message.split("\n").map((line, index) => (
            <text key={index.toString()} fg={colors.error}>
              {line.length === 0 ? " " : line}
            </text>
          ))}
        </box>
        <text fg={colors.muted} attributes={textStyles.muted}>
          Press r to retry or / to search.
        </text>
      </box>
    </Modal>
  );
}

export class DetailErrorBoundary extends Component<
  DetailErrorBoundaryProps,
  DetailErrorBoundaryState
> {
  state: DetailErrorBoundaryState = {
    error: undefined,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(
    error: Error,
  ): Partial<DetailErrorBoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(
    props: DetailErrorBoundaryProps,
    state: DetailErrorBoundaryState,
  ): Partial<DetailErrorBoundaryState> | null {
    if (props.resetKey === state.resetKey) {
      return null;
    }

    return { error: undefined, resetKey: props.resetKey };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.error !== undefined) {
      if (this.props.renderError !== undefined) {
        return this.props.renderError(this.state.error);
      }

      return (
        <DetailScreen>
          <DetailErrorModal message={this.state.error.message} />
        </DetailScreen>
      );
    }

    return this.props.children;
  }
}

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Button } from "@fluentui/react-components";
import { ArrowSyncRegular } from "@fluentui/react-icons";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          gap: "16px",
          color: "#323130",
        }}>
          <div style={{ fontSize: "20px", fontWeight: 600 }}>Something went wrong</div>
          <div style={{ fontSize: "14px", color: "#605e5c", maxWidth: "500px", textAlign: "center" }}>
            {this.state.error?.message ?? "An unexpected error occurred."}
          </div>
          <Button
            appearance="primary"
            icon={<ArrowSyncRegular />}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.hash = "#/projects";
              window.location.reload();
            }}
          >
            Reload Application
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

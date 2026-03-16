import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error("App render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-premium p-6 text-slate-700">
          Something went wrong while rendering this page. Please refresh.
        </div>
      );
    }

    return this.props.children;
  }
}

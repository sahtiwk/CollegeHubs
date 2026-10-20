import React from 'react';
import { Link } from 'react-router-dom';
export default class PageBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="status-page stack" role="alert">
      <h1>This page couldn’t open.</h1>
      <p>Your saved work is still available. Reload to try again, or return to your dashboard.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload page</button>
      <Link to="/dashboard">Return to dashboard</Link>
    </section>;
  }
}

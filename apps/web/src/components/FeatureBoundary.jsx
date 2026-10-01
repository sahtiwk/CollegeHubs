import React from 'react';
export default class FeatureBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <section className="panel stack" role="alert"><h1>Learn couldn't open.</h1><p>Your Hub is still available. Try opening Learn again.</p><button onClick={() => this.setState({ failed: false })}>Retry Learn</button></section> : this.props.children; }
}

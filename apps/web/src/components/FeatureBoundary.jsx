import React from 'react';
export default class FeatureBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { const name=this.props.name||'Learn'; return this.state.failed ? <section className="panel stack" role="alert"><h1>{name} couldn't open.</h1><p>Your Hub is still available. Try opening {name} again.</p><button onClick={() => this.setState({ failed: false })}>Retry {name}</button></section> : this.props.children; }
}

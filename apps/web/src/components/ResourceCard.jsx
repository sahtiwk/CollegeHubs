import React from 'react';
import channelContract from '@collegehubs/contracts/channel.cjs';
export default function ResourceCard({ message }) {
  let url;
  try { url = channelContract.resourceUrl(message.url); } catch { return <div className="resource-card"><p role="status">This saved resource link is unavailable.</p>{message.text && <p>{message.text}</p>}</div>; }
  return <div className="resource-card"><span className="eyebrow">SOMETHING WORTH SHARING</span><a href={url} target="_blank" rel="noopener noreferrer">{message.title} <span aria-hidden="true">&#8599;</span><span className="sr-only"> (opens a new tab)</span></a><small className="muted">{new URL(url).hostname}</small>{message.text && <p>{message.text}</p>}</div>;
}

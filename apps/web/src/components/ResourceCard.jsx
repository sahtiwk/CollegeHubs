import React from 'react';
import channelContract from '@collegehubs/contracts/channel.cjs';
export default function ResourceCard({ message }) {
  let url;
  try { url = channelContract.resourceUrl(message.url); } catch { return <p>Resource link unavailable.</p>; }
  return <div className="resource-card"><span className="eyebrow">Resource</span><a href={url} target="_blank" rel="noopener noreferrer">{message.title} <span aria-hidden="true">&#8599;</span><span className="sr-only"> (opens a new tab)</span></a><small className="muted">{new URL(url).hostname}</small>{message.text && <p>{message.text}</p>}</div>;
}

import React from 'react';
import CodeBlock from './CodeBlock';
import ResourceCard from './ResourceCard';
export default function MessageList({ items, onQuestion, label = 'Saved messages' }) {
  return <ol className="channel-messages" aria-label={label}>{items.map(message => <li key={message._id} className={message.acceptedAnswerId ? 'message-accepted' : ''}>
    <div className="message-meta"><strong>{message.authorName}</strong><small className="muted">Saved #{message.seq} &middot; {new Date(message.createdAt).toLocaleString()}</small><span className="pill">{message.type}</span>{message.acceptedAnswerId && <span className="answer-status">Answered</span>}</div>
    {message.type === 'code' ? <CodeBlock text={message.text} language={message.language} /> : message.type === 'resource' ? <ResourceCard message={message} /> : <p className="message-prose">{message.text}</p>}
    {message.type === 'question' && <button onClick={() => onQuestion(message._id)}>{message.acceptedAnswerId ? 'View accepted answer and thread' : 'Open question thread'}</button>}
    {message.type === 'answer' && <button onClick={() => onQuestion(message.questionId)}>View question and replies</button>}
  </li>)}</ol>;
}

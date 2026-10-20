// Interview pages share the existing Core/module session boundary.
import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import ResumesPage from './ResumesPage';
import { PracticeAccess } from './InterviewState';
import { NewInterviewPage, DraftPage } from './PreparationPages';
import { InterviewSessionPage } from './InterviewSessionPage';
import { SessionResultPage } from './SessionResultPage';
import { SessionHistoryPage } from './SessionHistoryPage';
import './interview.css';
export default function Interview(){const {pathname}=useLocation();let content:React.ReactNode;const match=pathname.match(/^\/interview\/(interviews|sessions|results)\/([a-f0-9]{24})$/);if(['/interview','/interview/','/interview/resumes'].includes(pathname))content=<ResumesPage/>;else{let page=pathname==='/interview/new'?<NewInterviewPage/>:pathname==='/interview/history'?<SessionHistoryPage/>:match?match[1]==='interviews'?<DraftPage id={match[2]}/>:match[1]==='sessions'?<InterviewSessionPage id={match[2]}/>:<SessionResultPage id={match[2]}/>:<p className="card">Interview page unavailable. <Link to="/interview">Back to resumes</Link>.</p>;content=<PracticeAccess key={pathname}>{page}</PracticeAccess>;}return <div className="interview-page stack"><nav className="interview-actions" aria-label="Interview navigation"><NavLink to="/interview/resumes">Resumes</NavLink><NavLink to="/interview/new">New interview</NavLink><NavLink to="/interview/history">History</NavLink></nav>{content}</div>;}

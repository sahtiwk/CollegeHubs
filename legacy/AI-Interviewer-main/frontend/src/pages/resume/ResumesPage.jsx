import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Trash2, Star, Loader2, CheckCircle,
  AlertCircle, ExternalLink, ChevronDown, ChevronUp,
  Cpu, Briefcase, Code2, GraduationCap, RefreshCw, X,
} from 'lucide-react';
import { resumeAPI } from '@/services/api';
import toast from 'react-hot-toast';

const PARSE_STATUS = {
  pending: { label: 'Processing',     cls: 'badge-warning', icon: Loader2 },
  parsed:  { label: 'Text extracted', cls: 'badge-success', icon: CheckCircle },
  failed:  { label: 'Parse failed',   cls: 'badge-danger',  icon: AlertCircle },
};

/* ── Chip ─────────────────────────────────────────────────────────── */
function Chip({ label }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-brand-600/20 text-brand-300 border border-brand-500/30">
      {label}
    </span>
  );
}

/* ── Section block inside parsed panel ───────────────────────────── */
function ParsedSection({ icon: Icon, title, color, children }) {
  return (
    <div>
      <div className={`flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

/* ── Expanded parsed data panel for one resume ───────────────────── */
function ParsedDataPanel({ resume, onReparse }) {
  const d = resume.parsedData;
  const [showModal, setShowModal] = useState(false);
  const [jdInput, setJdInput]     = useState('');
  const [parsing, setParsing]     = useState(false);

  const handleReparse = async () => {
    setParsing(true);
    try {
      await onReparse(resume._id, jdInput);
      setShowModal(false);
      setJdInput('');
    } finally {
      setParsing(false);
    }
  };

  if (!d) {
    return (
      <div className="mt-4 pt-4 border-t border-surface-border">
        <p className="text-xs text-slate-500 text-center">
          Structured data not available.{' '}
          <button
            onClick={() => setShowModal(true)}
            className="text-brand-400 hover:underline"
          >
            Parse now →
          </button>
        </p>
        {showModal && (
          <ReparseModal
            jdInput={jdInput}
            setJdInput={setJdInput}
            parsing={parsing}
            onConfirm={handleReparse}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-surface-border space-y-4">

      {/* Candidate name */}
      {d.name && (
        <p className="text-sm font-semibold text-white">
          👤 {d.name}
        </p>
      )}

      {/* Skills */}
      {Array.isArray(d.skills) && d.skills.length > 0 && (
        <ParsedSection icon={Cpu} title="Skills" color="text-brand-400">
          <div className="flex flex-wrap gap-1.5">
            {d.skills.map((s, i) => <Chip key={i} label={s} />)}
          </div>
        </ParsedSection>
      )}

      {/* Experience */}
      {Array.isArray(d.experience) && d.experience.length > 0 && (
        <ParsedSection icon={Briefcase} title="Experience" color="text-violet-400">
          <div className="space-y-2">
            {d.experience.map((exp, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface-border/30 border border-surface-border text-xs">
                <p className="font-semibold text-white">{exp.role} {exp.company && <span className="text-slate-400">@ {exp.company}</span>}</p>
                {exp.duration && <p className="text-slate-500 mt-0.5">{exp.duration}</p>}
                {Array.isArray(exp.tech) && exp.tech.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {exp.tech.map((t, j) => <Chip key={j} label={t} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ParsedSection>
      )}

      {/* Projects */}
      {Array.isArray(d.projects) && d.projects.length > 0 && (
        <ParsedSection icon={Code2} title="Projects" color="text-emerald-400">
          <div className="space-y-2">
            {d.projects.map((proj, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface-border/30 border border-surface-border text-xs">
                <p className="font-semibold text-white">{proj.title}</p>
                {proj.description && <p className="text-slate-400 mt-0.5 leading-relaxed">{proj.description}</p>}
                {Array.isArray(proj['tech stack']) && proj['tech stack'].length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {proj['tech stack'].map((t, j) => <Chip key={j} label={t} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ParsedSection>
      )}

      {/* Education */}
      {d.education && (
        <ParsedSection icon={GraduationCap} title="Education" color="text-amber-400">
          <p className="text-xs text-slate-300">
            {typeof d.education === 'string'
              ? d.education
              : JSON.stringify(d.education)}
          </p>
        </ParsedSection>
      )}

      {/* JD fields — shown when parsed with a JD */}
      {d.role && (
        <ParsedSection icon={Briefcase} title="JD Role" color="text-rose-400">
          <p className="text-xs text-slate-300">{d.role}</p>
        </ParsedSection>
      )}
      {Array.isArray(d.required_skills) && d.required_skills.length > 0 && (
        <ParsedSection icon={Cpu} title="Required Skills (JD)" color="text-rose-400">
          <div className="flex flex-wrap gap-1.5">
            {d.required_skills.map((s, i) => <Chip key={i} label={s} />)}
          </div>
        </ParsedSection>
      )}

      {/* Re-parse button */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-400 transition-colors"
      >
        <RefreshCw className="w-3 h-3" /> Re-parse with Job Description
      </button>

      {showModal && (
        <ReparseModal
          jdInput={jdInput}
          setJdInput={setJdInput}
          parsing={parsing}
          onConfirm={handleReparse}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

/* ── Re-parse modal overlay ───────────────────────────────────────── */
function ReparseModal({ jdInput, setJdInput, parsing, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-lg">Re-parse Resume</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <p className="text-slate-400 text-sm">
          Optionally paste a job description to get richer JD-matched parsing
          (required skills, responsibilities, preferred skills).
        </p>

        <textarea
          className="form-textarea h-36"
          placeholder="Paste job description here (optional)..."
          value={jdInput}
          onChange={(e) => setJdInput(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} disabled={parsing} className="btn-primary">
            {parsing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing…</>
              : <><RefreshCw className="w-4 h-4" /> Parse</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function ResumesPage() {
  const [resumes, setResumes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [expanded, setExpanded] = useState(null); // resume._id or null

  const fetchResumes = () => {
    resumeAPI.getAll()
      .then(({ data }) => setResumes(data.resumes || []))
      .finally(() => setLoading(false));
  };

  useEffect(fetchResumes, []);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File size must be under 5MB'); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const { data } = await resumeAPI.upload(formData);
      setResumes((prev) => [data.resume, ...prev]);
      toast.success(`"${file.name}" uploaded & analysed!`);
      setExpanded(data.resume._id); // auto-expand new upload
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resume?')) return;
    setDeleting(id);
    try {
      await resumeAPI.delete(id);
      setResumes((prev) => prev.filter((r) => r._id !== id));
      if (expanded === id) setExpanded(null);
      toast.success('Resume deleted');
    } catch {
      toast.error('Failed to delete resume');
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await resumeAPI.setDefault(id);
      setResumes((prev) => prev.map((r) => ({ ...r, isDefault: r._id === id })));
      toast.success('Default resume updated');
    } catch {
      toast.error('Failed to update default');
    }
  };

  const handleReparse = async (id, jobDescription) => {
    const toastId = toast.loading('AI is parsing your resume…');
    try {
      const { data } = await resumeAPI.parse(id, jobDescription);
      setResumes((prev) =>
        prev.map((r) => r._id === id ? { ...r, parsedData: data.parsedData, isParsed: true } : r)
      );
      toast.success('Resume parsed successfully!', { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Parsing failed.', { id: toastId });
      throw err;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-display font-bold text-white">My Resumes</h2>
        <p className="text-slate-400 mt-1">Upload your resume so AI can personalise your interview questions.</p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-brand-500 bg-brand-600/10' : 'border-surface-border hover:border-brand-500/60 hover:bg-surface-hover'}
          ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
          ) : (
            <div className={`p-4 rounded-2xl ${isDragActive ? 'bg-brand-600/30' : 'bg-surface-border/50'} transition-colors`}>
              <Upload className={`w-8 h-8 ${isDragActive ? 'text-brand-400' : 'text-slate-500'}`} />
            </div>
          )}
          <div>
            <p className="font-semibold text-white">
              {uploading ? 'Uploading & analysing…' : isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
            </p>
            <p className="text-slate-500 text-sm mt-1">or <span className="text-brand-400">click to browse</span></p>
          </div>
          <p className="text-xs text-slate-600">PDF, DOC, DOCX • Max 5MB</p>
        </div>
      </div>

      {/* Resume list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-surface-border rounded w-1/2 mb-2" />
              <div className="h-3 bg-surface-border rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No resumes uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm">{resumes.length} resume{resumes.length !== 1 ? 's' : ''}</p>
          <AnimatePresence>
            {resumes.map((resume) => {
              const ps    = PARSE_STATUS[resume.parseStatus] || PARSE_STATUS.pending;
              const PsIcon = ps.icon;
              const isOpen = expanded === resume._id;

              return (
                <motion.div
                  key={resume._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="card p-5"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${resume.isDefault ? 'bg-amber-600/20' : 'bg-brand-600/20'}`}>
                        <FileText className={`w-5 h-5 ${resume.isDefault ? 'text-amber-400' : 'text-brand-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-medium text-white text-sm truncate">{resume.originalName}</p>
                          {resume.isDefault && (
                            <span className="badge bg-amber-600/20 text-amber-300 border-amber-500/30">
                              <Star className="w-3 h-3" /> Default
                            </span>
                          )}
                          {resume.isParsed && (
                            <span className="badge bg-emerald-600/20 text-emerald-300 border-emerald-500/30 text-xs">
                              ✦ AI Parsed
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className={`badge ${ps.cls} flex items-center gap-1`}>
                            <PsIcon className={`w-3 h-3 ${resume.parseStatus === 'pending' ? 'animate-spin' : ''}`} />
                            {ps.label}
                          </span>
                          {resume.fileSize && (
                            <span className="text-slate-500">{(resume.fileSize / 1024).toFixed(0)} KB</span>
                          )}
                          <span className="text-slate-500">
                            {new Date(resume.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {resume.parseStatus === 'parsed' && (
                        <button
                          onClick={() => setExpanded(isOpen ? null : resume._id)}
                          className="btn-ghost p-2 text-brand-400"
                          title={isOpen ? 'Collapse' : 'View parsed data'}
                        >
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                      <a href={`https://docs.google.com/viewer?url=${encodeURIComponent(resume.fileUrl)}`} target="_blank" rel="noreferrer"
                        className="btn-ghost p-2" title="View file">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {!resume.isDefault && (
                        <button onClick={() => handleSetDefault(resume._id)}
                          className="btn-ghost p-2 text-amber-400" title="Set as default">
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(resume._id)} disabled={deleting === resume._id}
                        className="btn-danger p-2 aspect-square">
                        {deleting === resume._id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Parsed data panel (expandable) */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <ParsedDataPanel resume={resume} onReparse={handleReparse} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

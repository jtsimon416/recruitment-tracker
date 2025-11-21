import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, ArrowRight, Briefcase,
  DollarSign, X, CheckCircle, Linkedin, Copy, Loader, Upload
} from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

// --- STYLES ---
const styles = `
  :root {
    --career-bg: #0f172a;
    --career-card: #1e293b;
    --career-text: #f8fafc;
    --career-text-muted: #94a3b8;
    --career-accent: #e11d48;
    --career-accent-glow: rgba(225, 29, 72, 0.3);
    --career-border: #334155;
  }

  .career-page {
    font-family: 'Inter', sans-serif;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    min-height: 100vh;
    width: 100%;
    color: var(--career-text);
    overflow-x: hidden;
    position: relative;
  }

  .career-header {
    background: linear-gradient(to bottom, #0f172a, #1e293b);
    padding: 4rem 2rem 6rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .header-glow {
    position: absolute;
    top: -50%;
    left: 50%;
    transform: translate(-50%, 0);
    width: 600px;
    height: 600px;
    background: var(--career-accent);
    filter: blur(150px);
    opacity: 0.15;
    border-radius: 50%;
    pointer-events: none;
  }

  .career-title {
    font-size: 3.5rem;
    font-weight: 800;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #fff 0%, #cbd5e1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.02em;
  }

  .career-subtitle {
    font-size: 1.25rem;
    color: var(--career-text-muted);
    max-width: 600px;
    margin: 0 auto 3rem;
    line-height: 1.6;
  }

  .search-container {
    background: rgba(255, 255, 255, 0.07);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 0.75rem 1rem;
    border-radius: 20px;
    display: flex;
    gap: 0.5rem;
    max-width: 720px;
    margin: 0 auto;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
    align-items: center;
  }

  .search-input-wrapper {
    flex: 1;
    position: relative;
    min-width: 200px;
  }

  .search-icon {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--career-text-muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 3rem 0.75rem 1rem; /* left padding for text, right padding for icon */
    background: transparent;
    border: none;
    color: #e5e7eb;
    font-size: 1rem;
    outline: none;
    transition: color 0.2s ease;
  }
  .search-input:focus {
    color: #fff;
  }

  .search-btn {
    background: var(--career-accent);
    color: white;
    border: none;
    padding: 0 2rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 48px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .search-btn:hover {
    background: #be123c;
    box-shadow: 0 6px 16px rgba(0,0,0,0.3);
    transform: translateY(-2px);
  }

  .search-btn:hover {
    background: #be123c;
    box-shadow: 0 0 15px var(--career-accent-glow);
  }

  .jobs-container {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 2rem;
    position: relative;
    z-index: 2;
  }

  .jobs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .job-card {
    background: var(--career-card);
    border: 1px solid var(--career-border);
    border-radius: 16px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  }
  .job-card:hover {
    transform: translateY(-6px) scale(1.02);
    border-color: var(--career-accent);
    box-shadow: 0 12px 30px rgba(0,0,0,0.25);
  }

  .job-card:hover {
    transform: translateY(-5px);
    border-color: var(--career-accent);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .job-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .job-category {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--career-accent);
    font-weight: 700;
    background: rgba(225, 29, 72, 0.1);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
  }

  .job-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .job-meta {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    color: var(--career-text-muted);
    font-size: 0.9rem;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .job-footer {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .salary-tag {
    color: #10b981;
    font-weight: 600;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .view-btn {
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: gap 0.2s;
  }

  .job-card:hover .view-btn {
    color: var(--career-accent);
    gap: 0.5rem;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(5px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .modal-content {
    background: var(--career-card);
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    border-radius: 24px;
    border: 1px solid var(--career-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    padding: 2rem;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid var(--career-border);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .modal-scroll {
    padding: 2rem;
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    padding: 1.5rem 2rem;
    border-top: 1px solid var(--career-border);
    background: rgba(0, 0, 0, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .apply-btn {
    background: var(--career-accent);
    color: white;
    border: none;
    padding: 1rem 3rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .apply-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px var(--career-accent-glow);
  }

  .share-btn {
    background: transparent;
    border: 1px solid var(--career-border);
    color: white;
    padding: 0.75rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .share-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: white;
  }

  .prose {
    color: #cbd5e1;
    line-height: 1.7;
  }
  .prose h3 {
    color: white;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .prose ul {
    padding-left: 1.2rem;
    margin-bottom: 1rem;
  }
  .prose li {
    margin-bottom: 0.5rem;
  }

  @media (max-width: 768px) {
    .career-title { font-size: 2.5rem; }
    .jobs-grid { grid-template-columns: 1fr; }
    .modal-footer { flex-direction: column; gap: 1rem; }
    .apply-btn { width: 100%; }
  }
`;

// --- MOCK DATA (For Preview/Fallback) ---
const MOCK_JOBS = [
  {
    id: 1,
    title: "Senior Full Stack Engineer",
    location: "Remote (US/Canada)",
    type: "Full-time",
    salary: "$140k - $180k",
    posted: "2 days ago",
    category: "Engineering",
    company: "TechCorp",
    description: `<p>Build scalable features using React and Node.js.</p>`
  },
  {
    id: 2,
    title: "Product Manager",
    location: "New York, NY",
    type: "Hybrid",
    salary: "$130k - $160k",
    posted: "5 days ago",
    category: "Product",
    company: "Innovate Inc",
    description: `<p>Lead product vision for our core platform.</p>`
  }
];

// --- SUB-COMPONENT: JOB CARD ---
const JobCard = ({ job, onClick }) => (
  <motion.div
    layoutId={`card-${job.id}`}
    className="job-card"
    onClick={() => onClick(job)}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="job-card-header">
      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{job.posted}</span>
    </div>

    <h3 className="job-title">{job.title}</h3>

    <div className="job-meta">
      <div className="meta-item">
        <MapPin size={14} />
        {job.location}
      </div>
      <div className="meta-item">
        <Briefcase size={14} />
        {job.type}
      </div>
    </div>

    <div className="job-footer">
      <div className="salary-tag">
        <DollarSign size={16} />
        {job.salary}
      </div>
      <div className="view-btn">
        View Details <ArrowRight size={16} />
      </div>
    </div>
  </motion.div>
);

// --- MAIN PAGE COMPONENT ---
const PublicCareerPage = () => {
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // --- UNCOMMENT FOR PRODUCTION TO FETCH REAL JOBS ---
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('positions')
          .select('*, clients(company_name)')
          .eq('status', 'Open')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedJobs = data.map(p => ({
          id: p.id,
          title: p.title,
          location: 'Remote / Hybrid', // Default location text
          type: 'Full-time',
          salary: p.salary_range || 'Competitive',
          posted: new Date(p.created_at).toLocaleDateString(),
          category: p.clients?.company_name || 'Tech',
          company: p.clients?.company_name || 'Unknown',
          description: p.description
        }));

        setJobs(formattedJobs);
      } catch (error) {
        console.error('Error loading jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedJob) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedJob]);

  // Filter Logic
  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleShare = () => {
    const url = `${window.location.origin}/#/careers?job=${selectedJob.id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApply = () => {
    const subject = encodeURIComponent(`Application: ${selectedJob.title}`);
    const body = encodeURIComponent(`Hi, I'm interested in the ${selectedJob.title} role. Please find my resume attached.`);
    window.location.href = `mailto:careers@brydongama.com?subject=${subject}&body=${body}`;
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Upload to Storage
      const filePath = `${new Date().getTime()}_${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(filePath, file);
      if (uploadError) throw uploadError;

      // 2. Extract Text
      let resumeText = '';
      const arrayBuffer = await file.arrayBuffer();

      if (file.type === 'application/pdf') {
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          resumeText += text.items.map(item => item.str).join(' ') + '\n';
        }
      } else if (file.name.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ arrayBuffer });
        resumeText = result.value;
      } else {
        throw new Error('Unsupported file type. Please upload PDF or DOCX.');
      }

      if (!resumeText) throw new Error('Could not extract text from resume.');

      // 3. Parse with AI
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('ai-parser-test', {
        body: { resumeText }
      });

      if (invokeError) throw new Error(`AI Parse failed: ${invokeError.message}`);
      if (invokeData.error) throw new Error(invokeData.error);

      const parsed = invokeData.parsedData;
      const skillsArray = typeof parsed.skills === 'string'
        ? parsed.skills.split(',').map(s => s.trim()).filter(Boolean)
        : parsed.skills || [];

      // 4. Create Candidate
      const { error: insertError } = await supabase.from('candidates').insert([{
        name: parsed.name || 'Unknown Candidate',
        email: parsed.email || '',
        phone: parsed.phone || '',
        location: parsed.location || '',
        linkedin_url: parsed.linkedin_url || '',
        skills: skillsArray, // Supabase handles array if column is text[] or jsonb, otherwise join
        notes: `Applied for: ${selectedJob.title}\n\nSummary: ${parsed.summary || ''}`,
        resume_url: filePath,
        document_type: 'Resume',
        source: 'Career Page',
        status: 'New Application' // Assuming this status exists or is just text
      }]);

      if (insertError) throw insertError;

      alert('Application submitted successfully! We will be in touch.');
      setSelectedJob(null); // Close modal

    } catch (error) {
      console.error('Upload Error:', error);
      alert(`Failed to submit application: ${error.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = null; // Reset input
    }
  };

  return (
    <div className="career-page">
      {/* Inject Styles */}
      <style>{styles}</style>

      {/* Header Section */}
      <header className="career-header">
        <div className="header-glow" />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '2px', color: 'white' }}>
              BRYDON<span style={{ color: 'var(--career-accent)' }}>GAMA</span>
            </h2>
          </div>
          <h1 className="career-title">Build the Future With Us</h1>
          <p className="career-subtitle">
            Explore our open roles and find your next challenge.
            We are looking for passionate individuals to join our world-class team.
          </p>

          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                className="search-input"
                placeholder="Search by role or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Job List Section */}
      <main className="jobs-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Open Positions</h2>
          <span style={{ color: '#94a3b8' }}>{filteredJobs.length} roles found</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <Loader className="spinning" size={32} style={{ margin: '0 auto 1rem' }} />
            <p>Loading positions...</p>
          </div>
        ) : (
          <div className="jobs-grid">
            {filteredJobs.map(job => (
              <JobCard key={job.id} job={job} onClick={setSelectedJob} />
            ))}
          </div>
        )}

        {!loading && filteredJobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <Briefcase size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3>No roles found matching "{searchTerm}"</h3>
            <p>Try a different keyword or check back later.</p>
          </div>
        )}
      </main>

      {/* Job Details Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
            <motion.div
              className="modal-content"
              layoutId={`card-${selectedJob.id}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* Modal Header */}
              <div className="modal-header">
                <div>
                  <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{selectedJob.title}</h2>
                  <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={16} /> {selectedJob.location}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Briefcase size={16} /> {selectedJob.type}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981' }}>
                      <DollarSign size={16} /> {selectedJob.salary}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="modal-scroll">
                <div className="prose" dangerouslySetInnerHTML={{ __html: selectedJob.description }} />


              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button className="share-btn" onClick={handleShare}>
                  {isCopied ? <CheckCircle size={18} color="#10b981" /> : <Copy size={18} />}
                  {isCopied ? 'Copied!' : 'Share Job'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button className="apply-btn" onClick={handleApply} style={{ background: 'transparent', border: '1px solid var(--career-accent)' }}>
                    Email Application
                  </button>

                  <input
                    type="file"
                    accept=".pdf,.docx"
                    style={{ display: 'none' }}
                    id="resume-upload"
                    onChange={handleResumeUpload}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="resume-upload"
                    className="apply-btn"
                    style={{
                      cursor: isUploading ? 'wait' : 'pointer',
                      opacity: isUploading ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isUploading ? <Loader className="spinning" size={18} /> : <Upload size={18} />}
                    {isUploading ? 'Parsing...' : 'Quick Apply'}
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicCareerPage;

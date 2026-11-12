import React, { useCallback, useEffect, useState } from "react";
import {
  Activity, Archive, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Bell,
  BookOpen, Check, CheckCircle2, ChevronRight,
  CircleAlert, Clock3, Eye, EyeOff, FilePlus2, FileSearch, FileText,
  Filter, FolderOpen, Gauge, Inbox, LogOut, Menu, Plus, RefreshCw,
  Search, ShieldCheck, SlidersHorizontal, UploadCloud,
  UserRound, X, XCircle, Building2, File, ExternalLink, Link2, Maximize2, Download, Youtube
} from "lucide-react";
import OrbitScene from "./OrbitScene.jsx";

const api = {
  async call(path, { token, method = "GET", body, headers = {} } = {}) {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    let payload = body;
    if (body && !(body instanceof FormData)) {
      h["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const response = await fetch(path, { method, headers: h, body: payload });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Solicitarea nu a putut fi procesată.");
    return data;
  }
};

const ADMIN_LOGIN_EMAIL = "admin@outsiders.ogland";

const statusMeta = {
  pending: { label: "În verificare", cls: "pending", icon: Clock3 },
  approved: { label: "Aprobat", cls: "approved", icon: CheckCircle2 },
  rejected: { label: "Respins", cls: "rejected", icon: XCircle },
  revision: { label: "Necesită completări", cls: "revision", icon: CircleAlert }
};
const orgMeta = {
  PD: { label: "Poliție / PD", icon: ShieldCheck },
  SMURD: { label: "SMURD", icon: Activity },
  "Alte organizații": { label: "Alte organizații", icon: Building2 }
};
const categoryLabels = {
  integrity: "Integritate / conduită", abuse: "Abuz de autoritate",
  leak: "Divulgare de informații", procedure: "Nerespectarea procedurilor",
  other: "Altă sesizare"
};
const dateFmt = value => value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(new Date(value)) : "Nespecificată";

function StatusPill({ status }) {
  const meta = statusMeta[status] || statusMeta.pending;
  const Icon = meta.icon;
  return <span className={`status-pill ${meta.cls}`}><Icon size={13}/>{meta.label}</span>;
}
function Brand({ compact = false }) {
  return <div className={`brandmark ${compact ? "compact" : ""}`}><span className="brand-dot"/><span>OUTSIDERS</span><small>ARCHIVE NETWORK</small></div>;
}
function AuthScreen({ onAuth, onGuest }) {
  const [form, setForm] = useState({ email: ADMIN_LOGIN_EMAIL, password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [apiOnline, setApiOnline] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("API indisponibil"); setApiOnline(true); })
      .catch(() => { if (!controller.signal.aborted) setApiOnline(false); });
    return () => controller.abort();
  }, []);
  const set = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }));
  const submit = async e => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const data = await api.call("/api/auth/login", { method: "POST", body: form });
      if (data.user.role !== "admin") throw new Error("Accesul este rezervat administratorului.");
      onAuth(data);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="auth-page">
    <div className="auth-top"><Brand/><span className={`network-label ${apiOnline === false ? "network-offline" : ""}`}><span className="live-dot"/> {apiOnline === false ? "API STATUS: UNAVAILABLE" : apiOnline ? "NETWORK STATUS: ONLINE" : "CHECKING NETWORK..."}</span></div>
    <div className="auth-layout">
      <section className="auth-hero">
        <div className="eyebrow"><span/> SISTEM DE DOCUMENTARE ȘI ARHIVARE</div>
        <h1 className="animated-word">OUTSIDERS<span className="word-cursor">_</span></h1>
        <p className="auth-copy">Faptele merită documentate.<br/><b>Informația merită verificată.</b></p>
        <p className="auth-description">Un spațiu organizat pentru sesizări, materiale justificative și verificarea transparentă a informațiilor care privesc organizațiile comunității.</p>
        <div className="auth-metrics"><div><strong>01</strong><span>DOCUMENTEAZĂ</span></div><div><strong>02</strong><span>VERIFICĂ</span></div><div><strong>03</strong><span>ARHIVEAZĂ</span></div></div>
        <OrbitScene/><div className="orbit-caption"><span className="tiny-pulse"/> SECURE RECORD ENVIRONMENT <span>·</span> OUTSIDERS NODE</div>
      </section>
      <section className="auth-card">
        <div className="card-topline"><span>ACCES ADMINISTRATOR</span><span>AUTH / 01</span></div>
        <div className="auth-card-title">Panou administrativ.</div>
        <p className="muted">Autentificarea este necesară doar pentru administrarea și moderarea dosarelor.</p>
        <form onSubmit={submit} className="form-stack">
          <label>Adresă de e-mail<input type="email" name="email" value={form.email} onChange={set} placeholder="admin@exemplu.ro" required autoComplete="username"/></label>
          <label>Parolă<div className="password-field"><input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={set} placeholder="Introdu parola" required autoComplete="current-password"/><button type="button" className="password-toggle" aria-label={showPassword ? "Ascunde parola" : "Arată parola"} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
          {error && <div className="form-error"><CircleAlert size={15}/>{error}</div>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? "SE VERIFICĂ..." : "INTRĂ ÎN DASHBOARD"}<ArrowRight size={16}/></button>
        </form>
        <button className="button button-secondary button-wide public-entry" onClick={onGuest}><ArrowRight size={16}/> CONTINUĂ CA VIZITATOR</button>
        <div className="auth-security"><ShieldCheck size={15}/> Poți crea și consulta dosare fără cont. Autentificarea este doar pentru administrator.</div>
      </section>
    </div>
    <footer className="auth-footer"><span>© OUTSIDERS ARCHIVE NETWORK</span><span>PRIVATE DOSSIERS / ADMIN ACCESS</span></footer>
  </div>;
}

function Sidebar({ user, page, setPage, logout, adminLogin, mobileOpen, closeMobile }) {
  const admin = user.role === "admin";
  const nav = admin ? [
    { id: "overview", label: "Panou principal", icon: Gauge },
    { id: "queue", label: "Dosare de verificat", icon: Inbox },
    { id: "archive", label: "Arhivă completă", icon: Archive }
  ] : [
    { id: "access", label: "Dosare", icon: FolderOpen }
  ];
  return <>
    {mobileOpen && <div className="mobile-scrim" onClick={closeMobile}/>}
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="side-brand"><Brand compact/><button className="mobile-close" onClick={closeMobile}><X size={18}/></button></div>
      <div className="side-label">SPAȚIU DE LUCRU</div>
      <nav>{nav.map(item => <button key={item.id} className={`nav-link ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); closeMobile(); }}><item.icon size={17}/><span>{item.label}</span>{item.id === "queue" && admin && <i className="nav-mark"/>}</button>)}</nav>
      <div className="side-bottom">
        <div className="access-card"><div className="access-icon">{admin ? <ShieldCheck size={17}/> : <UserRound size={17}/>}</div><div><b>{admin ? "Administrator" : "Vizitator"}</b><small>{admin ? "Permisiuni de moderare" : "Acces fără cont"}</small></div></div>
        {admin ? <button className="logout-button" onClick={logout}><LogOut size={16}/>Deconectare</button> : <button className="logout-button" onClick={adminLogin}><ShieldCheck size={16}/>Acces administrator</button>}
        <div className="side-version">OUTSIDERS NETWORK <span>v1.1.0</span></div>
      </div>
    </aside>
  </>;
}

function Topbar({ user, title, onMenu, onRefresh }) {
  return <header className="topbar">
    <button className="menu-button" onClick={onMenu}><Menu size={19}/></button>
    <div className="breadcrumb"><span>OUTSIDERS</span><ChevronRight size={14}/><b>{title}</b></div>
    <div className="top-right"><span className="secure-label"><span className="live-dot"/> SESIUNE SECURIZATĂ</span>{user.role === "admin" && <button className="refresh-button" type="button" onClick={onRefresh} aria-label="Actualizează dosarele" title="Actualizează dosarele"><RefreshCw size={15}/></button>}<div className="avatar">{user.role === "admin" ? (user.name || user.email).slice(0,1).toUpperCase() : <UserRound size={16}/>}</div><div className="user-meta"><b>{user.role === "admin" ? user.name : "Vizitator"}</b><small>{user.role === "admin" ? "ADMINISTRATOR" : "VIZITATOR"}</small></div></div>
  </header>;
}

function PageHeading({ eyebrow, title, text, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{text && <p>{text}</p>}</div>{action}</div>;
}
function StatCard({ label, value, detail, icon: Icon, accent }) {
  return <div className={`stat-card ${accent || ""}`}><div className="stat-top"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><small>{detail}</small></div>;
}
function EmptyState({ icon: Icon = Archive, title, text, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={25}/></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}
function DossierCard({ dossier, onOpen, admin = false }) {
  const OrgIcon = orgMeta[dossier.organization]?.icon || Building2;
  return <button className="dossier-card" onClick={() => onOpen(dossier)}>
    <div className="dossier-card-top"><span className="org-chip"><OrgIcon size={13}/>{dossier.organization === "Alte organizații" ? dossier.organizationOther : orgMeta[dossier.organization]?.label}</span><StatusPill status={dossier.status}/></div>
    <h3>{dossier.title}</h3><p>{dossier.summary}</p>
    <div className="dossier-card-bottom"><span>{dossier.reference}</span><span>{dateFmt(dossier.createdAt)}</span></div>
    {admin && <div className="dossier-owner"><UserRound size={13}/> Trimis de {dossier.ownerName}</div>}
    <div className="card-arrow"><ArrowUpRightIcon/></div>
  </button>;
}
function ArrowUpRightIcon() { return <ArrowUpRight size={17}/>; }

function Overview({ user, dossiers, setPage, openDossier }) {
  const admin = user.role === "admin";
  const guest = user.role === "guest";
  const pending = dossiers.filter(d => d.status === "pending");
  const approved = dossiers.filter(d => d.status === "approved");
  const mine = guest ? [] : dossiers.filter(d => d.ownerId === user.id);
  const visible = admin ? dossiers.slice(0, 4) : approved.slice(0, 3);
  return <div className="page-content">
    <PageHeading eyebrow={admin ? "CONTROL ROOM / MODERARE" : "ARHIVĂ PUBLICĂ / OVERVIEW"} title={admin ? "Panou de control." : guest ? "Bine ai venit." : `Salut, ${user.name.split(" ")[0]}.`} text={admin ? "Monitorizează sesizările, verifică materialele și gestionează publicarea dosarelor." : guest ? "Consultă arhiva publică sau transmite un dosar nou, fără să îți creezi un cont." : "Aici urmărești sesizările tale și documentele aprobate disponibile în arhivă."} action={!admin && <button className="button button-primary" onClick={() => setPage("create")}><Plus size={16}/> Creează dosar</button>}/>
    <div className="stats-grid">
      {admin ? <>
        <StatCard label="În așteptare" value={pending.length} detail="Necesită analiză" icon={Clock3} accent="stat-warm"/>
        <StatCard label="Aprobate" value={approved.length} detail="Publicate în arhivă" icon={BadgeCheck}/>
        <StatCard label="Total dosare" value={dossiers.length} detail="Toate înregistrările" icon={Archive}/>
      </> : <>
        <StatCard label="Dosare publicate" value={approved.length} detail="Disponibile în arhivă" icon={Archive}/>
        {guest ? <StatCard label="Acces public" value="LIBER" detail="Nu este necesar un cont" icon={UserRound}/> : <StatCard label="Trimise de tine" value={mine.length} detail="Toate stările" icon={FileText}/>}
        {guest ? <StatCard label="Transmitere" value="24/7" detail="Dosare și dovezi atașate" icon={FilePlus2}/> : <StatCard label="În verificare" value={mine.filter(d => d.status === "pending" || d.status === "revision").length} detail="Așteaptă actualizare" icon={Clock3} accent="stat-warm"/>}
      </>}
    </div>
    {admin && pending.length > 0 && <div className="notice-banner"><div className="notice-symbol"><Bell size={18}/></div><div><b>{pending.length} {pending.length === 1 ? "dosar așteaptă" : "dosare așteaptă"} verificarea ta</b><span>Analizează informațiile și probele înainte de a lua o decizie.</span></div><button onClick={() => setPage("queue")}>Deschide coada <ArrowRight size={15}/></button></div>}
    <div className="section-title-row"><div><div className="eyebrow">{admin ? "ACTIVITATE RECENTĂ" : "DIN ARHIVĂ"}</div><h2>{admin ? "Ultimele înregistrări" : "Dosare aprobate recent"}</h2></div><button className="text-button" onClick={() => setPage(admin ? "archive" : "archive")}>Vezi arhiva <ArrowRight size={15}/></button></div>
    {visible.length ? <div className="dossier-grid">{visible.map(d => <DossierCard key={d.id} dossier={d} onOpen={openDossier} admin={admin}/>)}</div> : <EmptyState icon={admin ? Inbox : Archive} title={admin ? "Nu există înregistrări" : "Arhiva este în curs de formare"} text={admin ? "Dosarele noi trimise de utilizatori vor apărea aici." : "Când un dosar este verificat și aprobat, îl vei putea consulta aici."} action={!admin && <button className="button button-secondary" onClick={() => setPage("create")}><Plus size={15}/> Creează prima sesizare</button>}/>}
    <div className="guideline-strip"><ShieldCheck size={18}/><div><b>Documentare responsabilă</b><span>Separă faptele observabile de presupuneri. Atașează context și materiale justificative relevante.</span></div><BookOpen size={18}/></div>
  </div>;
}

function DossierForm({ token, onCreated, onCancel }) {
  const [form, setForm] = useState({
    title: "", organization: "PD", organizationOther: "", category: "integrity",
    priority: "normal", incidentDate: "", location: "", summary: "", details: "",
    people: "", chronology: "", requestedAction: ""
  });
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState({});
  const [videoLinks, setVideoLinks] = useState([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const urls = {};
    files.forEach((file, index) => { if (file.type.startsWith("image/")) urls[index] = URL.createObjectURL(file); });
    setFilePreviews(urls);
    return () => Object.values(urls).forEach(URL.revokeObjectURL);
  }, [files]);
  const update = e => setForm(v => ({ ...v, [e.target.name]: e.target.value }));
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k,v]) => data.append(k,v));
      files.forEach(f => data.append("evidence",f));
      videoLinks.map(v => v.trim()).filter(Boolean).forEach(v => data.append("videoLinks", v));
      const result = await api.call("/api/dossiers", { token, method: "POST", body: data });
      onCreated(result);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="page-content">
    <PageHeading eyebrow="NOUĂ ÎNREGISTRARE / SUBMIT" title="Creează un dosar." text="Completează informațiile cât mai clar. Dosarul va intra în verificare înainte de a putea apărea în arhiva publicată."/>
    <form className="dossier-form" onSubmit={submit}>
      <div className="form-section"><div className="form-section-head"><span>01</span><div><h3>Identificarea sesizării</h3><p>Precizează organizația și natura situației semnalate.</p></div></div>
        <div className="form-grid">
          <label className="full">Titlul dosarului<input name="title" value={form.title} onChange={update} maxLength="140" placeholder="Ex. Verificarea unei posibile divulgări de informații" minLength="8" required/></label>
          <label>Organizația vizată<select name="organization" value={form.organization} onChange={update}><option>PD</option><option>SMURD</option><option>Alte organizații</option></select></label>
          {form.organization === "Alte organizații" && <label>Care organizație?<input name="organizationOther" value={form.organizationOther} onChange={update} placeholder="Denumirea organizației" required/></label>}
          <label>Tipul sesizării<select name="category" value={form.category} onChange={update}>{Object.entries(categoryLabels).map(([k,v]) => <option value={k} key={k}>{v}</option>)}</select></label>
          <label>Prioritate<select name="priority" value={form.priority} onChange={update}><option value="normal">Normală</option><option value="important">Importantă</option><option value="urgent">Urgentă</option></select></label>
          <label>Data incidentului<input type="date" name="incidentDate" value={form.incidentDate} onChange={update}/></label>
          <label>Locul / contextul<input name="location" value={form.location} onChange={update} maxLength="300" placeholder="Locație, departament sau canal de comunicare"/></label>
        </div>
      </div>
      <div className="form-section"><div className="form-section-head"><span>02</span><div><h3>Descrierea situației</h3><p>Redactează cronologic și diferențiază informația confirmată de suspiciuni.</p></div></div>
        <div className="form-grid">
          <label className="full">Rezumatul sesizării<textarea name="summary" value={form.summary} onChange={update} minLength="30" maxLength="1500" placeholder="În câteva propoziții: ce s-a întâmplat, care este problema și ce anume trebuie verificat..." required/></label>
          <label className="full">Descriere detaliată<textarea className="large-textarea" name="details" value={form.details} onChange={update} minLength="40" maxLength="15000" placeholder="Descrie faptele observate, împrejurările, sursa informațiilor și de ce consideri că situația necesită verificare. Nu prezenta presupunerile ca fapte demonstrate." required/></label>
          <label className="full">Persoane / identificatori relevanți<textarea name="people" value={form.people} onChange={update} maxLength="4000" placeholder="Nume, Call Sign, funcție și rolul cunoscut în situație. Include doar informații relevante."/></label>
          <label className="full">Cronologia evenimentelor<textarea name="chronology" value={form.chronology} onChange={update} maxLength="6000" placeholder="Data / ora — eveniment — sursa care susține informația. Repetă pentru fiecare etapă."/></label>
        </div>
      </div>
      <div className="form-section"><div className="form-section-head"><span>03</span><div><h3>Materiale și solicitări</h3><p>Încarcă documente justificative și precizează ce verificare soliciți.</p></div></div>
        <label className="upload-control"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain" onChange={e => { const chosen = [...e.target.files]; if (chosen.length > 8) { setFiles([]); setError("Poți atașa maximum 8 fișiere."); } else if (chosen.some(file => file.size > 12 * 1024 * 1024)) { setFiles([]); setError("Fiecare fișier trebuie să aibă maximum 12 MB."); } else { setFiles(chosen); setError(""); } e.target.value = ""; }}/><UploadCloud size={23}/><b>Adaugă materiale justificative</b><span>JPG, PNG, WEBP, GIF, PDF sau TXT · maximum 8 fișiere · 12 MB / fișier</span>{files.length > 0 && <em>{files.map(f => f.name).join(" · ")}</em>}</label>
        {files.length > 0 && <div className="evidence-upload-preview">{files.map((file,i) => <div className="upload-preview-item" key={`${file.name}-${i}`}>{file.type.startsWith("image/") ? <img src={filePreviews[i] || ""} alt={file.name}/> : <div className="upload-file-icon"><FileText size={22}/></div>}<span title={file.name}>{file.name}</span><button type="button" aria-label="Elimină fișierul" onClick={() => setFiles(v => v.filter((_,n) => n !== i))}><X size={14}/></button></div>)}</div>}
        <div className="youtube-inputs"><div className="youtube-input-heading"><Youtube size={19}/><div><b>Linkuri video YouTube</b><small>Adaugă înregistrări video relevante. Vor apărea cu player direct în dosar.</small></div></div>{videoLinks.map((link,index) => <div className="youtube-input-row" key={index}><Link2 size={16}/><input type="url" value={link} onChange={e => setVideoLinks(v => v.map((x,i) => i === index ? e.target.value : x))} placeholder="https://www.youtube.com/watch?v=..."/><button type="button" aria-label="Elimină link" onClick={() => setVideoLinks(v => v.length === 1 ? [""] : v.filter((_,i) => i !== index))}><X size={15}/></button>{youtubeEmbed(link) && <div className="youtube-form-preview"><iframe src={youtubeEmbed(link)} title={`Previzualizare YouTube ${index+1}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div>}</div>)}{videoLinks.length < 8 && <button type="button" className="text-button add-video-link" onClick={() => setVideoLinks(v => [...v, ""])}><Plus size={15}/> Adaugă încă un link</button>}</div>
        <label className="full-label">Ce măsură sau clarificare soliciți?<textarea name="requestedAction" value={form.requestedAction} onChange={update} maxLength="4000" placeholder="Ex. Verificarea procedurii, clarificarea accesului la informații, analiza conversației complete și solicitarea unui punct de vedere..."/></label>
      </div>
      <div className="form-notice"><ShieldCheck size={18}/><span>Dosarul va fi verificat de administrator. Dacă este aprobat, administratorul va seta o parolă sau va genera una automat și ți-o va transmite împreună cu referința dosarului.</span></div>
      {error && <div className="form-error"><CircleAlert size={15}/>{error}</div>}
      <div className="form-actions"><button type="button" className="button button-ghost" onClick={onCancel}>Anulează</button><button className="button button-primary" disabled={busy}>{busy ? "SE TRIMITE..." : "TRIMITE SPRE VERIFICARE"}<ArrowRight size={16}/></button></div>
    </form>
  </div>;
}

function CredentialsScreen({ dossier, trackingSecret, onHome }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Referință: ${dossier.reference}\nCod de urmărire: ${trackingSecret}`);
      setCopied(true); setCopyError("");
    } catch {
      setCopyError("Clipboard indisponibil. Copiază manual datele afișate.");
    }
  };
  return <div className="page-content">
    <PageHeading eyebrow="DOSAR ÎNREGISTRAT" title="Dosarul a fost trimis." text="Dosarul a ajuns la administrator și va fi verificat înainte de publicare. Poți urmări starea lui folosind codul privat de mai jos."/>
    <div className="side-info-card submission-success credential-panel" style={{maxWidth:720, padding:28, marginTop:24}}>
      <div className="eyebrow">REFERINȚĂ DOSAR</div><h2 className="credential-value">{dossier.reference}</h2>
      <div className="credential-divider"/>
      <div className="eyebrow">COD PRIVAT DE URMĂRIRE</div><strong className="tracking-secret-value">{trackingSecret}</strong>
      <p className="muted" style={{marginTop:18}}>Păstrează ambele valori. Referința identifică dosarul, iar codul privat îți permite să verifici starea și să trimiți completări atunci când administratorul le solicită. Codul nu este parola de acces la dosarul aprobat.</p>
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={copy}><FileText size={15}/>{copied ? "DATE COPIATE" : "COPIAZĂ DATELE"}</button><button type="button" className="button button-primary" onClick={onHome}>ÎNAPOI LA DOSARE <ArrowRight size={16}/></button></div>
      {copyError && <div className="form-error">{copyError}</div>}
    </div>
  </div>;
}

function TrackDossier() {
  const [reference, setReference] = useState("");
  const [trackingSecret, setTrackingSecret] = useState("");
  const [tracking, setTracking] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [busy, setBusy] = useState(false);
  const [responseBusy, setResponseBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checkStatus = async event => {
    event.preventDefault(); setBusy(true); setError(""); setSuccess(""); setTracking(null);
    try {
      const result = await api.call("/api/dossiers/status", { method: "POST", body: { reference, trackingSecret } });
      setTracking(result.tracking);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const sendResponse = async event => {
    event.preventDefault(); setResponseBusy(true); setError(""); setSuccess("");
    try {
      const result = await api.call("/api/dossiers/response", { method: "POST", body: { reference, trackingSecret, responseText } });
      setTracking(result.tracking);
      setResponseText("");
      setSuccess("Completările au fost trimise. Dosarul a revenit în verificare.");
    } catch (err) { setError(err.message); }
    finally { setResponseBusy(false); }
  };

  return <section className="tracking-card">
    <div className="eyebrow">TRACK / STATUS</div>
    <h2>Urmărește un dosar.</h2>
    <p>Introdu referința și codul privat primit la trimiterea sesizării. Nu folosi parola dosarului aici.</p>
    <form className="tracking-form" onSubmit={checkStatus}>
      <label>Referință dosar<input value={reference} onChange={event => setReference(event.target.value.toUpperCase())} placeholder="OUT-2026-ABC123" required/></label>
      <label>Cod privat de urmărire<input value={trackingSecret} onChange={event => setTrackingSecret(event.target.value.trim())} placeholder="Codul primit după trimitere" required autoComplete="off"/></label>
      <button className="button button-secondary button-wide" disabled={busy}>{busy ? "SE VERIFICĂ..." : "VERIFICĂ STAREA DOSARULUI"}<ArrowRight size={15}/></button>
    </form>
    {error && <div className="form-error tracking-message"><CircleAlert size={15}/>{error}</div>}
    {success && <div className="tracking-success"><CheckCircle2 size={15}/>{success}</div>}
    {tracking && <div className="tracking-result">
      <div className="tracking-result-head"><span>STAREA CURENTĂ</span><StatusPill status={tracking.status}/></div>
      <h3>{tracking.title}</h3>
      <div className="tracking-meta"><span>{tracking.reference}</span><span>Actualizat: {dateFmt(tracking.updatedAt)}</span></div>
      {tracking.adminNote && <div className="tracking-admin-note"><b>MESAJ DE LA ADMINISTRATOR</b><p>{tracking.adminNote}</p></div>}
      {tracking.status === "revision" && <form className="tracking-response" onSubmit={sendResponse}>
        <label>Trimite completările solicitate<textarea value={responseText} onChange={event => setResponseText(event.target.value)} minLength={10} maxLength={6000} placeholder="Răspunde punctual la solicitarea administratorului..." required/></label>
        <button className="button button-primary button-wide" disabled={responseBusy || responseText.trim().length < 10}>{responseBusy ? "SE TRIMITE..." : "TRIMITE COMPLETĂRILE"}<ArrowRight size={15}/></button>
      </form>}
      {tracking.history?.length > 0 && <div className="tracking-history"><b>ISTORIC</b>{tracking.history.slice().reverse().map((entry, index) => <div className="tracking-history-entry" key={`${entry.at}-${index}`}><span>{statusMeta[entry.status]?.label || entry.status}</span><small>{dateFmt(entry.at)}</small>{entry.note && <p>{entry.note}</p>}</div>)}</div>}
    </div>}
  </section>;
}

function AccessPage({ initialReference = "", onUnlock, onCreate }) {
  const [reference, setReference] = useState(initialReference);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setReference(initialReference); setPassword(""); setError(""); }, [initialReference]);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api.call("/api/dossiers/access", { method: "POST", body: { reference, password } });
      onUnlock(result.dossier, password);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div className="page-content">
    <PageHeading eyebrow="ARHIVĂ / ACCES SECURIZAT" title="Dosare." text="Introdu referința și parola stabilită de administrator după aprobarea dosarului. Fiecare dosar este privat și poate fi deschis doar cu datele corecte."/>
    <form className="dossier-form" style={{maxWidth:560}} onSubmit={submit}>
      <div className="form-section"><label>Referință dosar<input value={reference} onChange={e => setReference(e.target.value.toUpperCase())} placeholder="OUT-2026-ABC123" required/></label><label style={{marginTop:16}}>Parola dosarului<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Introdu parola primită de la administrator" required autoComplete="off"/></label></div>
      {error && <div className="form-error"><CircleAlert size={15}/>{error}</div>}
      <button className="button button-primary" disabled={busy}>{busy ? "SE VERIFICĂ..." : "DESCHIDE DOSARUL"}<ArrowRight size={16}/></button>
      <div className="access-create-cta"><span>Nu ai încă un dosar?</span><button className="text-button" type="button" onClick={onCreate}><Plus size={15}/> CREEAZĂ UN DOSAR</button></div>
    </form>
    <TrackDossier/>
  </div>;
}

function ArchivePage({ dossiers, onOpen, admin }) {
  const [search, setSearch] = useState("");
  const [org, setOrg] = useState("all");
  const [status, setStatus] = useState("all");
  const filtered = dossiers.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || [d.title,d.reference,d.summary,d.organization,d.organizationOther].join(" ").toLowerCase().includes(q);
    return matchQ && (org === "all" || d.organization === org) && (status === "all" || d.status === status);
  });
  const exportCsv = () => {
    const quote = value => {
      let cell = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
      return `"${cell.replace(/"/g, '""')}"`;
    };
    const headers = ["Referință", "Titlu", "Organizație", "Categorie", "Prioritate", "Stare", "Rezumat", "Locație", "Data înregistrării", "Data incidentului", "Autor"];
    const rows = filtered.map(d => [d.reference, d.title, d.organization === "Alte organizații" ? d.organizationOther : orgMeta[d.organization]?.label, categoryLabels[d.category], d.priority, statusMeta[d.status]?.label || d.status, d.summary, d.location, d.createdAt, d.incidentDate, d.ownerName]);
    const csv = "\uFEFF" + [headers, ...rows].map(row => row.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `outsiders-arhiva-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };
  return <div className="page-content">
    <PageHeading eyebrow={admin ? "ADMIN / TOATE ÎNREGISTRĂRILE" : "ARHIVĂ PUBLICĂ / PUBLIC RECORDS"} title={admin ? "Arhiva completă." : "Dosare aprobate."} text={admin ? "Vizualizează toate dosarele și starea lor curentă." : "Consultă documentele care au trecut prin procesul de verificare și au fost aprobate."} action={admin ? <button className="button button-secondary" onClick={exportCsv} disabled={!filtered.length}><Download size={15}/> EXPORTĂ CSV</button> : null}/>
    <div className="filter-bar"><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Caută după titlu, referință sau cuvinte-cheie..."/></div><select value={org} onChange={e => setOrg(e.target.value)}><option value="all">Toate organizațiile</option><option value="PD">Poliție / PD</option><option value="SMURD">SMURD</option><option value="Alte organizații">Alte organizații</option></select>{admin && <select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Toate stările</option><option value="pending">În verificare</option><option value="approved">Aprobate</option><option value="revision">Necesită completări</option><option value="rejected">Respinse</option></select>}</div>
    <div className="results-line"><span>{filtered.length} {filtered.length === 1 ? "DOSAR" : "DOSARE"}</span><span><Filter size={13}/> FILTRARE ACTIVĂ</span></div>
    {filtered.length ? <div className="dossier-grid">{filtered.map(d => <DossierCard key={d.id} dossier={d} onOpen={onOpen} admin={admin}/>)}</div> : <EmptyState icon={FileSearch} title="Nu am găsit dosare" text="Încearcă alte cuvinte-cheie sau modifică filtrele selectate."/>}
  </div>;
}

function QueuePage({ dossiers, onOpen }) {
  const pending = dossiers.filter(d => d.status === "pending");
  return <div className="page-content">
    <PageHeading eyebrow="ADMIN / REVIEW QUEUE" title="Dosare de verificat." text="Analizează fiecare sesizare, verifică materialele și consemnează decizia de moderare."/>
    <div className="queue-summary"><Inbox size={20}/><div><b>{pending.length} dosare în așteptare</b><span>Dosarele nu sunt vizibile în arhiva publică înainte de aprobare.</span></div></div>
    {pending.length ? <div className="queue-list">{pending.map(d => <div className="queue-item" key={d.id}><div className="queue-main"><div className="queue-ref">{d.reference} <span>·</span> {dateFmt(d.createdAt)}</div><h3>{d.title}</h3><p>{d.summary}</p><div className="queue-meta"><span>{orgMeta[d.organization]?.label || d.organizationOther}</span><span>{categoryLabels[d.category]}</span><span>De la: {d.ownerName}</span></div></div><div className="queue-right"><StatusPill status={d.status}/><button className="button button-primary button-small" onClick={() => onOpen(d)}>Analizează <ArrowRight size={14}/></button></div></div>)}</div> : <EmptyState icon={CheckCircle2} title="Coada este liberă" text="Nu există dosare care să aștepte verificarea."/>}
  </div>;
}

function youtubeEmbed(url) {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(u.hostname)) {
      if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
      else if (/^\/(embed|shorts|live)\//.test(u.pathname)) id = u.pathname.split("/")[2] || "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}

function EvidenceGallery({ dossier, token, accessPassword, onError }) {
  const [previews, setPreviews] = useState({});
  const [active, setActive] = useState(null);
  useEffect(() => {
    let alive = true;
    const urls = [];
    (async () => {
      const next = {};
      for (const file of dossier.evidence || []) {
        if (!file.mimeType?.startsWith("image/") && file.mimeType !== "application/pdf") continue;
        try {
          const response = await fetch(`/api/files/${encodeURIComponent(file.filename)}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(accessPassword ? { "X-Dossier-Password": accessPassword } : {}) } });
          if (!response.ok) throw new Error("Nu s-a putut încărca previzualizarea dovezii.");
          const url = URL.createObjectURL(await response.blob()); urls.push(url); next[file.id] = url;
        } catch (e) { if (alive) onError(e.message); }
      }
      if (alive) setPreviews(next);
    })();
    return () => { alive = false; urls.forEach(URL.revokeObjectURL); };
  }, [dossier.id, dossier.evidence, token, accessPassword]);
  const download = async file => {
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(file.filename)}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(accessPassword ? { "X-Dossier-Password": accessPassword } : {}) } });
      if (!response.ok) throw new Error("Fișierul nu poate fi accesat.");
      const url = URL.createObjectURL(await response.blob()); const a = document.createElement("a"); a.href = url; a.download = file.originalName; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { onError(e.message); }
  };
  const videos = dossier.videoLinks || [];
  return <>
    {(dossier.evidence || []).length > 0 && <div className="evidence-gallery">{dossier.evidence.map(file => {
      const isImage = file.mimeType?.startsWith("image/"); const isPdf = file.mimeType === "application/pdf"; const url = previews[file.id];
      return <article className="evidence-card" key={file.id}>
        <button type="button" className={`evidence-preview ${isImage ? "image-preview" : "document-preview"}`} onClick={() => url && (isImage || isPdf) ? setActive({ file, url }) : download(file)}>
          {url && isImage ? <img src={url} alt={file.originalName}/> : <div className="evidence-placeholder">{isPdf ? <FileText size={32}/> : <File size={32}/>}<span>{isPdf ? "DOCUMENT PDF" : "FIȘIER TEXT"}</span></div>}
          <span className="preview-open"><Maximize2 size={14}/>{url ? "Previzualizează" : "Descarcă"}</span>
        </button>
        <div className="evidence-card-meta"><div><b title={file.originalName}>{file.originalName}</b><small>{file.mimeType} · {(file.size/1024).toFixed(0)} KB</small></div><button type="button" title="Descarcă" onClick={() => download(file)}><Download size={16}/></button></div>
      </article>;
    })}</div>}
    {videos.length > 0 && <div className="youtube-gallery">{videos.map((video,i) => <article className="youtube-card" key={`${video.url}-${i}`}><div className="youtube-player-wrap"><iframe src={youtubeEmbed(video.url)} title={`Dovadă video YouTube ${i+1}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/></div><div className="youtube-card-meta"><span><Youtube size={15}/> DOVADĂ VIDEO {String(i+1).padStart(2,"0")}</span><a href={video.url} target="_blank" rel="noreferrer">Deschide pe YouTube <ExternalLink size={13}/></a></div></article>)}</div>}
    {!dossier.evidence?.length && !videos.length && <p className="muted">Nu au fost atașate materiale justificative.</p>}
    {active && <div className="evidence-lightbox" role="dialog" aria-modal="true" onClick={() => setActive(null)}><div className="lightbox-panel" onClick={e => e.stopPropagation()}><div className="lightbox-head"><b>{active.file.originalName}</b><button type="button" onClick={() => setActive(null)}><X size={20}/></button></div>{active.file.mimeType === "application/pdf" ? <iframe className="pdf-preview" src={active.url} title={active.file.originalName}/> : <img className="lightbox-image" src={active.url} alt={active.file.originalName}/>}</div></div>}
  </>;
}

function DossierDetail({ dossier, user, token, accessPassword, onBack, onReviewed }) {
  const isAdmin = user.role === "admin";
  const [note, setNote] = useState(dossier.adminNote || "");
  const [dossierPassword, setDossierPassword] = useState("");
  const [approvedPassword, setApprovedPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const copyApprovedCredentials = async () => {
    try {
      await navigator.clipboard.writeText(`Referință: ${dossier.reference}\nParolă: ${approvedPassword}`);
      setCopyFeedback("Referința și parola au fost copiate.");
    } catch {
      setCopyFeedback("Clipboard indisponibil. Copiază manual datele afișate.");
    }
  };
  const review = async status => {
    setBusy(true); setError("");
    try {
      const result = await api.call(`/api/dossiers/${dossier.id}/review`, { token, method: "PATCH", body: { status, note, accessPassword: status === "approved" ? dossierPassword : undefined } });
      if (status === "approved") setApprovedPassword(result.accessPassword || dossierPassword);
      onReviewed(result.dossier);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const OrgIcon = orgMeta[dossier.organization]?.icon || Building2;
  return <div className="page-content detail-page">
    <button className="back-button" onClick={onBack}><ArrowLeft size={16}/> Înapoi la listă</button>
    <div className="detail-head"><div><div className="eyebrow">{dossier.reference} / DOSAR DOCUMENTAT</div><h1>{dossier.title}</h1><div className="detail-tags"><span className="org-chip"><OrgIcon size={13}/>{dossier.organization === "Alte organizații" ? dossier.organizationOther : orgMeta[dossier.organization]?.label}</span><StatusPill status={dossier.status}/><span className={`priority priority-${dossier.priority}`}>{dossier.priority === "urgent" ? "PRIORITATE URGENTĂ" : dossier.priority === "important" ? "IMPORTANT" : "NORMAL"}</span></div></div></div>
    {dossier.adminNote && <div className="review-note"><CircleAlert size={18}/><div><b>Notă de verificare</b><p>{dossier.adminNote}</p></div></div>}
    <div className="detail-layout"><div className="detail-main">
      <section className="detail-section"><div className="detail-section-title"><span>01</span><h3>Rezumat</h3></div><p>{dossier.summary}</p></section>
      <section className="detail-section"><div className="detail-section-title"><span>02</span><h3>Descriere detaliată</h3></div><p className="preserve">{dossier.details}</p></section>
      {dossier.people && <section className="detail-section"><div className="detail-section-title"><span>03</span><h3>Persoane / identificatori</h3></div><p className="preserve">{dossier.people}</p></section>}
      {dossier.chronology && <section className="detail-section"><div className="detail-section-title"><span>04</span><h3>Cronologia relatată</h3></div><p className="preserve">{dossier.chronology}</p></section>}
      {dossier.requestedAction && <section className="detail-section"><div className="detail-section-title"><span>05</span><h3>Solicitare</h3></div><p className="preserve">{dossier.requestedAction}</p></section>}
      {dossier.supplementalUpdates?.length > 0 && <section className="detail-section"><div className="detail-section-title"><span>06</span><h3>Completări transmise</h3></div><div className="supplemental-list">{dossier.supplementalUpdates.map(update => <article className="supplemental-entry" key={update.id}><small>{dateFmt(update.createdAt)}</small><p>{update.text}</p></article>)}</div></section>}
      {dossier.history?.length > 0 && <section className="detail-section"><div className="detail-section-title"><span>07</span><h3>Istoric dosar</h3></div><div className="dossier-history">{dossier.history.map((entry, index) => <div className="history-entry" key={`${entry.at}-${index}`}><span className="history-dot"/><div><b>{statusMeta[entry.status]?.label || entry.status}</b><small>{dateFmt(entry.at)}</small>{entry.note && <p>{entry.note}</p>}</div></div>)}</div></section>}
      <section className="detail-section"><div className="detail-section-title"><span>08</span><h3>Dovezi și materiale ({(dossier.evidence?.length || 0) + (dossier.videoLinks?.length || 0)})</h3></div>
        <EvidenceGallery dossier={dossier} token={token} accessPassword={accessPassword} onError={setError}/>{error && <div className="form-error">{error}</div>}
      </section>
    </div><aside className="detail-side">
      <div className="side-info-card"><span>INFORMAȚII DOSAR</span><div><small>Referință</small><b>{dossier.reference}</b></div><div><small>Înregistrat la</small><b>{dateFmt(dossier.createdAt)}</b></div><div><small>Data incidentului</small><b>{dossier.incidentDate ? dateFmt(dossier.incidentDate) : "Nespecificată"}</b></div><div><small>Loc / context</small><b>{dossier.location || "Nespecificat"}</b></div><div><small>Tipul sesizării</small><b>{categoryLabels[dossier.category]}</b></div><div><small>Autor</small><b>{dossier.ownerName}</b></div></div>
      {isAdmin && <div className="moderation-card"><div className="eyebrow">ADMINISTRATOR / DECIZIE</div><h3>Verificare dosar</h3><p>La aprobare, alege parola pe care o vei transmite autorului sau generează una sigură automat.</p><label>Parola dosarului<input value={dossierPassword} onChange={e => setDossierPassword(e.target.value)} placeholder="Alege o parolă (minim 8 caractere)" minLength={8}/></label><button type="button" className="button button-secondary button-wide generate-password" onClick={() => setDossierPassword(makeDossierPassword())}><SlidersHorizontal size={15}/> GENEREAZĂ PAROLĂ AUTOMAT</button><label style={{marginTop:14}}>Notă de moderare<textarea value={note} onChange={e => setNote(e.target.value)} maxLength="4000" placeholder="Argumentează decizia sau descrie ce informații lipsesc..."/></label>{error && <div className="form-error">{error}</div>}{approvedPassword && <div className="approved-password"><b>PAROLA DOSARULUI – TRANSMITE-O AUTORULUI</b><strong>{approvedPassword}</strong><button type="button" className="button button-secondary button-wide" onClick={copyApprovedCredentials}><FileText size={15}/> COPIAZĂ REFERINȚA ȘI PAROLA</button>{copyFeedback && <small className="copy-feedback">{copyFeedback}</small>}</div>}<button disabled={busy || dossierPassword.trim().length < 8} className="button button-primary button-wide" onClick={() => review("approved")}><Check size={15}/> {dossier.status === "approved" ? "Salvează parola nouă" : "Aprobă și publică"}</button><button disabled={busy} className="button button-secondary button-wide" onClick={() => review("revision")}><CircleAlert size={15}/> Solicită completări</button><button disabled={busy} className="button button-danger button-wide" onClick={() => review("rejected")}><X size={15}/> Respinge dosarul</button></div>}
      {!isAdmin && <div className="side-info-card help-card"><ShieldCheck size={19}/><b>Proces de verificare</b><p>{user.role === "guest" ? "Dosarul a fost transmis anonim. Păstrează referința și parola primite la trimitere; vei avea nevoie de ambele pentru a reveni la dosar. Dosarele sunt publicate doar după verificare." : "Dosarele sunt analizate înainte de publicare. Dacă sunt necesare completări, vei vedea observația administratorului în această pagină."}</p></div>}
    </aside></div>
  </div>;
}

function makeDossierPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(16); crypto.getRandomValues(bytes);
  return Array.from(bytes, n => alphabet[n % alphabet.length]).join("");
}

const GUEST_USER = { id: null, name: "Vizitator", email: "", role: "guest" };

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("outsiders_token") || "");
  const [user, setUser] = useState(() => localStorage.getItem("outsiders_token") ? null : GUEST_USER);
  const [dossiers, setDossiers] = useState([]);
  const [page, setPage] = useState(() => localStorage.getItem("outsiders_token") ? "overview" : "access");
  const [selected, setSelected] = useState(null);
  const [accessPassword, setAccessPassword] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [accessTarget, setAccessTarget] = useState(null);
  const [detailBackPage, setDetailBackPage] = useState("queue");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));
  const [fatal, setFatal] = useState("");

  const refresh = useCallback(async currentToken => {
    const result = await api.call("/api/dossiers", { token: currentToken });
    setDossiers(result.dossiers);
  }, []);

  useEffect(() => {
    if (!token) { setUser(GUEST_USER); refresh("").catch(e => setFatal(e.message)); setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const me = await api.call("/api/auth/me", { token });
        if (!alive) return;
        setUser(me.user);
        await refresh(token);
      } catch {
        localStorage.removeItem("outsiders_token");
        if (alive) { setToken(""); setUser(GUEST_USER); refresh("").catch(e => setFatal(e.message)); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [token, refresh]);

  const handleAuth = data => {
    localStorage.setItem("outsiders_token", data.token);
    setToken(data.token); setUser(data.user); setPage("overview"); setSelected(null);
    refresh(data.token).catch(e => setFatal(e.message));
  };
  const logout = () => {
    localStorage.removeItem("outsiders_token"); setToken(""); setUser(GUEST_USER);
    setDossiers([]); setSelected(null); setAccessPassword(""); setCreatedCredentials(null); setPage("access");
    refresh("").catch(e => setFatal(e.message));
  };
  const openDossier = d => {
    if (user?.role === "admin") { setDetailBackPage(page); setSelected(d); setAccessPassword(""); setPage("detail"); }
    else { setAccessTarget(d); setPage("access"); }
  };
  const enterGuest = () => { setUser(GUEST_USER); setPage("access"); setSelected(null); refresh("").catch(e => setFatal(e.message)); };
  const adminLogin = () => { setUser(null); setToken(""); localStorage.removeItem("outsiders_token"); setPage("overview"); };
  const created = result => {
    setDossiers(v => [result.dossier, ...v]);
    setCreatedCredentials({ dossier: result.dossier, trackingSecret: result.trackingSecret });
    setPage("credentials");
  };
  const unlocked = (d, password) => { setSelected(d); setAccessPassword(password); setAccessTarget(null); setPage("detail"); };
  const reviewed = d => {
    setDossiers(v => v.map(x => x.id === d.id ? d : x));
    setSelected(d);
    if (user.role !== "admin" && d.status === "approved") setPage("archive");
  };
  const navTitle = ({ overview: user?.role === "admin" ? "Panou principal" : "Dosare", queue: "Dosare de verificat", archive: "Arhivă completă", mine: "Dosarele mele", create: "Creează dosar", access: "Dosare", credentials: "Date de acces", detail: "Detalii dosar" })[page] || "Prezentare";

  if (loading) return <div className="loading-screen"><div className="loading-orb"/><Brand/><span>SE INIȚIALIZEAZĂ ARHIVA...</span></div>;
  if (!user) return <AuthScreen onAuth={handleAuth} onGuest={enterGuest}/>;

  const body = selected && page === "detail" ? <DossierDetail key={selected.id} dossier={selected} user={user} token={token} accessPassword={accessPassword} onBack={() => { setSelected(null); setPage(user.role === "admin" ? detailBackPage : user.role === "guest" ? "access" : "mine"); }} onReviewed={reviewed}/> :
    page === "credentials" && createdCredentials ? <CredentialsScreen dossier={createdCredentials.dossier} trackingSecret={createdCredentials.trackingSecret} onHome={() => setPage(user.role === "guest" ? "access" : "overview")}/> :
    page === "access" ? <AccessPage initialReference={accessTarget?.reference || ""} onUnlock={unlocked} onCreate={() => { setAccessTarget(null); setPage("create"); }}/> :
    page === "create" && user.role !== "admin" ? <DossierForm token={token} onCreated={created} onCancel={() => setPage(user.role === "guest" ? "access" : "overview")}/> :
    page === "queue" && user.role === "admin" ? <QueuePage dossiers={dossiers} onOpen={openDossier}/> :
    page === "archive" && user.role === "admin" ? <ArchivePage dossiers={dossiers} onOpen={openDossier} admin={true}/> :
    page === "mine" && user.role !== "admin" ? <div className="page-content"><PageHeading eyebrow="PERSONAL / SUBMISSIONS" title="Dosarele mele." text="Urmărește statusul sesizărilor trimise și consultă observațiile primite." action={<button className="button button-primary" onClick={() => setPage("create")}><Plus size={15}/> Dosar nou</button>}/>{dossiers.filter(d => d.ownerId === user.id).length ? <div className="dossier-grid">{dossiers.filter(d => d.ownerId === user.id).map(d => <DossierCard key={d.id} dossier={d} onOpen={openDossier}/>)}</div> : <EmptyState icon={FolderOpen} title="Nu ai trimis încă niciun dosar" text="Creează o sesizare și urmărește procesul de verificare din această secțiune." action={<button className="button button-primary" onClick={() => setPage("create")}><Plus size={15}/> Creează dosar</button>}/>}</div> :
    (user.role === "guest" ? <AccessPage onUnlock={unlocked} onCreate={() => setPage("create")}/> : <Overview user={user} dossiers={dossiers} setPage={setPage} openDossier={openDossier}/>);

  return <div className="app-shell">
    <Sidebar user={user} page={page} setPage={p => { setSelected(null); setPage(p); }} logout={logout} adminLogin={adminLogin} mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)}/>
    <div className="main-area"><Topbar user={user} title={navTitle} onMenu={() => setMobileOpen(true)} onRefresh={() => refresh(token).catch(e => setFatal(e.message))}/>{fatal && <div className="global-error">{fatal}<button onClick={() => setFatal("")}><X size={14}/></button></div>}{body}</div>
  </div>;
}

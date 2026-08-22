import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Activity, ArrowRight, Atom, Check, Code2, Download, GitBranch, GitCompare, Github, History, Layers3, LockKeyhole, Orbit, Package, Radar, ShieldCheck, Sparkles, UploadCloud, Zap } from "lucide-react";
import type { GenomeFileFormat } from "../../../server/genomeEngine";

const tabs = [
  { id: "extract", label: "Extract", icon: UploadCloud },
  { id: "dna", label: "Software DNA", icon: Radar },
  { id: "compare", label: "Compare", icon: GitCompare },
  { id: "evolution", label: "Evolution", icon: History },
  { id: "phylogeny", label: "Phylogeny", icon: GitBranch },
  { id: "explorer", label: "Genome Explorer", icon: Code2 },
  { id: "standard", label: ".genome standard", icon: Package },
] as const;
type TabId = (typeof tabs)[number]["id"];

const featureCards = [
  { eyebrow: "01 / EXTRACT", title: "Materialize a genome", body: "Point to a repository or upload a ZIP. The analyzer turns source evidence into a portable signature.", icon: UploadCloud, tab: "extract" as TabId },
  { eyebrow: "02 / VISUALIZE", title: "See the DNA", body: "Read structure, behavior signals, and evidence-backed evolution as one navigable profile.", icon: Radar, tab: "dna" as TabId },
  { eyebrow: "03 / COMPARE", title: "Read the distance", body: "Compare two signatures with a normalized distance across measured architecture signals.", icon: GitCompare, tab: "compare" as TabId },
  { eyebrow: "04 / EVOLVE", title: "Observe transformation", body: "History is shown when it exists. Missing Git evidence is never inferred or invented.", icon: History, tab: "evolution" as TabId },
  { eyebrow: "05 / RELATE", title: "Map the lineage", body: "Explore structural proximity between architectural genomes — not biological ancestry.", icon: GitBranch, tab: "phylogeny" as TabId },
];

function formatNumber(value: number) { return new Intl.NumberFormat("en-US").format(value); }
function shortHash(value: string) { return value.length > 17 ? `${value.slice(0, 12)}…${value.slice(-4)}` : value; }

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("extract");
  const [genome, setGenome] = useState<GenomeFileFormat | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const demoQuery = trpc.genome.analyzeDemo.useQuery(undefined, { staleTime: 60_000 });
  const githubMutation = trpc.genome.analyzeGitHub.useMutation({
    onSuccess: (value) => { setGenome(value); setActiveTab("dna"); toast.success("Genome extracted from the repository source."); },
    onError: (error) => toast.error(error.message || "Could not analyze the repository."),
  });

  useEffect(() => {
    if (!genome && demoQuery.data) setGenome(demoQuery.data);
  }, [demoQuery.data, genome]);

  const structure = genome?.signature.dimensions.structure;
  const behavior = genome?.signature.dimensions.behavior;
  const evolution = genome?.signature.dimensions.evolution;
  const languageRows = useMemo(() => {
    if (!structure) return [];
    const total = Math.max(1, structure.filesCount);
    return Object.entries(structure.languages).map(([name, count]) => ({ name, count, width: Math.round((count / total) * 100) })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [structure]);

  async function handleZipUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) { toast.error("Choose a .zip archive."); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("projectZip", file);
      const response = await fetch("/api/analyze-zip", { method: "POST", body: formData });
      const payload = await response.json() as GenomeFileFormat | { error?: string };
      if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "ZIP analysis failed.");
      setGenome(payload as GenomeFileFormat);
      setActiveTab("dna");
      toast.success("ZIP genome extracted securely.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ZIP analysis failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleGithubSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoUrl.trim()) { toast.error("Enter a repository URL first."); return; }
    githubMutation.mutate({ repoUrl: repoUrl.trim() });
  }

  function downloadGenome() {
    if (!genome) return;
    const blob = new Blob([JSON.stringify(genome, null, 2)], { type: "application/vnd.codegenome+json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${genome.project.name || "project"}.genome`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const scrollToAnalyzer = () => document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" });
  const selectTab = (tab: TabId) => { setActiveTab(tab); if (tab !== "extract") document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <div className="cg-shell">
      <div className="cg-stars cg-stars-one" /><div className="cg-stars cg-stars-two" />
      <div className="cg-nebula cg-nebula-cyan" /><div className="cg-nebula cg-nebula-violet" />
      <header className="cg-header">
        <a className="cg-brand" href="#top" aria-label="CodeGenome home"><span className="cg-brand-mark"><Atom size={19} strokeWidth={1.8} /></span><span><strong>Code</strong>Genome</span></a>
        <nav className="cg-top-nav" aria-label="Primary navigation"><button onClick={() => selectTab("standard")}>The standard</button><button onClick={() => selectTab("phylogeny")}>Software phylogeny</button><button onClick={scrollToAnalyzer}>Analyze</button></nav>
        <div className="cg-header-actions">
          <a className="cg-icon-link" href="https://github.com" target="_blank" rel="noreferrer" aria-label="Open GitHub"><Github size={17} /></a>
          {isAuthenticated ? <div className="cg-account"><button className="cg-account-button" onClick={() => setShowMenu(!showMenu)}>{(user?.name || "U").slice(0, 1).toUpperCase()}</button>{showMenu && <div className="cg-account-menu"><span>{user?.name || "Signed in"}</span><button onClick={() => logout()}>Log out</button></div>}</div> : <span className="cg-open-status"><span className="cg-status-dot" /> OPEN SOURCE</span>}
        </div>
      </header>

      <main id="top">
        <section className="cg-hero cg-container">
          <div className="cg-hero-copy">
            <div className="cg-kicker"><span className="cg-kicker-line" /> SOFTWARE GENOME / 01</div>
            <h1>Discover the <em>DNA</em><br />of your software.</h1>
            <p className="cg-hero-lede">CodeGenome turns source code, architecture, and history into a <strong>calculable software genome</strong> — portable, comparable, and open.</p>
            <div className="cg-hero-cta"><Button className="cg-primary-button" onClick={scrollToAnalyzer}>Extract a genome <ArrowRight size={16} /></Button><button className="cg-text-button" onClick={() => selectTab("standard")}>Explore the standard <span>↗</span></button></div>
            <div className="cg-hero-proof"><span><Check size={13} /> No invented metrics</span><span><Check size={13} /> Apache-2.0</span><span><Check size={13} /> ZIP ready</span></div>
          </div>
          <div className="cg-hero-visual" aria-label="Software genome visualization">
            <div className="cg-orbit cg-orbit-a" /><div className="cg-orbit cg-orbit-b" /><div className="cg-orbit cg-orbit-c" />
            <div className="cg-genome-orb"><div className="cg-orb-core"><Activity size={32} strokeWidth={1.2} /><span>GENOME<br />CORE</span></div></div>
            <div className="cg-planet cg-planet-a" /><div className="cg-planet cg-planet-b" /><div className="cg-planet cg-planet-c" />
            <div className="cg-signal-label cg-signal-top"><span>STRUCTURE</span><b>{structure ? `${structure.modulesCount} modules` : "awaiting source"}</b></div>
            <div className="cg-signal-label cg-signal-bottom"><span>SIGNATURE HASH</span><b>{genome ? shortHash(genome.signature.hash) : "gen_••••••••"}</b></div>
          </div>
        </section>

        <section className="cg-proof-strip cg-container"><div><span className="cg-strip-value">{genome ? formatNumber(structure?.filesCount || 0) : "—"}</span><span className="cg-strip-label">files observed</span></div><div><span className="cg-strip-value">{genome ? formatNumber(structure?.linesOfCode || 0) : "—"}</span><span className="cg-strip-label">lines measured</span></div><div><span className="cg-strip-value">{genome ? `${genome.signature.genomeScore}` : "—"}</span><span className="cg-strip-label">genome score</span></div><div><span className="cg-strip-value">{genome ? "1.0.0" : "—"}</span><span className="cg-strip-label">spec version</span></div><div className="cg-strip-source"><span className="cg-status-dot" /> {genome ? genome.project.sourceType.toUpperCase() : "READY FOR SOURCE"}</div></section>

        <section id="analyzer" className="cg-analyzer cg-container">
          <div className="cg-section-intro"><div><div className="cg-kicker"><span className="cg-kicker-line" /> START WITH A SOURCE</div><h2>Materialize a <em>genome.</em></h2></div><p>Choose the input that fits your workflow. Your ZIP is held in memory, extracted into a bounded temporary workspace, and removed after analysis.</p></div>
          <div className="cg-source-grid">
            <Card className="cg-source-card cg-source-card-primary"><CardHeader><div className="cg-card-icon"><Github size={21} /></div><CardTitle>GitHub repository</CardTitle><p>Analyze a public repository URL.</p></CardHeader><CardContent><form onSubmit={handleGithubSubmit} className="cg-url-form"><Input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/org/repository" aria-label="GitHub repository URL" /><Button className="cg-primary-button" type="submit" disabled={githubMutation.isPending}>{githubMutation.isPending ? "Reading…" : "Analyze URL"}<ArrowRight size={15} /></Button></form><span className="cg-form-note"><LockKeyhole size={12} /> Source URL only · Apache-2.0 implementation</span></CardContent></Card>
            <Card className="cg-source-card cg-source-card-upload"><CardHeader><div className="cg-card-icon"><UploadCloud size={21} /></div><CardTitle>Project ZIP</CardTitle><p>When GitHub or the CLI do not fit.</p></CardHeader><CardContent><button className="cg-dropzone" onClick={() => fileInputRef.current?.click()} disabled={uploading}><input ref={fileInputRef} type="file" accept=".zip,application/zip" onChange={handleZipUpload} hidden />{uploading ? <><span className="cg-spinner" /><strong>Extracting genome…</strong></> : <><UploadCloud size={22} /><strong>Drop a ZIP or browse</strong><span>50 MB upload limit · temporary analysis</span></>}</button><span className="cg-form-note"><ShieldCheck size={12} /> Path traversal and archive-bomb guards enabled</span></CardContent></Card>
          </div>
        </section>

        <section id="workspace" className="cg-workspace cg-container">
          <div className="cg-workspace-head"><div><div className="cg-kicker"><span className="cg-kicker-line" /> GENOME LAB</div><h2>Read the <em>signature.</em></h2></div>{genome && <div className="cg-workspace-meta"><Badge className="cg-badge">{genome.project.sourceType}</Badge><span>{genome.project.name}</span><button onClick={downloadGenome} className="cg-download-button"><Download size={14} /> .genome</button></div>}</div>
          <div className="cg-tab-list" role="tablist" aria-label="Genome views">{tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={activeTab === id} className={activeTab === id ? "is-active" : ""} onClick={() => setActiveTab(id)}><Icon size={15} />{label}</button>)}</div>
          <div className="cg-tab-panel" role="tabpanel">{activeTab === "extract" && <ExtractPanel genome={genome} onAnalyze={scrollToAnalyzer} />}{activeTab === "dna" && <DnaPanel genome={genome} languageRows={languageRows} />}{activeTab === "compare" && <ComparePanel genome={genome} />}{activeTab === "evolution" && <EvolutionPanel evolution={evolution} />}{activeTab === "phylogeny" && <PhylogenyPanel />}{activeTab === "explorer" && <ExplorerPanel genome={genome} />}{activeTab === "standard" && <StandardPanel />}</div>
        </section>

        <section className="cg-feature-section cg-container"><div className="cg-section-intro"><div><div className="cg-kicker"><span className="cg-kicker-line" /> THE SOFTWARE GENOME</div><h2>More than an analyzer.<br /><em>A shared language.</em></h2></div><p>Each repository has a structural identity. CodeGenome makes that identity visible, measurable, and ready to travel with the code.</p></div><div className="cg-feature-grid">{featureCards.map(({ eyebrow, title, body, icon: Icon, tab }) => <button key={tab} className="cg-feature-card" onClick={() => selectTab(tab)}><span className="cg-feature-eyebrow">{eyebrow}</span><span className="cg-feature-icon"><Icon size={20} /></span><strong>{title}</strong><span>{body}</span><ArrowRight className="cg-feature-arrow" size={17} /></button>)}</div></section>

        <section className="cg-open-section cg-container"><div className="cg-open-mark"><Code2 size={24} /></div><div><div className="cg-kicker"><span className="cg-kicker-line" /> AN OPEN PROPOSAL</div><h2>Every project can ship<br />its own <em>genome.</em></h2><p>The `.genome` artifact is versioned JSON designed for humans and tools. Place it beside your README, LICENSE, and package manifest.</p><button className="cg-text-button" onClick={() => selectTab("standard")}>Read the draft specification <span>↗</span></button></div><div className="cg-open-code"><span>project.genome</span><pre>{`{\n  "specVersion": "1.0.0",\n  "license": "Apache-2.0",\n  "dimensions": [\n    "structure",\n    "behavior",\n    "evolution"\n  ]\n}`}</pre></div></section>
      </main>

      <footer className="cg-footer cg-container">
        <a className="cg-brand" href="#top"><span className="cg-brand-mark"><Atom size={17} /></span><span><strong>Code</strong>Genome</span></a>
        <div className="cg-footer-author">
          <span>Développé par <strong>Barack Ndenga</strong></span>
          <span>GitHub : <strong>Barack Ndenga</strong> · <a href="mailto:ndengabarack@gmail.com">ndengabarack@gmail.com</a> · +243837767430</span>
          <span>LinkedIn / X / Instagram / TikTok : <strong>Barack Ndenga 🇨🇩🇫🇷</strong></span>
        </div>
        <span>Open standard proposal · Apache-2.0</span>
      </footer>
    </div>
  );
}

function EmptyState({ message, action, onAction }: { message: string; action: string; onAction: () => void }) {
  return <div className="cg-empty-state"><div className="cg-empty-orb"><Orbit size={24} /></div><h3>{message}</h3><p>Choose a source above to generate a measured signature.</p><Button className="cg-primary-button" onClick={onAction}>{action}<ArrowRight size={15} /></Button></div>;
}

function ExtractPanel({ genome, onAnalyze }: { genome: GenomeFileFormat | null; onAnalyze: () => void }) {
  return genome ? <div className="cg-result-banner"><div className="cg-result-icon"><Sparkles size={19} /></div><div><span className="cg-panel-label">GENOME READY</span><h3>{genome.project.name}</h3><p>Signature <code>{shortHash(genome.signature.hash)}</code> · generated {new Date(genome.createdAt).toLocaleString()}</p></div><div className="cg-result-score"><span>SCORE</span><strong>{genome.signature.genomeScore}</strong></div><Button className="cg-ghost-button" onClick={onAnalyze}>Analyze another <ArrowRight size={14} /></Button></div> : <EmptyState message="Your genome is waiting for a source." action="Open analyzer" onAction={onAnalyze} />;
}

function DnaPanel({ genome, languageRows }: { genome: GenomeFileFormat | null; languageRows: Array<{ name: string; count: number; width: number }> }) {
  if (!genome) return <EmptyState message="No genome visualized yet." action="Extract a genome" onAction={() => document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" })} />;
  const { structure, behavior } = genome.signature.dimensions;
  return <div className="cg-dna-grid"><Card className="cg-metric-card cg-metric-card-wide"><CardHeader><span className="cg-panel-label">STRUCTURE</span><CardTitle>What exists</CardTitle></CardHeader><CardContent><div className="cg-big-metric"><strong>{formatNumber(structure.filesCount)}</strong><span>files observed across {structure.modulesCount} modules</span></div><div className="cg-language-list">{languageRows.map(row => <div className="cg-language-row" key={row.name}><span>{row.name}</span><div className="cg-language-track"><i style={{ width: `${row.width}%` }} /></div><b>{row.count}</b></div>)}</div></CardContent></Card><Card className="cg-metric-card"><CardHeader><span className="cg-panel-label">BEHAVIOR</span><CardTitle>How it connects</CardTitle></CardHeader><CardContent><MetricBar label="Complexity" value={behavior.complexityScore} tone="violet" /><MetricBar label="Coupling" value={behavior.couplingScore} tone="cyan" /><MetricBar label="Maintainability" value={behavior.maintainabilityIndex} tone="green" /><div className="cg-behavior-note"><Zap size={14} /> Structural risk: <strong>{behavior.structuralRisk}/100</strong></div></CardContent></Card><Card className="cg-metric-card cg-metric-card-wide"><CardHeader><span className="cg-panel-label">SIGNATURE</span><CardTitle>Genome coordinates</CardTitle></CardHeader><CardContent><div className="cg-radar"><div className="cg-radar-ring ring-one" /><div className="cg-radar-ring ring-two" /><div className="cg-radar-ring ring-three" /><div className="cg-radar-shape" /><span className="radar-label radar-top">STRUCTURE</span><span className="radar-label radar-right">BEHAVIOR</span><span className="radar-label radar-bottom">EVOLUTION</span></div><div className="cg-signature-foot"><code>{genome.signature.hash}</code><span>SPEC {genome.specVersion}</span></div></CardContent></Card></div>;
}

function MetricBar({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="cg-metric-bar"><div><span>{label}</span><b>{value}</b></div><Progress value={value} className={`cg-progress ${tone}`} /></div>; }

function ComparePanel({ genome }: { genome: GenomeFileFormat | null }) {
  const [secondText, setSecondText] = useState("");
  const [secondName, setSecondName] = useState("");
  const [comparison, setComparison] = useState<{ similarityPercentage: number; phylogeneticDistance: number; metricsComparison: { scoreA: number; scoreB: number; complexityA: number; complexityB: number; couplingA: number; couplingB: number } } | null>(null);
  const compareMutation = trpc.genome.compareDocuments.useMutation({ onSuccess: setComparison, onError: (error) => toast.error(error.message || "Invalid .genome document.") });

  async function loadGenome(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !genome) return;
    try {
      const text = await file.text();
      setSecondText(text);
      setSecondName(file.name);
      compareMutation.mutate({ genomeA: JSON.stringify(genome), genomeB: text });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the genome file.");
    }
  }

  if (!genome) return <EmptyState message="Comparison needs a first genome." action="Extract a genome" onAction={() => document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" })} />;
  return <div className="cg-compare-grid"><div className="cg-compare-intro"><span className="cg-panel-label">COMPARISON ENGINE</span><h3>Place another genome<br />beside <em>{genome.project.name}.</em></h3><p>The distance is calculated from two validated `.genome` documents. No placeholder score is shown before a second file is provided.</p><label className="cg-compare-upload"><UploadCloud size={18} /><span>{compareMutation.isPending ? "Comparing…" : secondName || "Choose a second .genome file"}</span><input type="file" accept=".genome,application/json" onChange={loadGenome} /></label>{secondText && <span className="cg-form-note"><Check size={12} /> Two genome documents compared</span>}</div><div className="cg-compare-visual">{comparison ? <><div className="cg-compare-orb orb-left"><span>{comparison.metricsComparison.scoreA}</span><small>{genome.project.name}</small></div><div className="cg-distance-line"><span>{comparison.phylogeneticDistance} distance</span><i /></div><div className="cg-compare-orb orb-right"><span>{comparison.metricsComparison.scoreB}</span><small>{secondName || "second genome"}</small></div><div className="cg-similarity"><b>{comparison.similarityPercentage}%</b><span>structural similarity</span></div></> : <div className="cg-compare-wait"><GitCompare size={30} /><span>Upload a second<br /><b>.genome artifact</b></span></div>}</div></div>;
}

function EvolutionPanel({ evolution }: { evolution: GenomeFileFormat["signature"]["dimensions"]["evolution"] | undefined }) { return <div className="cg-evolution-grid"><div className="cg-evolution-copy"><span className="cg-panel-label">EVOLUTION / EVIDENCE</span><h3>Transformation is visible<br />when history is <em>present.</em></h3><p>{evolution?.note || "No genome selected yet."}</p><div className="cg-evidence-state"><span className={`cg-evidence-dot ${evolution?.available ? "is-available" : ""}`} /><strong>{evolution?.available ? "Git evidence detected" : "History unavailable"}</strong><span>{evolution?.available ? "Adapter-ready source" : "No invented timeline"}</span></div></div><div className="cg-timeline"><div className="cg-timeline-line" />{["Origin", "Architecture", "Current"].map((label, index) => <div className={`cg-timeline-item ${index === 2 ? "is-current" : ""}`} key={label}><span className="cg-timeline-node">{index === 2 ? <Activity size={13} /> : index + 1}</span><div><b>{label}</b><span>{evolution?.available ? "Awaiting Git adapter" : "No source evidence"}</span></div></div>)}</div></div>; }

function PhylogenyPanel() {
  const query = trpc.genome.phylogeny.useQuery(undefined, { staleTime: 60_000 });
  const nodes = query.data?.nodes ?? [];
  const links = query.data?.links ?? [];
  return <div className="cg-phylogeny-grid"><div className="cg-phylogeny-copy"><span className="cg-panel-label">SOFTWARE PHYLOGENY</span><h3>Relate architectures<br />by <em>structure.</em></h3><p>A phylogeny view groups comparable software genomes by their measured dimensions. It describes architectural proximity, never biological ancestry.</p><span className="cg-note"><ShieldCheck size={14} /> {query.isLoading ? "Calculating measured relationships…" : `${links.length} normalized relationship${links.length === 1 ? "" : "s"} observed.`}</span></div><div className="cg-phylogeny-map">{nodes.map((node, index) => <div key={node.id} className={`cg-phy-node node-${Math.min(index, 2)}`}><span>{index + 1}</span><b>{node.name}</b><small>{node.type} · score {node.score}</small></div>)}<div className="phy-line line-one" /><div className="phy-line line-two" /></div></div>;
}

function ExplorerPanel({ genome }: { genome: GenomeFileFormat | null }) {
  if (!genome) return <EmptyState message="Explorer needs an active genome." action="Extract a genome" onAction={() => document.getElementById("analyzer")?.scrollIntoView({ behavior: "smooth" })} />;
  return <div className="cg-explorer-grid"><div className="cg-explorer-copy"><span className="cg-panel-label">GENOME EXPLORER</span><h3>Inspect the raw<br /><em>project.genome</em> document.</h3><p>This is the exact JSON artifact produced by CodeGenome. It contains version metadata, signature hash, and the three verifiable dimensions.</p><Button className="cg-primary-button" onClick={() => { navigator.clipboard.writeText(JSON.stringify(genome, null, 2)); toast.success("Genome JSON copied to clipboard."); }}>Copy JSON</Button></div><div className="cg-explorer-code"><pre>{JSON.stringify(genome, null, 2)}</pre></div></div>;
}

function StandardPanel() { return <div className="cg-standard-grid"><div><span className="cg-panel-label">OPEN STANDARD / DRAFT</span><h3><code>.genome</code> is a portable<br /><em>software artifact.</em></h3><p>Versioned JSON for a repository’s structure, behavior signals, and evidence-backed evolution. It is readable by people, parsable by tools, and distributed with CodeGenome under Apache-2.0.</p><a className="cg-inline-link" href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noreferrer">Apache License 2.0 <span>↗</span></a></div><div className="cg-standard-table"><div><span>FILE</span><strong>project.genome</strong></div><div><span>SPEC</span><strong>1.0.0</strong></div><div><span>MEDIA TYPE</span><strong>application/vnd.codegenome+json</strong></div><div><span>REQUIRED</span><strong>specVersion · project · signature</strong></div><div><span>DIMENSIONS</span><strong>Structure · Behavior · Evolution</strong></div><div><span>LICENSE</span><strong>Apache-2.0</strong></div></div></div>; }

import { useState } from 'react'
import './App.css'

type JobStatus = 'standby' | 'scanning' | 'running' | 'paused' | 'gated'

const workers = [
  ['0-1', 'System + UI reserve', 'keeps Apollo responsive'],
  ['2-3', 'ddrescue / ingest', 'sequential read + mapfile monitor'],
  ['4-5', 'hash + validation', 'BLAKE3/SHA + media integrity checks'],
  ['6-7', 'sort + copy queue', 'rename, dedupe, archive to target disk'],
]

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <section className="stat-card empty-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </section>
  )
}

function Gate({ done, text }: { done: boolean; text: string }) {
  return <li className={done ? 'done' : 'locked'}>{done ? '✓' : '⛔'} {text}</li>
}

function EmptyPanel({ title, label, text }: { title: string; label: string; text: string }) {
  return (
    <article className="empty-panel">
      <span>{label}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  )
}

function App() {
  const [status, setStatus] = useState<JobStatus>('standby')

  return (
    <main className="app-shell">
      <header className="hero compact-hero">
        <div>
          <p className="eyebrow">Project: Ghost Ledger</p>
          <h1>Recovery Command</h1>
          <p className="hero-copy">Disk imaging, file recovery, validation, dedupe, and sorting control for Apollo.</p>
        </div>
        <div className="status-panel">
          <span className={`pulse ${status}`} />
          <strong>{status}</strong>
          <small>No devices loaded in demo mode. Real mode will populate this from Apollo’s local backend.</small>
          <button onClick={() => setStatus(status === 'standby' ? 'scanning' : 'standby')}>{status === 'standby' ? 'Simulate scan state' : 'Return to standby'}</button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label="Image rescued" value="--" sub="waiting for ddrescue job" />
        <StatCard label="Bad areas" value="--" sub="waiting for mapfile" />
        <StatCard label="Read rate" value="--" sub="waiting for active source" />
        <StatCard label="CPU plan" value="8 threads" sub="workers pinned by role, not all on 0/1" />
      </section>

      <section className="layout-grid">
        <div className="panel large">
          <div className="panel-title"><h2>Disk Identity</h2><span>empty until Apollo scans devices</span></div>
          <div className="empty-grid">
            <EmptyPanel title="No source selected" label="SOURCE" text="Attach a disk, scan devices, then lock the source read-only before imaging." />
            <EmptyPanel title="No image target selected" label="IMAGE TARGET" text="Choose the drive that will receive the ddrescue image and mapfile." />
            <EmptyPanel title="No output target selected" label="OUTPUT" text="Output remains gated until the image is verified and the destination is confirmed." />
            <EmptyPanel title="No USB bay profile loaded" label="USB BAY" text="Generic docks require size + brand + serial-tail confirmation before jobs run." />
          </div>
        </div>

        <div className="panel">
          <div className="panel-title"><h2>Naming Rules</h2><span>ledger enforced</span></div>
          <ul className="gate-list naming-list">
            <li><b>Disk directory</b><code>&lt;advertised GB&gt;_&lt;Brand&gt;_&lt;S/N last 5&gt;</code></li>
            <li><b>Recovered file</b><code>&lt;oldest date&gt;_&lt;time&gt;_&lt;disk id&gt;_&lt;Corrupt?&gt;_&lt;hash last 5&gt;</code></li>
            <li><b>Collision handling</b><code>append ledger sequence only if needed</code></li>
          </ul>
        </div>
      </section>

      <section className="layout-grid bottom">
        <div className="panel">
          <div className="panel-title"><h2>Safety Gates</h2><span>hard stops</span></div>
          <ul className="gate-list">
            <Gate done={false} text="Source set read-only before imaging" />
            <Gate done={false} text="Generic USB dock requires manual disk ID confirmation" />
            <Gate done={false} text="ddrescue mapfile mirrored to Apollo NVMe" />
            <Gate done={false} text="Image metadata readable by TestDisk" />
            <Gate done={false} text="User typed confirmation to repurpose source" />
          </ul>
        </div>

        <div className="panel wide">
          <div className="panel-title"><h2>CPU Worker Map</h2><span>3770k / 8 threads</span></div>
          <div className="table worker-table">
            {workers.map(([core, role, detail]) => (
              <div className="row" key={core}>
                <strong>Threads {core}</strong><span>{role}</span><em>{detail}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="layout-grid bottom">
        <div className="panel">
          <div className="panel-title"><h2>Recovery Pipeline</h2><span>planned execution</span></div>
          <ol className="pipeline">
            <li><b>1</b><div><strong>scan devices</strong><small>Resolve disks by advertised GB, brand, and serial tail.</small></div></li>
            <li><b>2</b><div><strong>ddrescue image</strong><small>Sequential read from failing/unknown source.</small></div></li>
            <li><b>3</b><div><strong>verify image</strong><small>Partition scan, TestDisk sanity check, map summary.</small></div></li>
            <li><b>4</b><div><strong>PhotoRec carve</strong><small>Run from image, never from repurposed source.</small></div></li>
            <li><b>5</b><div><strong>simultaneous sort</strong><small>Ryan’s sort scripts run beside validation and copy queues.</small></div></li>
          </ol>
        </div>

        <div className="panel wide">
          <div className="panel-title"><h2>Validation Queue</h2><span>empty until files are discovered</span></div>
          <div className="empty-panel full-width">
            <span>NO FILES INDEXED</span>
            <h3>Validation starts after ingest</h3>
            <p>Real mode will show image, video, audio, PDF, archive, document, hash, duplicate, and corruption queues here.</p>
          </div>
        </div>
      </section>

      <section className="panel timeline-panel">
        <div className="panel-title"><h2>Event Ledger</h2><span>append-only recovery history</span></div>
        <div className="empty-panel full-width">
          <span>NO EVENTS</span>
          <h3>Waiting for local backend</h3>
          <p>Device scans, safety gates, job state changes, file renames, validation results, and copy operations will be recorded here.</p>
        </div>
      </section>

      <footer>
        <strong>Demo mode:</strong> GitHub Pages is interface-only. Real mode will run locally on Apollo with FastAPI workers, CPU affinity controls, disk identity gates, and your sorting scripts.
      </footer>
    </main>
  )
}

export default App

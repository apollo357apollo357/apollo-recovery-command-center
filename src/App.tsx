import { useMemo, useState } from 'react'
import './App.css'

type JobStatus = 'running' | 'paused' | 'gated' | 'complete'

type Drive = {
  id: string
  role: 'Source' | 'Image Target' | 'Output' | 'Apollo NVMe'
  name: string
  device: string
  size: string
  health: 'Healthy' | 'Warning' | 'Failing' | 'Fast'
  temp: string
  readonly?: boolean
  used?: number
}

type Event = {
  time: string
  level: 'ok' | 'warn' | 'info'
  text: string
}

const drives: Drive[] = [
  { id: 'd1', role: 'Source', name: 'WD Blue 6TB', device: '/dev/sdb', size: '6.0 TB', health: 'Warning', temp: '41°C', readonly: true, used: 92 },
  { id: 'd2', role: 'Image Target', name: 'Seagate Archive 8TB', device: '/mnt/recovery8', size: '8.0 TB', health: 'Healthy', temp: '37°C', used: 76 },
  { id: 'd3', role: 'Output', name: 'Repurposed 6TB', device: 'locked until image verified', size: '6.0 TB', health: 'Gated' as Drive['health'], temp: '--', used: 0 },
  { id: 'd4', role: 'Apollo NVMe', name: 'Samsung NVMe', device: '/', size: '468 GB', health: 'Fast', temp: '34°C', used: 27 },
]

const events: Event[] = [
  { time: '00:03', level: 'ok', text: 'Source drive marked read-only. Software write-block active.' },
  { time: '00:08', level: 'info', text: 'ddrescue first pass running: no-scrape mode, mapfile mirrored to Apollo NVMe.' },
  { time: '00:14', level: 'warn', text: 'SMART warning: 18 pending sectors. Continuing sequential image only.' },
  { time: '00:21', level: 'ok', text: 'Image target free-space gate passed. Minimum reserve: 250 GB.' },
]

const validators = [
  ['Images', 'PIL + ImageMagick decode', 18422, 17209, 812],
  ['Video', 'ffprobe + full null decode', 1291, 980, 164],
  ['Audio', 'ffmpeg stream decode', 6404, 6120, 77],
  ['PDF', 'qpdf --check + pdfinfo', 2312, 1980, 231],
  ['Archives', '7z/tar integrity test', 908, 702, 122],
]

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <section className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </section>
  )
}

function DriveCard({ drive }: { drive: Drive }) {
  return (
    <article className="drive-card">
      <div className="drive-topline">
        <span className="role">{drive.role}</span>
        <span className={`health ${drive.health.toLowerCase()}`}>{drive.health}</span>
      </div>
      <h3>{drive.name}</h3>
      <p>{drive.device}</p>
      <div className="drive-meta">
        <span>{drive.size}</span>
        <span>{drive.temp}</span>
        <span>{drive.readonly ? 'Read-only' : 'Writable gated'}</span>
      </div>
      <div className="bar"><i style={{ width: `${drive.used ?? 0}%` }} /></div>
    </article>
  )
}

function Gate({ done, text }: { done: boolean; text: string }) {
  return <li className={done ? 'done' : 'locked'}>{done ? '✓' : '⛔'} {text}</li>
}

function App() {
  const [status, setStatus] = useState<JobStatus>('running')
  const progress = useMemo(() => ({ rescued: 3.84, bad: '21.7 MB', rate: '142 MB/s', eta: '4h 52m' }), [])

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Apollo Recovery Command Center</p>
          <h1>Image first. Recover safely. Sort the chaos.</h1>
          <p className="hero-copy">Browser-based control room for ddrescue imaging, PhotoRec/TestDisk recovery, validation, dedupe, and source-drive repurposing gates.</p>
        </div>
        <div className="status-panel">
          <span className={`pulse ${status}`} />
          <strong>{status === 'running' ? 'ddrescue imaging' : status}</strong>
          <small>Mode: 6TB → 8TB image, then recover from image to repurposed 6TB</small>
          <button onClick={() => setStatus(status === 'running' ? 'paused' : 'running')}>{status === 'running' ? 'Pause simulation' : 'Resume simulation'}</button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label="Image rescued" value={`${progress.rescued} TB`} sub="64.1% of source disk" />
        <StatCard label="Bad areas" value={progress.bad} sub="tracked by ddrescue mapfile" />
        <StatCard label="Read rate" value={progress.rate} sub={`ETA ${progress.eta}`} />
        <StatCard label="NVMe ledger" value="Active" sub="SQLite + mirrored mapfile" />
      </section>

      <section className="layout-grid">
        <div className="panel large">
          <div className="panel-title"><h2>Drive Bay</h2><span>live device model</span></div>
          <div className="drive-grid">{drives.map(d => <DriveCard key={d.id} drive={d} />)}</div>
        </div>

        <div className="panel">
          <div className="panel-title"><h2>Safety Gates</h2><span>hard stops</span></div>
          <ul className="gate-list">
            <Gate done text="Source set read-only before imaging" />
            <Gate done text="ddrescue mapfile exists on 8TB" />
            <Gate done text="mapfile mirrored to Apollo NVMe" />
            <Gate done={false} text="Image metadata readable by TestDisk" />
            <Gate done={false} text="User typed confirmation to repurpose source" />
          </ul>
        </div>
      </section>

      <section className="layout-grid bottom">
        <div className="panel">
          <div className="panel-title"><h2>Recovery Pipeline</h2><span>planned execution</span></div>
          <ol className="pipeline">
            <li className="active"><b>1</b><div><strong>ddrescue image</strong><small>Sequential read from failing/unknown source.</small></div></li>
            <li><b>2</b><div><strong>verify image</strong><small>Partition scan, TestDisk sanity check, map summary.</small></div></li>
            <li><b>3</b><div><strong>visible-file copy</strong><small>Mount image read-only if possible to preserve names.</small></div></li>
            <li><b>4</b><div><strong>PhotoRec carve</strong><small>Run from image, never from repurposed source.</small></div></li>
            <li><b>5</b><div><strong>validate + dedupe</strong><small>Good unique vs corrupted best.</small></div></li>
          </ol>
        </div>

        <div className="panel wide">
          <div className="panel-title"><h2>Validation Queue</h2><span>demo data</span></div>
          <div className="table">
            {validators.map(([name, method, total, good, bad]) => (
              <div className="row" key={name as string}>
                <strong>{name}</strong><span>{method}</span><em>{total.toLocaleString()} scanned</em><small>{good.toLocaleString()} good · {bad.toLocaleString()} corrupt/partial</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel timeline-panel">
        <div className="panel-title"><h2>Event Ledger</h2><span>append-only recovery history</span></div>
        <div className="timeline">
          {events.map(event => <p key={event.time} className={event.level}><time>{event.time}</time>{event.text}</p>)}
        </div>
      </section>

      <footer>
        <strong>Demo mode:</strong> this GitHub Pages build is a safe interface prototype. Real mode will run locally on Apollo with FastAPI workers and explicit confirmation for destructive actions.
      </footer>
    </main>
  )
}

export default App

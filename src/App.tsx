import { useMemo, useState } from 'react'
import './App.css'

type JobStatus = 'running' | 'paused' | 'gated' | 'complete'

type Drive = {
  id: string
  role: 'Source' | 'Image Target' | 'Output' | 'Apollo NVMe' | 'USB Bay'
  brand: string
  model: string
  genericName: string
  device: string
  advertisedMb: string
  serialTail: string
  health: 'Healthy' | 'Warning' | 'Failing' | 'Fast' | 'Gated'
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
  { id: 'd1', role: 'Source', brand: 'WD', model: 'Book 6TB', genericName: 'WD Book', device: '/dev/sdb', advertisedMb: '6000000', serialTail: '1482A', health: 'Warning', temp: '41°C', readonly: true, used: 92 },
  { id: 'd2', role: 'Image Target', brand: 'WD', model: 'Book 8TB', genericName: 'WD Book', device: '/mnt/recovery8', advertisedMb: '8000000', serialTail: '92F10', health: 'Healthy', temp: '37°C', used: 76 },
  { id: 'd3', role: 'USB Bay', brand: 'Thermaltake', model: 'BlacX dock', genericName: 'Generic External', device: 'bay profile: annoying generic names', advertisedMb: 'variable', serialTail: 'probe', health: 'Gated', temp: '--', used: 0 },
  { id: 'd4', role: 'Apollo NVMe', brand: 'Samsung', model: 'NVMe', genericName: 'Samsung NVMe', device: '/', advertisedMb: '468000', serialTail: '65302', health: 'Fast', temp: '34°C', used: 27 },
]

const events: Event[] = [
  { time: '00:03', level: 'ok', text: 'Source drive marked read-only. Software write-block active.' },
  { time: '00:08', level: 'info', text: 'Disk ID resolved by size + brand + serial tail, not generic USB model name.' },
  { time: '00:14', level: 'warn', text: 'Thermaltake dock detected as generic: require advertised size and serial-tail confirmation.' },
  { time: '00:21', level: 'ok', text: 'Sorting workers active beside imaging workers; ledger records every rename/move.' },
]

const validators = [
  ['Images', 'PIL + ImageMagick decode', 18422, 17209, 812],
  ['Video', 'ffprobe + full null decode', 1291, 980, 164],
  ['Audio', 'ffmpeg stream decode', 6404, 6120, 77],
  ['PDF', 'qpdf --check + pdfinfo', 2312, 1980, 231],
  ['Archives', '7z/tar integrity test', 908, 702, 122],
]

const workers = [
  ['0-1', 'System + UI reserve', 'keeps Apollo responsive'],
  ['2-3', 'ddrescue / ingest', 'sequential read + mapfile monitor'],
  ['4-5', 'hash + validation', 'BLAKE3/SHA + media integrity checks'],
  ['6-7', 'sort + copy queue', 'rename, dedupe, archive to target disk'],
]

function diskDirectory(drive: Drive) {
  return `${drive.advertisedMb}_${drive.brand}_${drive.serialTail}`
}

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
      <h3>{drive.advertisedMb} MB · {drive.brand}</h3>
      <p>{drive.genericName} · {drive.device}</p>
      <code>{diskDirectory(drive)}</code>
      <div className="drive-meta">
        <span>S/N *{drive.serialTail}</span>
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
      <header className="hero compact-hero">
        <div>
          <p className="eyebrow">Project: Ghost Ledger</p>
          <h1>Recovery Command</h1>
          <p className="hero-copy">Disk imaging, file recovery, validation, dedupe, and sorting control for Apollo.</p>
        </div>
        <div className="status-panel">
          <span className={`pulse ${status}`} />
          <strong>{status === 'running' ? 'ddrescue imaging' : status}</strong>
          <small>Mission mode: 6TB → 8TB image, then recover from image to repurposed 6TB</small>
          <button onClick={() => setStatus(status === 'running' ? 'paused' : 'running')}>{status === 'running' ? 'Pause simulation' : 'Resume simulation'}</button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label="Image rescued" value={`${progress.rescued} TB`} sub="64.1% of source disk" />
        <StatCard label="Bad areas" value={progress.bad} sub="tracked by ddrescue mapfile" />
        <StatCard label="Read rate" value={progress.rate} sub={`ETA ${progress.eta}`} />
        <StatCard label="CPU plan" value="8 threads" sub="workers pinned by role, not all on 0/1" />
      </section>

      <section className="layout-grid">
        <div className="panel large">
          <div className="panel-title"><h2>Disk Identity</h2><span>size + brand + serial tail</span></div>
          <div className="drive-grid">{drives.map(d => <DriveCard key={d.id} drive={d} />)}</div>
        </div>

        <div className="panel">
          <div className="panel-title"><h2>Naming Rules</h2><span>ledger enforced</span></div>
          <ul className="gate-list naming-list">
            <li><b>Disk directory</b><code>&lt;advertised MB&gt;_&lt;Brand&gt;_&lt;S/N last 5&gt;</code></li>
            <li><b>Recovered file</b><code>&lt;oldest date&gt;_&lt;time&gt;_&lt;disk id&gt;_&lt;Corrupt?&gt;_&lt;hash last 5&gt;</code></li>
            <li><b>Collision handling</b><code>append ledger sequence only if needed</code></li>
          </ul>
        </div>
      </section>

      <section className="layout-grid bottom">
        <div className="panel">
          <div className="panel-title"><h2>Safety Gates</h2><span>hard stops</span></div>
          <ul className="gate-list">
            <Gate done text="Source set read-only before imaging" />
            <Gate done text="Generic USB dock requires manual disk ID confirmation" />
            <Gate done text="ddrescue mapfile mirrored to Apollo NVMe" />
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
            <li className="active"><b>1</b><div><strong>ddrescue image</strong><small>Sequential read from failing/unknown source.</small></div></li>
            <li><b>2</b><div><strong>verify image</strong><small>Partition scan, TestDisk sanity check, map summary.</small></div></li>
            <li><b>3</b><div><strong>visible-file copy</strong><small>Mount image read-only if possible to preserve names.</small></div></li>
            <li><b>4</b><div><strong>PhotoRec carve</strong><small>Run from image, never from repurposed source.</small></div></li>
            <li><b>5</b><div><strong>simultaneous sort</strong><small>Ryan’s sort scripts run beside validation and copy queues.</small></div></li>
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
        <strong>Demo mode:</strong> GitHub Pages is interface-only. Real mode will run locally on Apollo with FastAPI workers, CPU affinity controls, disk identity gates, and your sorting scripts.
      </footer>
    </main>
  )
}

export default App

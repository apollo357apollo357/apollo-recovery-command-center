import { useMemo, useState } from 'react'
import './App.css'
import categoryConfig from './config/fileCategories.json'

type JobStatus = 'standby' | 'scanning' | 'running' | 'paused' | 'gated'

type Category = {
  id: string
  label: string
  destination: string
  rawExtensions: string[]
  extensions: string[]
}

const workers = [
  ['0-1', 'System + UI reserve', 'keeps Apollo responsive'],
  ['2-3', 'ddrescue / ingest', 'sequential read + mapfile monitor'],
  ['4-5', 'hash + validation', 'BLAKE3/SHA + media integrity checks'],
  ['6-7', 'sort + copy queue', 'rename, dedupe, archive to target disk'],
]

const safeguards = [
  'No automatic deletion',
  'No extension dropped',
  'Content inspection before extension fallback',
  'Original archives preserved',
  'Configurable destination for every category',
  'Corrupt and valid files routed separately',
  'Move only after file size and modification time stabilize',
  'Verified copy before staged source cleanup',
  'Ambiguous extensions visible and content-resolved',
]

const workflowSections = [
  {
    id: 'identify',
    title: 'Disk Identification',
    detail: 'Start runs the complete identity and safety sequence for attached disks.',
    steps: ['scan devices', 'resolve advertised GB + brand + serial tail', 'record identity', 'apply read-only gate'],
    fields: [
      ['deviceRoot', 'Device root or scan path'],
      ['identityDirectory', 'Identity reports directory'],
      ['smartDirectory', 'SMART reports directory'],
      ['sectionLogDirectory', 'Section log directory'],
    ],
  },
  {
    id: 'imaging',
    title: 'ddrescue Imaging',
    detail: 'Start runs every imaging step in this section, but does not start PhotoRec.',
    steps: ['verify source identity', 'lock source read-only', 'initial ddrescue pass', 'retry passes', 'verify image + mapfile'],
    fields: [
      ['sourcePath', 'Source device or image path'],
      ['imageDirectory', 'Disk image directory'],
      ['mapfileDirectory', 'ddrescue mapfile directory'],
      ['sectionLogDirectory', 'Section log directory'],
    ],
  },
  {
    id: 'photorec',
    title: 'PhotoRec + File Sorting',
    detail: 'Start here runs PhotoRec and its entire downstream sorting pipeline. It does not start ddrescue.',
    steps: ['PhotoRec carve', 'stable-file watcher', 'content identification', 'integrity validation', 'hash + rename', 'category/year routing', 'verified destination copy'],
    fields: [
      ['recoverySource', 'PhotoRec source device or image path'],
      ['rawRecoveryDirectory', 'Raw PhotoRec output directory'],
      ['stagingDirectory', 'Stable-file staging directory'],
      ['ledgerDirectory', 'SQLite ledger directory'],
      ['sectionLogDirectory', 'Section log directory'],
    ],
  },
  {
    id: 'existing-files',
    title: 'Existing Files + Sorting',
    detail: 'Start here skips PhotoRec and processes files already present in the selected source directory.',
    steps: ['scan source directory', 'stable-file check', 'content identification', 'integrity validation', 'hash + rename', 'category/year routing', 'verified destination copy'],
    fields: [
      ['existingSourceDirectory', 'Existing files source directory'],
      ['stagingDirectory', 'Stable-file staging directory'],
      ['ledgerDirectory', 'SQLite ledger directory'],
      ['sectionLogDirectory', 'Section log directory'],
    ],
  },
] as const

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <section className="stat-card empty-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </section>
  )
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
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [workflowPaths, setWorkflowPaths] = useState<Record<string, string>>({})
  const categories = categoryConfig.categories as Category[]
  const [destinations, setDestinations] = useState<Record<string, string>>(
    Object.fromEntries(categories.map(category => [category.id, category.destination]))
  )
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map(category => [category.id, true]))
  )
  const [expanded, setExpanded] = useState<string | null>(null)

  const conflicts = useMemo(
    () => Object.entries(categoryConfig.ambiguousExtensions) as [string, string[]][],
    []
  )

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
          <strong>{activeSection ? `${activeSection} running` : status}</strong>
          <small>Each Start button runs every step inside that section only. Sections never silently trigger other sections.</small>
          {activeSection ? (
            <button onClick={() => { setActiveSection(null); setStatus('standby') }}>Stop demo state</button>
          ) : (
            <span className="status-note">Configure paths below, then start the section you want.</span>
          )}
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label="Image rescued" value="--" sub="waiting for ddrescue job" />
        <StatCard label="Bad areas" value="--" sub="waiting for mapfile" />
        <StatCard label="Extension registry" value={`${categoryConfig.importSummary.uniqueCategoryExtensions}`} sub={`${categoryConfig.importSummary.rawCategoryEntries} imported entries retained`} />
        <StatCard label="CPU plan" value="8 threads" sub="workers pinned by role, not all on 0/1" />
      </section>

      <section className="panel workflow-control">
        <div className="panel-title"><h2>Workflow Sections</h2><span>start is section-scoped</span></div>
        <div className="workflow-section-list">
          {workflowSections.map(section => {
            const isRunning = activeSection === section.id
            return (
              <article className={`workflow-section ${isRunning ? 'active' : ''}`} key={section.id}>
                <div className="workflow-section-header">
                  <div>
                    <span>SECTION</span>
                    <h3>{section.title}</h3>
                    <p>{section.detail}</p>
                  </div>
                  <button
                    className="start-section"
                    disabled={activeSection !== null && !isRunning}
                    onClick={() => {
                      if (isRunning) {
                        setActiveSection(null)
                        setStatus('standby')
                      } else {
                        setActiveSection(section.id)
                        setStatus('running')
                      }
                    }}
                  >
                    {isRunning ? 'Stop section' : 'Start section'}
                  </button>
                </div>
                <div className="section-steps">
                  {section.steps.map((step, index) => <span key={step}><b>{index + 1}</b>{step}</span>)}
                </div>
                <div className="path-grid">
                  {section.fields.map(([field, label]) => {
                    const key = `${section.id}:${field}`
                    return (
                      <label key={key}>
                        <span>{label}</span>
                        <input
                          value={workflowPaths[key] ?? ''}
                          onChange={event => setWorkflowPaths({ ...workflowPaths, [key]: event.target.value })}
                          placeholder="Enter path manually"
                        />
                      </label>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
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
            <li><b>Output layout</b><code>&lt;category&gt;/&lt;year&gt;/</code></li>
          </ul>
        </div>
      </section>

      <section className="panel sorting-panel">
        <div className="panel-title"><h2>Sorting Destinations</h2><span>category / year</span></div>
        <div className="category-list">
          {categories.map(category => (
            <article className="category-row" key={category.id}>
              <div className="category-heading">
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={enabled[category.id]}
                    onChange={event => setEnabled({ ...enabled, [category.id]: event.target.checked })}
                  />
                  <strong>{category.label}</strong>
                </label>
                <span>{category.extensions.length ? `${category.extensions.length} unique extensions` : 'routing destination'}</span>
              </div>
              <div className="destination-line">
                <input
                  aria-label={`${category.label} destination`}
                  value={destinations[category.id]}
                  onChange={event => setDestinations({ ...destinations, [category.id]: event.target.value })}
                  placeholder="Choose or enter destination path"
                  disabled={!enabled[category.id]}
                />
                <code>/&lt;year&gt;/</code>
                {category.extensions.length > 0 && (
                  <button onClick={() => setExpanded(expanded === category.id ? null : category.id)}>
                    {expanded === category.id ? 'Hide extensions' : 'View extensions'}
                  </button>
                )}
              </div>
              {expanded === category.id && (
                <div className="extension-tray">
                  <p>{category.rawExtensions.length} imported entries · {category.extensions.length} unique · source order retained</p>
                  <div>{category.extensions.map(extension => <span key={extension}>{extension}</span>)}</div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="layout-grid bottom">
        <div className="panel">
          <div className="panel-title"><h2>Ambiguous Extensions</h2><span>{conflicts.length} conflicts</span></div>
          <div className="conflict-list">
            {conflicts.map(([extension, routes]) => (
              <p key={extension}><code>{extension}</code><span>{routes.join(' / ')}</span></p>
            ))}
          </div>
          <small className="panel-note">Real routing inspects content first. Extension priority is only the fallback.</small>
        </div>

        <div className="panel wide">
          <div className="panel-title"><h2>Recovery Safeguards</h2><span>confirmed policy</span></div>
          <ul className="policy-grid">
            {safeguards.map(policy => <li key={policy}>✓ {policy}</li>)}
          </ul>
        </div>
      </section>

      <section className="layout-grid bottom">
        <div className="panel">
          <div className="panel-title"><h2>SQLite Ledger</h2><span>batched WAL mode</span></div>
          <ul className="gate-list naming-list">
            <li><b>Record material transitions only</b><code>discovered → hashed → classified → validated → copied → verified</code></li>
            <li><b>Batch transactions</b><code>flush by record count or short time interval</code></li>
            <li><b>Do not log noisy progress</b><code>rates and counters stay in memory; checkpoints are periodic</code></li>
            <li><b>Crash recovery</b><code>WAL + idempotent job state + resumable queues</code></li>
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
            <li><b>5</b><div><strong>simultaneous sort</strong><small>Stable files route to configured category/year destinations.</small></div></li>
          </ol>
        </div>

        <div className="panel wide">
          <div className="panel-title"><h2>Validation Queue</h2><span>empty until files are discovered</span></div>
          <div className="empty-panel full-width">
            <span>NO FILES INDEXED</span>
            <h3>Validation starts after ingest</h3>
            <p>Real mode will show content detection, integrity validation, hash, duplicate, archive, password, and corruption queues here.</p>
          </div>
        </div>
      </section>

      <section className="panel timeline-panel">
        <div className="panel-title"><h2>Event Ledger</h2><span>material state changes only</span></div>
        <div className="empty-panel full-width">
          <span>NO EVENTS</span>
          <h3>Waiting for local backend</h3>
          <p>SQLite receives batched state transitions and errors. High-frequency progress counters remain in memory and are periodically checkpointed.</p>
        </div>
      </section>

      <footer>
        <strong>Demo mode:</strong> destination edits are local UI state only. Real mode will persist configuration through Apollo’s local backend.
      </footer>
    </main>
  )
}

export default App

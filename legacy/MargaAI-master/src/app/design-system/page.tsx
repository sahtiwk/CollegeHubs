export default function DesignSystemPage() {
  return (
    <div style={{ padding: 'var(--space-12)', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-12)' }}>
        <h1 className="text-gradient">Studio Light Design System</h1>
        <p style={{ marginTop: 'var(--space-2)' }}>Tokens, colors, and components for MargaAI.</p>
      </header>

      <section style={{ marginBottom: 'var(--space-12)' }}>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Typography</h2>
        <div className="glass-card">
          <h1>Heading 1 (Outfit)</h1>
          <h2>Heading 2 (Outfit)</h2>
          <h3>Heading 3 (Outfit)</h3>
          <p>Body Text (Inter) - The quick brown fox jumps over the lazy dog.</p>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-12)' }}>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Core Palette</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-4)' }}>
          <ColorSwatch name="Page BG" color="var(--bg-page)" />
          <ColorSwatch name="Surface" color="var(--bg-surface)" border />
          <ColorSwatch name="Deep Slate" color="var(--brand-slate-deep)" text="#FFF" />
          <ColorSwatch name="Primary Slate" color="var(--brand-slate-primary)" text="#FFF" />
          <ColorSwatch name="Navy Blue" color="var(--brand-blue-navy)" text="#FFF" />
          <ColorSwatch name="Soft Blue" color="var(--brand-blue-soft)" />
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-12)' }}>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Pill Components</h2>
        <div className="glass-card" style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="pill pill-primary">Primary Action</button>
          <button className="pill pill-secondary">Secondary Action</button>
          <button className="pill pill-outline">Outline Action</button>
          <button className="pill pill-ghost">Ghost Action</button>
          <button className="pill pill-primary" disabled>Disabled</button>
        </div>
      </section>

      <section style={{ marginBottom: 'var(--space-12)' }}>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Node Status Badges</h2>
        <div className="glass-card" style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="status-badge locked">Locked</span>
          <span className="status-badge unlocked">Unlocked</span>
          <span className="status-badge in-progress">In Progress</span>
          <span className="status-badge completed">Completed</span>
          <span className="status-badge test-out">Test-Out</span>
        </div>
      </section>
    </div>
  );
}

function ColorSwatch({ name, color, text = '#000', border = false }: { name: string, color: string, text?: string, border?: boolean }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: 'var(--radius-md)', 
      overflow: 'hidden',
      border: border ? '1px solid #E5E7EB' : 'none',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ backgroundColor: color, height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: text, fontWeight: '500' }}>
        {name}
      </div>
    </div>
  );
}

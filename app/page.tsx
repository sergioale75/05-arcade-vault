export default function Home() {
  return (
    <main className="av-main fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <div className="av-grid">
        <div className="card">
          <div className="cover">
            <div className="cover-bg cover-bricks" />
            <div className="label">ARCADE</div>
          </div>
          <div className="meta">
            <div className="title">BLOQUE BUSTER</div>
            <div className="desc">
              Rebota la pelota y destruye muros de neón.
            </div>
            <div className="row">
              <div className="score-badge">
                <span>Mejor puntuación</span>
                <b>128.400</b>
              </div>
              <button className="btn">JUGAR</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cover">
            <div className="cover-bg cover-invaders" />
            <div className="label">SHOOTER</div>
          </div>
          <div className="meta">
            <div className="title">INVASORES</div>
            <div className="desc">Defiende la galaxia oleada tras oleada.</div>
            <div className="row">
              <div className="score-badge">
                <span>Mejor puntuación</span>
                <b>96.750</b>
              </div>
              <button className="btn magenta">JUGAR</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cover">
            <div className="cover-bg cover-snake" />
            <div className="label">CLÁSICO</div>
          </div>
          <div className="meta">
            <div className="title">SERPIENTE</div>
            <div className="desc">Crece sin morder tu propia cola.</div>
            <div className="row">
              <div className="score-badge">
                <span>Mejor puntuación</span>
                <b>54.310</b>
              </div>
              <button className="btn yellow">JUGAR</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

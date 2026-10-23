const constellationShapes = [
  { id: 'gate', name: 'The Gate', points: [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]] },
  { id: 'crown', name: 'The Crown', points: [[0.5, 0.18], [0.28, 0.38], [0.4, 0.72], [0.6, 0.72], [0.72, 0.38]] },
  { id: 'arrow', name: 'The Arrow', points: [[0.5, 0.16], [0.72, 0.42], [0.62, 0.42], [0.62, 0.76], [0.38, 0.76], [0.38, 0.42], [0.28, 0.42]] },
  { id: 'lantern', name: 'The Lantern', points: [[0.5, 0.16], [0.68, 0.32], [0.68, 0.68], [0.5, 0.84], [0.32, 0.68], [0.32, 0.32]] },
  { id: 'wing', name: 'The Wing', points: [[0.5, 0.5], [0.28, 0.26], [0.18, 0.58], [0.34, 0.78], [0.66, 0.78], [0.82, 0.58], [0.72, 0.26]] },
  { id: 'tide', name: 'The Tide', points: [[0.22, 0.36], [0.36, 0.22], [0.56, 0.28], [0.76, 0.2], [0.68, 0.54], [0.46, 0.72], [0.26, 0.66]] }
];

window.SharedConstellation = function SharedConstellation({ matchId, house, playerName, offline = false }) {
  const canvasRef = React.useRef(null);
  const channelRef = React.useRef(null);
  const [stars, setStars] = React.useState([]);
  const [cursors, setCursors] = React.useState([]);
  const [connection, setConnection] = React.useState('connecting');
  const [message, setMessage] = React.useState('Place one dot anywhere on the constellation today.');
  const [hasPlacedToday, setHasPlacedToday] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const [previewShapeId, setPreviewShapeId] = React.useState('');
  const [canvasRevision, setCanvasRevision] = React.useState(0);
  const [channelAttempt, setChannelAttempt] = React.useState(0);
  const lastPresenceUpdate = React.useRef(0);
  const retryTimerRef = React.useRef(null);
  const starsRef = React.useRef(stars);
  const isOffline = offline || window.currentUserId === 'dev-user';
  const todayKey = `nocturne-constellation-${house}-${window.currentUserId}-${new Date().toISOString().slice(0, 10)}`;
  const getCycleKey = (date = new Date()) => {
    const shifted = new Date(date);
    shifted.setHours(shifted.getHours() - 6);
    const daysSinceMonday = (shifted.getDay() + 6) % 7;
    shifted.setDate(shifted.getDate() - daysSinceMonday);
    return `${shifted.getFullYear()}-${shifted.getMonth() + 1}-${shifted.getDate()}`;
  };
  const cycleKey = getCycleKey();
  const weeklyKey = `nocturne-constellation-complete-${house}-${window.currentUserId}-${cycleKey}`;
  const weeklyShape = constellationShapes[Array.from(cycleKey).reduce((sum, character) => sum + character.charCodeAt(0), 0) % constellationShapes.length];
  const shape = constellationShapes.find(item => item.id === previewShapeId) || weeklyShape;
  const completionRef = React.useRef(false);
  const cycleRef = React.useRef(cycleKey);

  starsRef.current = stars;

  React.useEffect(() => {
    setHasPlacedToday(window.localStorage.getItem(todayKey) === '1');
    setCompleted(window.localStorage.getItem(weeklyKey) === '1');
    completionRef.current = window.localStorage.getItem(weeklyKey) === '1';
  }, [todayKey, weeklyKey]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const currentCycleKey = getCycleKey();
      if (currentCycleKey === cycleRef.current) return;
      cycleRef.current = currentCycleKey;
      setCompleted(false);
      completionRef.current = false;
      setStars([]);
      setMessage('A new constellation week has begun. Add the first dot.');
      if (!isOffline) channelRef.current?.send({ type: 'broadcast', event: 'weekly_reset', payload: {} });
    }, 30000);
    return () => window.clearInterval(interval);
  }, [cycleKey, isOffline]);

  React.useEffect(() => {
    if (isOffline) {
      setConnection('connected');
      return undefined;
    }
    let active = true;
    setConnection('connecting');
    const channel = sb.channel(`constellation-${house}`, {
      config: { private: true, broadcast: { self: false }, presence: { key: window.currentUserId } }
    });
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'star' }, ({ payload }) => {
        if (active && payload?.star) setStars(previous => previous.some(star => star.spaceIndex === payload.star.spaceIndex) ? previous : [...previous, payload.star]);
      })
      .on('broadcast', { event: 'weekly_reset' }, () => {
        if (active) {
          setStars([]);
          setCompleted(false);
          completionRef.current = false;
        }
      })
      .on('presence', { event: 'sync' }, () => {
        if (!active) return;
        const presence = channel.presenceState();
        const entries = Object.values(presence).flat();
        setCursors(entries.filter(entry => entry.cursor).map(entry => ({ name: entry.name, ...entry.cursor })));
        setStars(previous => {
          const allStars = entries.flatMap(entry => entry.stars || []);
          return allStars.reduce((combined, star) => (
            combined.some(existing => existing.spaceIndex === star.spaceIndex) ? combined : [...combined, star]
          ), previous);
        });
      })
      .subscribe(async status => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          setConnection('connected');
          await channel.track({ name: playerName, cursor: null, stars: starsRef.current });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection('disconnected');
          window.clearTimeout(retryTimerRef.current);
          retryTimerRef.current = window.setTimeout(() => {
            if (active) setChannelAttempt(attempt => attempt + 1);
          }, 1500);
        }
      });

    return () => {
      active = false;
      window.clearTimeout(retryTimerRef.current);
      channelRef.current = null;
      sb.removeChannel(channel);
    };
  }, [house, playerName, channelAttempt, isOffline]);

  React.useEffect(() => {
    function redrawAfterResize() {
      setCanvasRevision(revision => revision + 1);
    }
    window.addEventListener('resize', redrawAfterResize);
    return () => window.removeEventListener('resize', redrawAfterResize);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    context.clearRect(0, 0, bounds.width, bounds.height);
    context.fillStyle = '#10101a';
    context.fillRect(0, 0, bounds.width, bounds.height);
    for (let index = 0; index < 65; index += 1) {
      const x = ((index * 83) % 997) / 997 * bounds.width;
      const y = ((index * 137) % 991) / 991 * bounds.height;
      context.fillStyle = index % 7 === 0 ? 'rgba(201,162,75,0.45)' : 'rgba(205,198,226,0.28)';
      context.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
    }
    context.strokeStyle = 'rgba(138,104,214,0.2)';
    context.lineWidth = 1;
    context.beginPath();
    shape.points.forEach(([x, y], index) => {
      const px = x * bounds.width;
      const py = y * bounds.height;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    });
    context.closePath();
    context.stroke();
    shape.points.forEach(([x, y], index) => {
      const lit = stars.some(star => star.spaceIndex === index);
      const px = x * bounds.width;
      const py = y * bounds.height;
      context.strokeStyle = lit ? '#f4d985' : 'rgba(233,201,108,0.72)';
      context.fillStyle = lit ? '#f4d985' : 'rgba(233,201,108,0.12)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(px, py, lit ? 7 : 12, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });
    stars.forEach(star => {
      const x = star.x * bounds.width;
      const y = star.y * bounds.height;
      context.shadowColor = '#e9c96c';
      context.shadowBlur = 12;
      context.fillStyle = '#f4d985';
      context.beginPath();
      context.arc(x, y, 4, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    });
    cursors.forEach(cursor => {
      if (!cursor.x || !cursor.y) return;
      context.fillStyle = '#b69cf0';
      context.beginPath();
      context.arc(cursor.x * bounds.width, cursor.y * bounds.height, 4, 0, Math.PI * 2);
      context.fill();
      context.font = '11px Inter, sans-serif';
      context.fillText(cursor.name || 'Player', cursor.x * bounds.width + 7, cursor.y * bounds.height - 6);
    });
  }, [stars, cursors, canvasRevision, shape]);

  React.useEffect(() => {
    if (completed || completionRef.current || stars.length < shape.points.length) return;
    completionRef.current = true;
    setMessage('The constellation is complete. Recording 5 house points...');
    if (isOffline) {
      setCompleted(true);
      setMessage('Dev preview: constellation complete. In the live game, the house would earn 5 points.');
      return;
    }
    sb.rpc('award_constellation_points', { match_id: matchId }).then(({ data, error }) => {
      if (error) {
        completionRef.current = false;
        setMessage(`The constellation is complete, but points could not be recorded: ${error.message}`);
        return;
      }
      setCompleted(true);
      window.localStorage.setItem(weeklyKey, '1');
      window.dispatchEvent(new CustomEvent('nocturne-games-refresh'));
      setMessage(data > 0
        ? `Constellation complete. House ${house} earned 5 points. It resets Monday at 6:00 AM Eastern.`
        : `This week's constellation is already complete. It resets Monday at 6:00 AM Eastern.`);
    });
  }, [completed, house, isOffline, matchId, shape.points.length, stars, weeklyKey]);

  function publishPresence(cursor, currentStars = stars) {
    if (isOffline) return;
    const channel = channelRef.current;
    if (channel) channel.track({ name: playerName, cursor, stars: currentStars });
  }

  function handlePlaceStar(event) {
    if (connection !== 'connected') {
      setMessage('The constellation is reconnecting. Try your click again in a moment.');
      return;
    }
    if (completed) return;
    if (hasPlacedToday) {
      setMessage('You have already placed your daily dot. Come back tomorrow; your housemates can still add theirs today.');
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const nearest = shape.points
      .map(([pointX, pointY], spaceIndex) => ({
        spaceIndex,
        distance: Math.hypot((x - pointX) * bounds.width, (y - pointY) * bounds.height)
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest || nearest.distance > 30) {
      setMessage('Place your dot inside one of the glowing constellation spaces.');
      return;
    }
    if (stars.some(star => star.spaceIndex === nearest.spaceIndex)) {
      setMessage('That constellation space is already lit. Choose another glowing space.');
      return;
    }
    const star = {
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      x: shape.points[nearest.spaceIndex][0],
      y: shape.points[nearest.spaceIndex][1],
      spaceIndex: nearest.spaceIndex
    };
    const nextStars = [...stars, star];
    setStars(nextStars);
    window.localStorage.setItem(todayKey, '1');
    setHasPlacedToday(true);
    setMessage('Your dot is part of the shared constellation. You can place another one tomorrow.');
    if (!isOffline) channelRef.current?.send({ type: 'broadcast', event: 'star', payload: { star } });
    publishPresence(null, nextStars);
  }

  function handleMoveCursor(event) {
    if (connection !== 'connected') return;
    if (Date.now() - lastPresenceUpdate.current < 100) return;
    lastPresenceUpdate.current = Date.now();
    const bounds = event.currentTarget.getBoundingClientRect();
    publishPresence({
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height
    });
  }

  return (
    <article className="card constellation-card">
      <div className="games-card-heading">
        <div><span className="games-kicker">{isOffline ? 'Dev preview' : 'Common room'}</span><h3>{shape.name}</h3></div>
        <span className={`games-connection ${connection}`}>{connection}</span>
      </div>
      {isOffline ? (
        <label className="house-room-preview" htmlFor="constellation-preview-shape">
          Test shape
          <select id="constellation-preview-shape" className="input-field" value={shape.id} onChange={event => { setPreviewShapeId(event.target.value); setStars([]); setCompleted(false); setHasPlacedToday(false); completionRef.current = false; }}>
            {constellationShapes.map(option => <option key={option.id} value={option.id}>{option.name} ({option.points.length} spaces)</option>)}
          </select>
        </label>
      ) : null}
      <p className="games-rule">Click a glowing space to place one dot each day. Only the {shape.points.length} marked spaces belong to this constellation. Complete it once per week for 5 house points; it resets every Monday at 6:00 AM Eastern.</p>
      <canvas
        className="constellation-canvas"
        ref={canvasRef}
        aria-label={`Shared constellation canvas for House ${house}`}
        onClick={handlePlaceStar}
        onPointerMove={handleMoveCursor}
      />
      <div className="constellation-footer">
        <span>{completed ? 'Constellation complete this week' : `${stars.length}/${shape.points.length} spaces lit`}</span>
        <span>{cursors.length} player{cursors.length === 1 ? '' : 's'} here</span>
      </div>
      {connection === 'disconnected' ? (
        <p className="games-error" role="alert">
          The constellation connection was lost. Retrying now...
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setChannelAttempt(attempt => attempt + 1)}>Reconnect</button>
        </p>
      ) : null}
      {isOffline ? <button className="btn btn-secondary btn-sm" type="button" onClick={() => { window.localStorage.removeItem(todayKey); window.localStorage.removeItem(weeklyKey); setHasPlacedToday(false); setCompleted(false); completionRef.current = false; setStars([]); setMessage('Dev preview reset. Click a glowing space to place a dot.'); }}>Reset dev preview</button> : null}
      {message ? <p className="games-note" aria-live="polite">{message}</p> : null}
    </article>
  );
};

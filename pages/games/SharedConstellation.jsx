window.SharedConstellation = function SharedConstellation({ matchId, house, playerName }) {
  const canvasRef = React.useRef(null);
  const channelRef = React.useRef(null);
  const [stars, setStars] = React.useState([]);
  const [cursors, setCursors] = React.useState([]);
  const [connection, setConnection] = React.useState('connecting');
  const [message, setMessage] = React.useState('');
  const [awarded, setAwarded] = React.useState(false);
  const [canvasRevision, setCanvasRevision] = React.useState(0);
  const awardingRef = React.useRef(false);
  const lastPresenceUpdate = React.useRef(0);
  const targets = [[0.5, 0.18], [0.72, 0.35], [0.64, 0.68], [0.36, 0.68], [0.28, 0.35]];

  React.useEffect(() => {
    let active = true;
    const channel = sb.channel(`constellation-${house}`, {
      config: { private: true, broadcast: { self: false }, presence: { key: window.currentUserId } }
    });
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'star' }, ({ payload }) => {
        if (active && payload?.star) setStars(previous => previous.some(star => star.id === payload.star.id) ? previous : [...previous, payload.star]);
      })
      .on('broadcast', { event: 'pattern_reset' }, () => {
        if (active) {
          setStars([]);
          setAwarded(false);
          awardingRef.current = false;
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
            combined.some(existing => existing.id === star.id) ? combined : [...combined, star]
          ), previous);
        });
      })
      .subscribe(async status => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          setConnection('connected');
          await channel.track({ name: playerName, cursor: null, stars: [] });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection('disconnected');
        }
      });

    return () => {
      active = false;
      channelRef.current = null;
      sb.removeChannel(channel);
    };
  }, [house, playerName]);

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
    targets.forEach(([x, y], index) => {
      const px = x * bounds.width;
      const py = y * bounds.height;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    });
    context.closePath();
    context.stroke();
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
  }, [stars, cursors, canvasRevision]);

  React.useEffect(() => {
    if (awarded || awardingRef.current || stars.length !== targets.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const closeToTarget = targets.every(([x, y]) => stars.some(star => (
      Math.hypot((star.x - x) * width, (star.y - y) * height) < 22
    )));
    if (!closeToTarget) return;

    awardingRef.current = true;
    setMessage('The constellation is complete. Recording house points...');
    sb.rpc('award_common_room_points', { match_id: matchId, amount: 10 }).then(({ data, error }) => {
      if (error) {
        setMessage(`The pattern was completed, but points could not be recorded: ${error.message}`);
        awardingRef.current = false;
        return;
      }
      setAwarded(true);
      setMessage(data > 0
        ? `The constellation shines. House ${house} earned ${data} points.`
        : `House ${house} has reached its 50 point daily limit.`);
      window.dispatchEvent(new CustomEvent('nocturne-games-refresh'));
      channelRef.current?.send({ type: 'broadcast', event: 'pattern_reset', payload: {} });
      setStars([]);
      setAwarded(false);
      awardingRef.current = false;
    });
  }, [awarded, house, matchId, stars]);

  function publishPresence(cursor, currentStars = stars) {
    const channel = channelRef.current;
    if (channel) channel.track({ name: playerName, cursor, stars: currentStars });
  }

  function handlePlaceStar(event) {
    if (awarded || connection !== 'connected') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const star = {
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height
    };
    const nextStars = [...stars, star];
    setStars(nextStars);
    channelRef.current?.send({ type: 'broadcast', event: 'star', payload: { star } });
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
        <div><span className="games-kicker">Common room</span><h3>Shared Constellation</h3></div>
        <span className={`games-connection ${connection}`}>{connection}</span>
      </div>
      <p className="games-rule">Place five stars on the faint constellation to earn 10 points for House {house}. Your house can earn up to 50 common room points per day.</p>
      <canvas
        className="constellation-canvas"
        ref={canvasRef}
        aria-label={`Shared constellation canvas for House ${house}`}
        onClick={handlePlaceStar}
        onPointerMove={handleMoveCursor}
      />
      <div className="constellation-footer">
        <span>{stars.length}/5 stars placed</span>
        <span>{cursors.length} player{cursors.length === 1 ? '' : 's'} here</span>
      </div>
      {stars.length ? (
        <button
          className="btn btn-secondary"
          type="button"
          disabled={connection !== 'connected'}
          onClick={() => channelRef.current?.send({ type: 'broadcast', event: 'pattern_reset', payload: {} })}
        >Clear the shared stars</button>
      ) : null}
      {connection === 'disconnected' ? <p className="games-error" role="alert">The constellation connection was lost. Reopen this page to reconnect.</p> : null}
      {message ? <p className="games-note" aria-live="polite">{message}</p> : null}
    </article>
  );
};

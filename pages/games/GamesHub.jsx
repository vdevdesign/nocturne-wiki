window.GamesHub = function GamesHub() {
  const [refreshVersion, setRefreshVersion] = React.useState(0);
  const [house, setHouse] = React.useState(window.currentHouse || '');
  const [isDM, setIsDM] = React.useState(window.currentUserIsDM === true);
  const [waitingMatches, setWaitingMatches] = React.useState([]);
  const [ownWaitingMatch, setOwnWaitingMatch] = React.useState(null);
  const [tournamentSessions, setTournamentSessions] = React.useState([]);
  const [points, setPoints] = React.useState([]);
  const [selectedMatchId, setSelectedMatchId] = React.useState(null);
  const [spectating, setSpectating] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [connection, setConnection] = React.useState('connecting');
  const selectedMatch = window.useMatch(selectedMatchId);
  const leaderboard = ['phoenix', 'fox', 'selkie']
    .map(name => ({
      house: name,
      points: Number(points.find(row => row.house === name)?.points || 0)
    }))
    .sort((a, b) => b.points - a.points || a.house.localeCompare(b.house));

  React.useEffect(() => {
    function refresh() {
      setHouse(window.currentHouse || '');
      setIsDM(window.currentUserIsDM === true);
      setRefreshVersion(version => version + 1);
    }
    window.refreshGames = refresh;
    window.addEventListener('nocturne-games-refresh', refresh);
    window.addEventListener('nocturne-auth-changed', refresh);
    return () => {
      window.refreshGames = undefined;
      window.removeEventListener('nocturne-games-refresh', refresh);
      window.removeEventListener('nocturne-auth-changed', refresh);
    };
  }, []);

  React.useEffect(() => {
    let active = true;
    if (!window.currentUserId) {
      setHouse('');
      setWaitingMatches([]);
      setOwnWaitingMatch(null);
      setTournamentSessions([]);
      setPoints([]);
      setSelectedMatchId(null);
      setConnection('disconnected');
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');
    const userHouse = (window.currentHouse || '').toLowerCase();

    async function loadHub() {
      const [matchesResult, sessionsResult, pointsResult] = await Promise.all([
        sb.from('matches').select('*').eq('mode', 'tournament').eq('game', 'rune_duel').order('created_at', { ascending: false }).limit(50),
        sb.rpc('get_game_sessions'),
        sb.from('house_points').select('house, points').order('house')
      ]);
      if (!active) return;
      const missingSessionsRpc = sessionsResult.error?.code === 'PGRST202'
        || sessionsResult.error?.message?.includes('get_game_sessions');
      if (matchesResult.error) {
        setError(matchesResult.error.message);
        setConnection('disconnected');
      } else {
        const matches = matchesResult.data || [];
        setWaitingMatches(matches.filter(match => match.status === 'waiting' && match.house_a !== userHouse));
        setOwnWaitingMatch(matches.find(match => match.status === 'waiting' && match.house_a === userHouse) || null);
        setConnection('connected');
      }
      if (sessionsResult.error) {
        setError(previous => previous || (missingSessionsRpc
          ? 'Tournament spectator sessions are not set up yet. Run the latest supabase-house-games.sql in the Supabase SQL editor, then refresh the API schema cache.'
          : sessionsResult.error.message));
      } else {
        const sessions = sessionsResult.data || [];
        setTournamentSessions(sessions);
        const myActiveMatch = sessions.find(match => (
          match.status === 'active'
          && match.players?.some(player => player.user_id === window.currentUserId)
        ));
        if (myActiveMatch && !selectedMatchId) {
          setSelectedMatchId(myActiveMatch.id);
          setSpectating(false);
        }
      }
      if (pointsResult.error) {
        setError(previous => previous || pointsResult.error.message);
      } else {
        setPoints(pointsResult.data || []);
      }

      setLoading(false);
    }

    loadHub();
    const channel = sb.channel('house-points-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'house_points' }, async () => {
        const { data, error: pointsError } = await sb.from('house_points').select('house, points').order('house');
        if (!active) return;
        if (pointsError) setError(pointsError.message);
        else setPoints(data || []);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        if (active) setRefreshVersion(version => version + 1);
      })
      .subscribe(status => {
        if (!active) return;
        if (status === 'SUBSCRIBED') setConnection('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection('disconnected');
        }
      });

    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [refreshVersion, selectedMatchId]);

  async function createMatch() {
    setBusy(true);
    setError('');
    const { data, error: createError } = await sb.rpc('create_tournament_match', { game: 'rune_duel' });
    if (createError) setError(createError.message);
    else if (data?.id) {
      setSelectedMatchId(data.id);
      setSpectating(false);
      setRefreshVersion(version => version + 1);
    } else setError('The tournament match was created without an ID. Refresh and check the lobby.');
    setBusy(false);
  }

  async function joinMatch(matchId) {
    setBusy(true);
    setError('');
    const { data, error: joinError } = await sb.rpc('join_tournament_match', { match_id: matchId });
    if (joinError) setError(joinError.message);
    else if (data?.id) {
      setSelectedMatchId(data.id);
      setSpectating(false);
      setRefreshVersion(version => version + 1);
    } else setError('The match was joined, but its details could not be loaded.');
    setBusy(false);
  }

  if (loading) {
    return (
      <PageSection id="games" eyebrow="Trials and shared wonders" title="House Games" subtitle="Challenge another house in the tournament, or watch tournament matches unfold.">
        <p className="empty-note">Opening the house games...</p>
      </PageSection>
    );
  }

  return (
    <PageSection id="games" eyebrow="Trials and shared wonders" title="House Games" subtitle="Challenge another house in the tournament, or watch tournament matches unfold.">
      {error ? <p className="games-error" role="alert">{error}</p> : null}
      {connection === 'disconnected' ? <p className="games-disconnected" role="status">Live updates are disconnected. Reload this page to reconnect.</p> : null}
      {!house && !isDM ? <p className="games-note">Choose your house in Common Rooms before joining games.</p> : null}

      <section className="games-section">
        <div className="games-section-heading">
          <div>
            <span className="games-kicker">{isDM ? 'Spectator mode' : 'Cross-house competition'}</span>
            <h3>{isDM ? 'Tournament Spectating' : 'The Tournament'}</h3>
          </div>
          {!isDM ? <button className="btn" type="button" disabled={busy || !house} onClick={createMatch}>Create a Rune Duel</button> : null}
        </div>
        {!isDM && ownWaitingMatch ? (
          <div className="games-match-row">
            <div><strong>Your challenge is waiting</strong><span>House {ownWaitingMatch.house_a} is looking for another house.</span></div>
            <span className="games-status">Waiting</span>
          </div>
        ) : null}
        {selectedMatchId && selectedMatch.match ? (
          <div className="games-active-match">
            {selectedMatch.connection === 'disconnected' ? <p className="games-disconnected">Match updates are disconnected.</p> : null}
            {selectedMatch.match.game === 'rune_duel' ? (
              <window.RuneDuel
                match={selectedMatch.match}
                spectating={spectating}
                players={tournamentSessions.find(session => session.id === selectedMatchId)?.players || []}
              />
            ) : null}
            <button className="btn btn-secondary" type="button" onClick={() => {
              setSelectedMatchId(null);
              setSpectating(false);
            }}>{spectating ? 'Close spectator view' : 'Close match'}</button>
          </div>
        ) : null}
        {selectedMatchId && selectedMatch.loading ? <p className="empty-note">Loading your duel...</p> : null}
        {selectedMatchId && selectedMatch.error ? <p className="games-error" role="alert">{selectedMatch.error}</p> : null}
        {!isDM && !selectedMatchId && waitingMatches.length ? (
          <div className="games-match-list">
            {waitingMatches.map(match => (
              <div className="games-match-row" key={match.id}>
                <div><strong>Rune Duel</strong><span>House {match.house_a} is waiting for an opponent.</span></div>
                <button className="btn btn-secondary" type="button" disabled={busy || !house} onClick={() => joinMatch(match.id)}>Join from House {house || '...'}</button>
              </div>
            ))}
          </div>
        ) : null}
        {!isDM && !ownWaitingMatch && !selectedMatchId && !waitingMatches.length ? <p className="empty-note">No rival house is waiting. Create a challenge to begin.</p> : null}
        <div className="games-session-monitor">
          <div className="games-session-monitor-heading">
            <h4>{isDM ? 'Live tournament sessions' : 'Tournament sessions'}</h4>
            <span>{tournamentSessions.length} recent</span>
          </div>
          {tournamentSessions.length ? (
            <div className="games-match-list">
              {tournamentSessions.map(session => {
                const isWatchable = session.status === 'active' || session.status === 'finished';
                const playerSummary = (session.players || []).map(player => (
                  `${player.name} · House ${player.house}`
                )).join(' vs ');
                const statusText = session.status === 'waiting'
                  ? 'Waiting for a rival house'
                  : session.status === 'finished'
                    ? `Won by House ${session.winner_house || 'unknown'}`
                    : `Round ${Number(session.state?.round) || 1}`;
                return (
                  <div className="games-match-row" key={session.id}>
                    <div className="games-session-summary">
                      <strong>Rune Duel <span className={`games-session-status ${session.status}`}>{session.status}</span></strong>
                      <span>{playerSummary || `House ${session.house_a} is seeking an opponent`}</span>
                      <small>{statusText}</small>
                    </div>
                    {isWatchable ? (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => {
                          setSelectedMatchId(session.id);
                          setSpectating(true);
                        }}
                      >Watch</button>
                    ) : <span className="games-status">Lobby</span>}
                  </div>
                );
              })}
            </div>
          ) : <p className="empty-note">No tournament sessions have started yet.</p>}
        </div>
      </section>

      <section className="games-section leaderboard-section">
        <div className="games-section-heading">
          <div><span className="games-kicker">Points earned together</span><h3>House Leaderboard</h3></div>
          <span className={`games-connection ${connection}`}>{connection}</span>
        </div>
        <div className="games-leaderboard">
          {leaderboard.map(({ house: name, points: score }, index) => (
            <div className={`games-leaderboard-row house-${name}`} key={name}>
              <span className="games-rank">0{index + 1}</span>
              <span>House {name}</span>
              <strong>{score}</strong>
            </div>
          ))}
        </div>
      </section>
    </PageSection>
  );
};

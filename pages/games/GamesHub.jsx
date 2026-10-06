window.GamesHub = function GamesHub() {
  const tournamentGames = [
    {
      id: 'rune_duel',
      name: 'Rune Duel',
      description: 'Choose an elemental rune each round. First to three wins the duel for your house.'
    }
  ];
  const [refreshVersion, setRefreshVersion] = React.useState(0);
  const [house, setHouse] = React.useState(window.currentHouse || '');
  const [isDM, setIsDM] = React.useState(window.currentUserIsDM === true);
  const [selectedGame, setSelectedGame] = React.useState('rune_duel');
  const [waitingMatches, setWaitingMatches] = React.useState([]);
  const [ownWaitingMatch, setOwnWaitingMatch] = React.useState(null);
  const [tournamentSessions, setTournamentSessions] = React.useState([]);
  const [points, setPoints] = React.useState([]);
  const [selectedMatchId, setSelectedMatchId] = React.useState(null);
  const [spectating, setSpectating] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState(null);
  const [deletingMatchId, setDeletingMatchId] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [connection, setConnection] = React.useState('connecting');
  const seenRequestIds = React.useRef(new Set());
  const selectedMatch = window.useMatch(selectedMatchId);
  const hasOpenCreatedDuel = tournamentSessions.some(session => (
    session.game === 'rune_duel'
    && session.created_by === window.currentUserId
    && ['waiting', 'active'].includes(session.status)
  ));
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
      const [sessionsResult, pointsResult] = await Promise.all([
        sb.rpc('get_game_sessions'),
        sb.from('house_points').select('house, points').order('house')
      ]);
      if (!active) return;
      const missingSessionsRpc = sessionsResult.error?.code === 'PGRST202'
        || sessionsResult.error?.message?.includes('get_game_sessions');
      if (sessionsResult.error) {
        setConnection('disconnected');
        setError(previous => previous || (missingSessionsRpc
          ? 'Tournament spectator sessions are not set up yet. Run the latest supabase-house-games.sql in the Supabase SQL editor, then refresh the API schema cache.'
          : sessionsResult.error.message));
      } else {
        const sessions = (sessionsResult.data || []).filter(session => (
          session.mode === 'tournament' && session.game === 'rune_duel'
        ));
        setTournamentSessions(sessions);
        setWaitingMatches(sessions.filter(match => (
          match.status === 'waiting' && match.house_a !== userHouse
        )));
        setOwnWaitingMatch(sessions.find(match => (
          match.created_by === window.currentUserId
          && match.status === 'waiting'
        )) || null);
        const myActiveMatch = sessions.find(match => (
          match.status === 'active'
          && match.players?.some(player => player.user_id === window.currentUserId)
        ));
        if (myActiveMatch && !selectedMatchId) {
          setSelectedMatchId(myActiveMatch.id);
          setSpectating(false);
        }
        setConnection('connected');
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, payload => {
        if (active && payload.eventType !== 'INSERT') setRefreshVersion(version => version + 1);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches'
      }, async payload => {
        const request = payload.new;
        if (
          !active
          || request.mode !== 'tournament'
          || request.game !== 'rune_duel'
          || request.status !== 'waiting'
          || seenRequestIds.current.has(request.id)
        ) return;

        seenRequestIds.current.add(request.id);
        const { data: sessions, error: sessionError } = await sb.rpc('get_game_sessions');
        if (!active) return;
        if (sessionError) {
          setError(sessionError.message);
        }
        const session = (sessions || []).find(item => item.id === request.id);
        window.dispatchEvent(new CustomEvent('nocturne-rune-duel-request', {
          detail: {
            id: request.id,
            creatorName: session?.creator_name || 'A player',
            house: request.house_a
          }
        }));
        setRefreshVersion(version => version + 1);
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
    const { data, error: createError } = await sb.rpc('create_tournament_match', { game: selectedGame });
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

  async function deleteRequest(matchId) {
    setDeletingMatchId(matchId);
    setError('');
    const { error: deleteError } = await sb.rpc('delete_tournament_request', { match_id: matchId });
    if (deleteError) {
      setError(deleteError.message);
    } else {
      setPendingDeleteId(null);
      setRefreshVersion(version => version + 1);
    }
    setDeletingMatchId(null);
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

      <div className="games-section">
        <div className="games-section-heading">
          <div>
            <span className="games-kicker">{isDM ? 'Spectator mode' : 'Cross-house competition'}</span>
            <h3>{isDM ? 'Tournament Spectating' : 'The Tournament'}</h3>
          </div>
        </div>
        {!isDM ? (
          <fieldset className="games-option-picker">
            <legend>Choose a tournament game</legend>
            <div className="games-option-list">
              {tournamentGames.map(game => (
                <label className={`games-option-card rune-duel-option ${selectedGame === game.id ? 'selected' : ''}`} key={game.id}>
                  <input
                    type="radio"
                    name="tournament-game"
                    value={game.id}
                    checked={selectedGame === game.id}
                    onChange={() => setSelectedGame(game.id)}
                  />
                  <span className="games-option-copy">
                    <strong>{game.name}</strong>
                    <small>{game.description}</small>
                  </span>
                  <span className="games-option-check" aria-hidden="true">{selectedGame === game.id ? 'Selected' : 'Select'}</span>
                </label>
              ))}
            </div>
            {hasOpenCreatedDuel ? (
              <p className="games-note">You already created an open Rune Duel. Finish it before creating another.</p>
            ) : (
              <button className="btn" type="button" disabled={busy || !house || !selectedGame} onClick={createMatch}>
                Create {tournamentGames.find(game => game.id === selectedGame)?.name || 'game'}
              </button>
            )}
          </fieldset>
        ) : null}
        {!isDM && ownWaitingMatch ? (
          <div className="games-match-row">
            <div>
              <strong>Your challenge is waiting</strong>
              <span>Created by {ownWaitingMatch.creator_name || 'you'}, House {ownWaitingMatch.house_a} is looking for another house.</span>
            </div>
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
            <span>{tournamentSessions.length} listed</span>
          </div>
          {tournamentSessions.length ? (
            <div className="games-match-list">
              {tournamentSessions.map(session => {
                const isWatchable = session.status === 'active' || session.status === 'finished';
                const playerSummary = (session.players || []).map(player => (
                  `${player.name} · House ${player.house}`
                )).join(' vs ');
                const creatorLabel = session.creator_name
                  ? `Created by ${session.creator_name}`
                  : 'Creator unknown';
                const statusText = session.status === 'waiting'
                  ? 'Waiting for a rival house'
                  : session.status === 'finished'
                    ? `Won by House ${session.winner_house || 'unknown'}`
                    : `Round ${Number(session.state?.round) || 1}`;
                return (
                  <div className="games-match-row" key={session.id}>
                    <div className="games-session-summary">
                      <strong>Rune Duel <span className={`games-session-status ${session.status}`}>{session.status}</span></strong>
                      <span>{creatorLabel}</span>
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
                    ) : isDM ? (
                      pendingDeleteId === session.id ? (
                        <span className="games-delete-actions">
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={deletingMatchId === session.id}
                            onClick={() => deleteRequest(session.id)}
                          >{deletingMatchId === session.id ? 'Deleting...' : 'Confirm delete'}</button>
                          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPendingDeleteId(null)}>Cancel</button>
                        </span>
                      ) : (
                        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPendingDeleteId(session.id)}>Delete request</button>
                      )
                    ) : <span className="games-status">Lobby</span>}
                  </div>
                );
              })}
            </div>
          ) : <p className="empty-note">No tournament sessions have started yet.</p>}
        </div>
      </div>

      <div className="games-section leaderboard-section">
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
      </div>
    </PageSection>
  );
};

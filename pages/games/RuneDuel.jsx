function RuneArt({ pick }) {
  const artwork = {
    flame: 'flame.png',
    gale: 'gale.png',
    stone: 'stone.png',
    shadow: 'shadow.png'
  };
  const image = artwork[pick] || 'sealed.png';
  return <img className="rune-art" src={`assets/rune-duel/${image}`} alt="" aria-hidden="true" />;
}

window.RuneDuel = function RuneDuel({ match, spectating = false, players = [] }) {
  const [myPick, setMyPick] = React.useState(null);
  const [spectatorPicks, setSpectatorPicks] = React.useState([]);
  const [picksLoading, setPicksLoading] = React.useState(true);
  const [pickError, setPickError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [opponentOnline, setOpponentOnline] = React.useState(false);
  const [presenceConnection, setPresenceConnection] = React.useState('connecting');
  const finishedMatchRef = React.useRef(null);
  const userHouse = window.currentHouse || '';
  const houseKey = userHouse === match.house_a ? 'house_a' : 'house_b';
  const opponentHouse = houseKey === 'house_a' ? match.house_b : match.house_a;
  const scores = match.state?.scores || { house_a: 0, house_b: 0 };
  const round = Number(match.state?.round) || 1;
  const lastResult = match.state?.last_result;

  React.useEffect(() => {
    if (spectating) {
      setOpponentOnline(false);
      setPresenceConnection('disconnected');
      return undefined;
    }
    let active = true;
    const channel = sb.channel(`rune-duel-presence-${match.id}`, {
      config: { private: true, presence: { key: window.currentUserId } }
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        if (!active) return;
        const players = Object.values(channel.presenceState()).flat();
        setOpponentOnline(players.some(player => (
          player.user_id !== window.currentUserId && player.house === opponentHouse
        )));
      })
      .subscribe(async status => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          setPresenceConnection('connected');
          await channel.track({
            user_id: window.currentUserId,
            house: userHouse,
            name: window.currentPlayerName || 'Player'
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setPresenceConnection('disconnected');
        }
      });
    return () => {
      active = false;
      sb.removeChannel(channel);
    };
  }, [match.id, opponentHouse, userHouse, spectating]);

  React.useEffect(() => {
    let active = true;
    setPicksLoading(true);
    let query = sb.from('rune_duel_picks')
      .select(spectating ? 'user_id, pick' : 'pick')
      .eq('match_id', match.id)
      .eq('round', round);
    if (!spectating) query = query.eq('user_id', window.currentUserId).maybeSingle();
    query.then(({ data, error }) => {
        if (!active) return;
        if (error) setPickError(error.message);
        if (spectating) {
          setSpectatorPicks(data?.length === 2 ? data : []);
          setMyPick(null);
        } else {
          setMyPick(data?.pick || null);
          setSpectatorPicks([]);
        }
        setPicksLoading(false);
      });
    return () => { active = false; };
  }, [match.id, round, spectating]);

  React.useEffect(() => {
    if (spectating || match.status !== 'finished' || finishedMatchRef.current === match.id) return;
    finishedMatchRef.current = match.id;
    sb.rpc('finish_match', { match_id: match.id }).then(({ error }) => {
      if (error) setPickError(`The match ended, but its points could not be recorded: ${error.message}`);
      else window.dispatchEvent(new CustomEvent('nocturne-games-refresh'));
    });
  }, [match.id, match.status, spectating]);

  async function submitPick(pick) {
    setSubmitting(true);
    setPickError('');
    const { data, error } = await sb.rpc('submit_rune_pick', { match_id: match.id, pick });
    if (error) {
      setPickError(error.message);
    } else {
      setMyPick(pick);
      if (data?.waiting_for_opponent) {
        setPickError('');
      }
    }
    setSubmitting(false);
  }

  const opponentPickRevealed = lastResult?.round === round - 1
    ? (houseKey === 'house_a' ? lastResult.house_b_pick : lastResult.house_a_pick)
    : null;
  const spectatorPlayers = [match.house_a, match.house_b].map(house => (
    players.find(player => player.house === house)
  ));

  return (
    <article className="card rune-duel">
      <div className="games-card-heading">
        <div>
          <span className="games-kicker">{spectating ? 'Tournament spectator view' : 'Tournament duel'}</span>
          <h3>Rune Duel</h3>
        </div>
        <span className="games-status">{match.status === 'finished' ? 'Finished' : 'Live'}</span>
      </div>
      {spectating ? (
        <p className="games-rule">
          Watching {spectatorPlayers.map((player, index) => (
            `${index ? ' vs ' : ''}${player?.name || 'Player'} of House ${index ? match.house_b : match.house_a}`
          )).join('')}. This view cannot submit picks or affect the result.
        </p>
      ) : null}
      <p className="games-rule">Flame defeats Gale. Gale defeats Stone. Stone defeats Shadow. Shadow defeats Flame. Matching or opposite runes draw without scoring.</p>
      <div className="rune-scoreboard">
        <div><span>House {match.house_a}</span><strong>{scores.house_a || 0}</strong></div>
        <span className="rune-score-divider">:</span>
        <div><span>House {match.house_b || 'opponent'}</span><strong>{scores.house_b || 0}</strong></div>
      </div>
      {match.status === 'active' ? (
        <>
          {!spectating && presenceConnection === 'disconnected' ? <p className="games-disconnected">Tournament presence is disconnected.</p> : null}
          {!spectating && presenceConnection !== 'disconnected' ? (
            <p className="games-note" role="status">
              {opponentOnline ? 'Your opponent is in the match.' : 'Your opponent is away. The match stays open, and they can return when ready.'}
            </p>
          ) : null}
          <p className="games-round">
            Round {round}. Best of 5 scored rounds, first house to 3 wins takes 10 points. Draws replay.
          </p>
          {spectating ? (
            <div className="rune-reveal-grid" aria-live="polite">
              {[match.house_a, match.house_b].map((house, index) => {
                const pick = spectatorPicks.find(entry => (
                  entry.user_id === players.find(player => player.house === house)?.user_id
                ))?.pick;
                return (
                  <div className={`rune-reveal ${pick ? 'revealed' : ''}`} key={house}>
                    <small>{spectatorPlayers[index]?.name || 'Player'}, House {house}</small>
                    {!picksLoading ? <RuneArt pick={pick} /> : null}
                    <strong>{picksLoading ? '...' : pick || 'Hidden'}</strong>
                    <span>{pick ? 'Revealed' : 'Hidden until both lock in'}</span>
                  </div>
                );
              })}
              {lastResult ? (
                <p className="games-note spectator-last-result">
                  Previous round: House {lastResult.winner_house || 'both'} {lastResult.outcome === 'draw' ? 'drew' : 'won'}.
                </p>
              ) : null}
            </div>
          ) : (
          <>
          <div className="rune-reveal-grid" aria-live="polite">
            <div className="rune-reveal">
              <small>Your rune</small>
              {!picksLoading ? <RuneArt pick={myPick} /> : null}
              <strong>{picksLoading ? '...' : myPick || 'Choose below'}</strong>
              {myPick ? <span>Locked in</span> : null}
            </div>
            <div className={`rune-reveal ${opponentPickRevealed ? 'revealed' : ''}`}>
              <small>House {opponentHouse}</small>
              <RuneArt pick={opponentPickRevealed} />
              <strong>{opponentPickRevealed || 'Hidden'}</strong>
              <span>{opponentPickRevealed ? 'Revealed' : 'Waiting for both players'}</span>
            </div>
          </div>
          <div className="rune-pick-grid">
            {[
              ['flame', 'Flame'],
              ['gale', 'Gale'],
              ['stone', 'Stone'],
              ['shadow', 'Shadow']
            ].map(([pick, label]) => (
              <button
                className={`rune-pick ${myPick === pick ? 'selected' : ''}`}
                type="button"
                key={pick}
                disabled={Boolean(myPick) || submitting || picksLoading}
                onClick={() => submitPick(pick)}
              >
                <RuneArt pick={pick} />
                {label}
              </button>
            ))}
          </div>
          {lastResult?.outcome === 'draw' && lastResult.round === round - 1 ? (
            <p className="games-note" aria-live="polite">Both runes met evenly. Choose again for the next round.</p>
          ) : null}
          </>
          )}
        </>
      ) : (
        <p className="games-note" aria-live="polite">
          {match.winner_house ? `House ${match.winner_house} won the duel.` : 'This match has finished.'}
          {lastResult ? ` Final round: ${lastResult.house_a_pick} against ${lastResult.house_b_pick}.` : ''}
        </p>
      )}
      {pickError ? <p className="games-error" role="alert">{pickError}</p> : null}
    </article>
  );
};

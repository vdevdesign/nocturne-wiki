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

// Resolve a round between two runes using the same rules as the database
// function. Returns 'a', 'b', or 'draw'. Ties: gale/shadow and stone/flame.
function resolveRuneRound(pickA, pickB) {
  if (!pickA || !pickB) return null;
  if (pickA === pickB) return 'draw';
  if (
    (pickA === 'gale' && pickB === 'shadow') || (pickA === 'shadow' && pickB === 'gale')
    || (pickA === 'stone' && pickB === 'flame') || (pickA === 'flame' && pickB === 'stone')
  ) return 'draw';
  if (
    (pickA === 'stone' && pickB === 'gale') || (pickA === 'gale' && pickB === 'flame')
    || (pickA === 'flame' && pickB === 'shadow') || (pickA === 'shadow' && pickB === 'stone')
  ) return 'a';
  return 'b';
}

function RuneDuelTestMode() {
  const runes = [
    ['flame', 'Flame'],
    ['gale', 'Gale'],
    ['stone', 'Stone'],
    ['shadow', 'Shadow']
  ];
  const [pickA, setPickA] = React.useState(null);
  const [pickB, setPickB] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [scores, setScores] = React.useState({ a: 0, b: 0 });
  const [round, setRound] = React.useState(1);
  const winner = scores.a >= 3 ? 'House A' : scores.b >= 3 ? 'House B' : null;

  function reveal() {
    if (!pickA || !pickB) return;
    const outcome = resolveRuneRound(pickA, pickB);
    setHistory(previous => [{ round, pickA, pickB, outcome }, ...previous].slice(0, 10));
    if (outcome === 'a') setScores(previous => ({ ...previous, a: previous.a + 1 }));
    if (outcome === 'b') setScores(previous => ({ ...previous, b: previous.b + 1 }));
    if (outcome !== 'draw') setRound(previous => previous + 1);
    setPickA(null);
    setPickB(null);
  }

  function reset() {
    setPickA(null);
    setPickB(null);
    setHistory([]);
    setScores({ a: 0, b: 0 });
    setRound(1);
  }

  return (
    <section className="games-section rune-test-mode" aria-label="Rune Duel test mode" style={{ marginTop: 24 }}>
      <div className="games-section-heading">
        <div>
          <span className="games-kicker">DM tools</span>
          <h4>Rune Duel test mode</h4>
        </div>
      </div>
      <p className="games-note">
        Sandbox only — nothing is saved and no points are awarded. Play both sides
        to check the matchup rules against the chart. First to 3 round wins.
      </p>
      <div className="rune-scoreboard" aria-label="Test scoreboard">
        <div><span>Player A</span><strong>{scores.a}</strong></div>
        <span className="rune-score-divider">:</span>
        <div><span>Player B</span><strong>{scores.b}</strong></div>
      </div>
      <p className="games-round">
        {winner
          ? `${winner} wins the test duel.`
          : `Round ${round}. Draws replay the round.`}
      </p>
      <div className="rune-test-grid">
        {['A', 'B'].map(side => (
          <div className="rune-test-side" key={side}>
            <small>Player {side}</small>
            <div className="rune-test-picks">
              {runes.map(([pick, label]) => (
                <button
                  className={`rune-pick ${(side === 'A' ? pickA : pickB) === pick ? 'selected' : ''}`}
                  type="button"
                  key={pick}
                  onClick={() => (side === 'A' ? setPickA(pick) : setPickB(pick))}
                >
                  <RuneArt pick={pick} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rune-test-actions">
        <button className="btn btn-sm" type="button" disabled={!pickA || !pickB || Boolean(winner)} onClick={reveal}>
          Reveal round
        </button>
        <button className="btn btn-sm btn-secondary" type="button" onClick={reset}>Reset test</button>
      </div>
      <div className="rune-test-result" aria-live="polite">
        {history.length ? history.map(entry => (
          <p key={entry.round} className="games-rule">
            Round {entry.round}: {entry.pickA} vs {entry.pickB} —
            {' '}{entry.outcome === 'draw' ? 'draw, replay' : `Player ${entry.outcome.toUpperCase()} wins the round`}.
          </p>
        )) : <p className="empty-note">Pick a rune for both players, then reveal the round.</p>}
      </div>
    </section>
  );
}

function RuneDuelMatchBanner({ match, status }) {
  const phrases = [
    "Let's d-d-duel!",
    'Choose your rune carefully!',
    'The runes await your choice…',
    'May the sharpest mind prevail!',
    'Every rune has a rival.',
    'Trust your instinct — then lock it in!'
  ];
  const winnerHouse = status === 'finished' ? match.winner_house : null;
  if (winnerHouse) {
    return (
      <div className="rune-duel-banner rune-duel-banner-winner" role="status">
        <strong>House {winnerHouse} wins the duel!</strong>
      </div>
    );
  }
  const phrase = phrases[(Number(match.state?.round) || 1) % phrases.length];
  return (
    <div className="rune-duel-banner" role="status">
      <strong>{phrase}</strong>
    </div>
  );
}

function RuneRoundResults({ result, match, players }) {
  if (!result) return null;
  const houses = [match.house_a, match.house_b];
  const picks = [result.house_a_pick, result.house_b_pick];
  const winner = result.winner_house;
  const isDraw = result.outcome === 'draw';
  const winnerPlayer = players.find(player => player.house === winner);
  const winnerName = (winnerPlayer && winnerPlayer.name) || '';

  return (
    <div className="rune-last-round" aria-live="polite">
      <div className="rune-last-round-heading">
        <strong>Round {result.round} results</strong>
        <span>
          {isDraw
            ? 'Draw, neither house scored.'
            : `${winnerName ? `${winnerName} of ` : ''}House ${winner} wins this round.`}
        </span>
      </div>
      <div className="rune-last-round-players">
        {houses.map((house, index) => {
          const player = players.find(entry => entry.house === house);
          const victory = !isDraw && house === winner;
          return (
            <div className={`rune-last-round-player ${victory ? 'victory' : ''}`} key={house}>
              <div>
                <strong>{(player && player.name) || `House ${house}`}</strong>
                <span>House {house}</span>
              </div>
              <RuneArt pick={picks[index]} />
              <span className="rune-last-round-pick">{picks[index]}</span>
              <span className={`rune-round-outcome ${isDraw ? 'draw' : victory ? 'win' : 'loss'}`}>
                {isDraw ? 'Draw' : victory ? 'Victory this round' : 'Defeat this round'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.RuneDuelTestMode = RuneDuelTestMode;

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
      <RuneDuelMatchBanner match={match} status={match.status} />
      <RuneRoundResults result={lastResult} match={match} players={players} />
      {match.status === 'active' ? (
        <>
          {!spectating && presenceConnection === 'disconnected' ? <p className="games-disconnected">Tournament presence is disconnected.</p> : null}
          {!spectating && presenceConnection !== 'disconnected' ? (
            <p className="games-note" role="status">
              {opponentOnline ? 'Your opponent is in the match.' : 'Your opponent is away. The match stays open, and they can return when ready.'}
            </p>
          ) : null}
          <p className="games-round">
            Round {round}. Best of 5 scored rounds, first house to 3 wins earns 1 house point for their victory. Draws replay.
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
          </>
          )}
        </>
      ) : (
        <p className="games-note" aria-live="polite">
          {match.winner_house ? `House ${match.winner_house} won the duel.` : 'This match has finished.'}
        </p>
      )}
      <div className="rune-scoreboard" aria-label="Round wins">
        <div><span>House {match.house_a}</span><strong>{scores.house_a || 0}</strong></div>
        <span className="rune-score-divider">:</span>
        <div><span>House {match.house_b || 'opponent'}</span><strong>{scores.house_b || 0}</strong></div>
      </div>
      <section className="games-section rune-how-to-play" aria-label="How to play Rune Duel" style={{ marginTop: 24 }}>
        <div className="games-section-heading">
          <div>
            <span className="games-kicker">Rules</span>
            <h4>How to play Rune Duel</h4>
          </div>
        </div>
        <p className="games-rule">Stone grounds Gale. Gale snuffs out Flame. Flame banishes Shadow. Shadow hollows out Stone. Matching runes tie, and opposite runes tie and replay the round.</p>
        <figure className="rune-matchup-chart">
          <img
            src="assets/rune-duel/rune-duel-matchups_UPDATED.png"
            alt="Rune Duel matchup chart. Stone grounds Gale, Gale snuffs out Flame, Flame banishes Shadow, and Shadow hollows out Stone. Gale ties Shadow, and Stone ties Flame; matching runes also tie and replay."
          />
        </figure>
      </section>
      {window.currentUserIsDM ? <RuneDuelTestMode /> : null}
      {pickError ? <p className="games-error" role="alert">{pickError}</p> : null}
    </article>
  );
};

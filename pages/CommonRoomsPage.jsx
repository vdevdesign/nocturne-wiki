const commonRoomHouses = {
  Phoenix: {
    emblem: '🔥',
    crest: 'assets/house-phoenix.png',
    motto: 'Perseverantia ex Cineribus',
    translation: 'Perseverance from Ashes',
    virtue: 'Keep the spark. Rise stronger with every attempt.',
    room: 'The Emberlight Hall',
    game: 'Rising Ember',
    gameDescription: 'Watch the ember sequence, then repeat it. Each round adds another spark.'
  },
  Fox: {
    emblem: '🦊',
    crest: 'assets/house-fox.png',
    motto: 'Sagacitas et Calliditas',
    translation: 'Keenness and Cleverness',
    virtue: 'Look twice, think sideways, and trust a clever hunch.',
    room: 'The Lanternwood Den',
    game: 'The Fox’s Riddles',
    gameDescription: 'Three riddles stand between you and the den’s hidden lantern.'
  },
  Selkie: {
    emblem: '🌊',
    crest: 'assets/house-selkie.png',
    motto: 'Misericordia et Natura',
    translation: 'Empathy and Nature',
    virtue: 'Notice every small life, and leave the tidepool thriving.',
    room: 'The Moon-Tide Grotto',
    game: 'Tidepool Pairs',
    gameDescription: 'Turn over the shells and find every creature’s matching friend.'
  }
};

function PhoenixGame() {
  const [sequence, setSequence] = React.useState([]);
  const [phase, setPhase] = React.useState('idle');
  const [stage, setStage] = React.useState(0);
  const [inputIndex, setInputIndex] = React.useState(0);
  const [message, setMessage] = React.useState('');
  const sparks = ['✦', '◆', '●', '▲'];

  React.useEffect(() => {
    if (phase !== 'show') return undefined;
    const timeout = window.setTimeout(() => setPhase('recall'), 600 + sequence.length * 750);
    return () => window.clearTimeout(timeout);
  }, [phase, sequence]);

  function beginTrial() {
    setSequence(Array.from({ length: 2 }, () => Math.floor(Math.random() * sparks.length)));
    setStage(0);
    setInputIndex(0);
    setMessage('Watch closely. The pattern will fade, but the spark remains.');
    setPhase('show');
  }

  function chooseSpark(spark) {
    if (phase !== 'recall') return;
    if (sequence[inputIndex] !== spark) {
      setInputIndex(0);
      setMessage('The ember dims, but it is not gone. Take a breath and try the pattern again.');
      return;
    }

    if (inputIndex + 1 < sequence.length) {
      setInputIndex(inputIndex + 1);
      return;
    }

    const nextStage = stage + 1;
    setStage(nextStage);
    setInputIndex(0);
    if (nextStage === 4) {
      setPhase('won');
      setMessage('The fire rises anew. You kept the spark alive!');
      return;
    }

    setSequence([...sequence, Math.floor(Math.random() * sparks.length)]);
    setMessage('The flame grows. Remember the longer pattern.');
    setPhase('show');
  }

  return (
    <div className="house-game">
      <div className="house-game-heading">
        <div>
          <span className="house-game-kicker">Phoenix trial</span>
          <h3>{commonRoomHouses.Phoenix.game}</h3>
        </div>
        <span className="house-game-score">{stage}/4 sparks</span>
      </div>
      <p>{commonRoomHouses.Phoenix.gameDescription}</p>
      <div className="ember-sequence" aria-label={phase === 'show' ? 'Watch the displayed ember sequence' : 'Ember sequence hidden'}>
        {phase === 'show'
          ? sequence.map((spark, index) => <span className="ember-preview" key={index}>{sparks[spark]}</span>)
          : <span className="ember-hidden">{phase === 'won' ? '✦' : phase === 'idle' ? '✧' : '✧'}</span>}
      </div>
      <p className="house-game-status" aria-live="polite">{message || 'Four rounds. One unbroken flame.'}</p>
      {phase === 'idle' || phase === 'won' ? (
        <button className="btn" type="button" onClick={beginTrial}>{phase === 'won' ? 'Rise Again' : 'Begin the Trial'}</button>
      ) : (
        <div className="ember-buttons">
          {sparks.map((spark, index) => (
            <button
              className="ember-button"
              type="button"
              key={spark}
              disabled={phase === 'show'}
              aria-label={`Choose ember ${index + 1}`}
              onClick={() => chooseSpark(index)}
            >{spark}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const foxRiddles = [
  {
    question: 'I have cities but no houses, forests but no trees, and water but no fish. What am I?',
    answers: ['A map', 'A painting', 'A dream'],
    correct: 0,
    clue: 'Correct! A map shows the world without containing it.'
  },
  {
    question: 'The more you take, the more you leave behind. What are they?',
    answers: ['Coins', 'Footsteps', 'Breaths'],
    correct: 1,
    clue: 'Exactly. Each step leaves a footprint behind.'
  },
  {
    question: 'I speak without a mouth and answer without ears. What am I?',
    answers: ['An echo', 'A book', 'A bell'],
    correct: 0,
    clue: 'A sharp ear! An echo answers sound without ever speaking first.'
  },
  {
    question: 'I have a face and two hands, but no arms or legs. What am I?',
    answers: ['A clock', 'A portrait', 'A scarecrow'],
    correct: 0,
    clue: 'Correct! A clock has a face and hands to mark the time.'
  },
  {
    question: 'I have many keys, but I cannot open a single lock. What am I?',
    answers: ['A piano', 'A key ring', 'A locksmith'],
    correct: 0,
    clue: 'Well played! A piano has keys that make music, not keys for locks.'
  },
  {
    question: 'The more I dry, the wetter I become. What am I?',
    answers: ['A towel', 'The sun', 'A sponge'],
    correct: 0,
    clue: 'Exactly. A towel gets wetter as it dries something else.'
  },
  {
    question: 'I have a neck but no head. What am I?',
    answers: ['A bottle', 'A giraffe', 'A shirt collar'],
    correct: 0,
    clue: 'You got it—a bottle has a neck, but no head.'
  },
  {
    question: 'I can travel around the world while staying in one corner. What am I?',
    answers: ['A postage stamp', 'A compass', 'A map'],
    correct: 0,
    clue: 'A clever answer! A postage stamp stays in the corner of an envelope.'
  },
  {
    question: 'What belongs to you, but other people use it more than you do?',
    answers: ['Your name', 'Your chair', 'Your coat'],
    correct: 0,
    clue: 'Right! Other people say your name more often than you do.'
  },
  {
    question: 'I have one eye but cannot see. What am I?',
    answers: ['A needle', 'A storm', 'A statue'],
    correct: 0,
    clue: 'Thread the answer through: a needle has an eye, but cannot see.'
  },
  {
    question: 'I have many teeth, but I never bite. What am I?',
    answers: ['A comb', 'A crocodile', 'A zipper'],
    correct: 0,
    clue: 'Correct! A comb’s teeth help untangle hair, not take a bite.'
  },
  {
    question: 'I have words but never speak. What am I?',
    answers: ['A book', 'A parrot', 'A radio'],
    correct: 0,
    clue: 'Exactly. A book holds words for someone else to read.'
  },
  {
    question: 'I begin with T, end with T, and have T inside me. What am I?',
    answers: ['A teapot', 'A tent', 'A toast'],
    correct: 0,
    clue: 'Tea-riffic! A teapot begins and ends with T and holds tea.'
  },
  {
    question: 'I have a thumb and four fingers, but I am not alive. What am I?',
    answers: ['A glove', 'A hand puppet', 'A statue'],
    correct: 0,
    clue: 'That fits! A glove has spaces for a thumb and four fingers.'
  },
  {
    question: 'I keep going up, but I never come back down. What am I?',
    answers: ['Your age', 'A balloon', 'A staircase'],
    correct: 0,
    clue: 'A thoughtful answer—your age only goes up as the years pass.'
  },
  {
    question: 'I have branches, but no leaves, fruit, or trunk. What am I?',
    answers: ['A bank', 'A treehouse', 'A river delta'],
    correct: 0,
    clue: 'Correct! A bank can have branches in many different places.'
  },
  {
    question: 'I have a bed but never sleep, and I run but never walk. What am I?',
    answers: ['A river', 'A tired dog', 'A clock'],
    correct: 0,
    clue: 'You found the current: a river has a riverbed and runs downstream.'
  },
  {
    question: 'You can catch me, but you cannot throw me. What am I?',
    answers: ['A cold', 'A ball', 'A fish'],
    correct: 0,
    clue: 'That’s it—a cold is something you can catch, but not toss!'
  }
];

function shuffleFoxRiddles() {
  const shuffled = [...foxRiddles];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function FoxGame() {
  const [riddles, setRiddles] = React.useState(shuffleFoxRiddles);
  const [riddle, setRiddle] = React.useState(0);
  const [score, setScore] = React.useState(0);
  const [choice, setChoice] = React.useState(null);
  const [finished, setFinished] = React.useState(false);
  const current = riddles[riddle];

  function chooseAnswer(index) {
    if (choice !== null || finished) return;
    setChoice(index);
    if (index === current.correct) setScore(score + 1);
  }

  function continueGame() {
    if (riddle + 1 === riddles.length) {
      setFinished(true);
      return;
    }
    setRiddle(riddle + 1);
    setChoice(null);
  }

  function restartGame() {
    setRiddles(shuffleFoxRiddles());
    setRiddle(0);
    setScore(0);
    setChoice(null);
    setFinished(false);
  }

  return (
    <div className="house-game">
      <div className="house-game-heading">
        <div>
          <span className="house-game-kicker">Fox trial</span>
          <h3>{commonRoomHouses.Fox.game}</h3>
        </div>
        <span className="house-game-score">{score}/{foxRiddles.length} clever answers</span>
      </div>
      <p>{commonRoomHouses.Fox.gameDescription}</p>
      {finished ? (
        <div className="house-game-finish" aria-live="polite">
          <strong>{score === foxRiddles.length ? 'The hidden lantern is yours!' : 'The den applauds your cleverness.'}</strong>
          <p>You solved {score} of {foxRiddles.length} riddles.</p>
          <button className="btn" type="button" onClick={restartGame}>Try the riddles again</button>
        </div>
      ) : (
        <>
          <p className="fox-question">{current.question}</p>
          <div className="fox-answers">
            {current.answers.map((answer, index) => (
              <button
                className={`btn btn-secondary fox-answer${choice === index ? ' selected' : ''}`}
                type="button"
                key={answer}
                disabled={choice !== null}
                onClick={() => chooseAnswer(index)}
              >{answer}</button>
            ))}
          </div>
          {choice !== null && (
            <div className="house-game-feedback" aria-live="polite">
              <p>{choice === current.correct ? current.clue : `Not quite—the answer was ${current.answers[current.correct]}. A clever fox learns from every clue.`}</p>
              <button className="btn" type="button" onClick={continueGame}>{riddle + 1 === riddles.length ? 'See your result' : 'Next riddle'}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const tidepoolCreatures = [
  ['crab', '🦀', 'Little crab'],
  ['seal', '🦭', 'Curious seal'],
  ['turtle', '🐢', 'Sea turtle'],
  ['starfish', '⭐', 'Tidepool star'],
  ['octopus', '🐙', 'Clever octopus'],
  ['dolphin', '🐬', 'Playful dolphin']
];

const tidepoolDifficulties = [
  { name: 'Easy', pairs: 3 },
  { name: 'Medium', pairs: 4 },
  { name: 'Hard', pairs: 6 }
];

function makeTidepoolDeck(pairCount) {
  return tidepoolCreatures
    .slice(0, pairCount)
    .flatMap(([pair, icon, name]) => [{ pair, icon, name }, { pair, icon, name }])
    .map((card, index) => ({ ...card, id: `${card.pair}-${index}` }))
    .sort(() => Math.random() - 0.5);
}

function SelkieGame() {
  const [difficulty, setDifficulty] = React.useState('Medium');
  const selectedDifficulty = tidepoolDifficulties.find(level => level.name === difficulty);
  const [deck, setDeck] = React.useState(() => makeTidepoolDeck(selectedDifficulty.pairs));
  const [selected, setSelected] = React.useState([]);
  const [matched, setMatched] = React.useState([]);
  const [moves, setMoves] = React.useState(0);

  function startDifficulty(level) {
    const nextDifficulty = tidepoolDifficulties.find(option => option.name === level);
    if (!nextDifficulty) return;
    setDifficulty(level);
    setDeck(makeTidepoolDeck(nextDifficulty.pairs));
    setSelected([]);
    setMatched([]);
    setMoves(0);
  }

  function turnCard(index) {
    if (selected.length === 2 || selected.includes(index) || matched.includes(deck[index].pair)) return;
    const nextSelected = [...selected, index];
    setSelected(nextSelected);
    if (nextSelected.length !== 2) return;

    setMoves(moves + 1);
    const [first, second] = nextSelected.map(cardIndex => deck[cardIndex]);
    if (first.pair === second.pair) {
      setMatched([...matched, first.pair]);
      setSelected([]);
    } else {
      window.setTimeout(() => setSelected([]), 700);
    }
  }

  function restartGame() {
    setDeck(makeTidepoolDeck(selectedDifficulty.pairs));
    setSelected([]);
    setMatched([]);
    setMoves(0);
  }

  const complete = matched.length === selectedDifficulty.pairs;

  return (
    <div className="house-game">
      <div className="house-game-heading">
        <div>
          <span className="house-game-kicker">Selkie trial</span>
          <h3>{commonRoomHouses.Selkie.game}</h3>
        </div>
        <span className="house-game-score">{complete ? 'All friends found' : `${matched.length}/${selectedDifficulty.pairs} pairs · ${moves} turns`}</span>
      </div>
      <p>{commonRoomHouses.Selkie.gameDescription}</p>
      <div className="tidepool-difficulty" role="group" aria-label="Choose tidepool game difficulty">
        {tidepoolDifficulties.map(level => (
          <button
            className={`btn btn-sm ${difficulty === level.name ? '' : 'btn-secondary'}`}
            type="button"
            key={level.name}
            aria-pressed={difficulty === level.name}
            onClick={() => startDifficulty(level.name)}
          >{level.name} · {level.pairs} pairs</button>
        ))}
      </div>
      <div className="tidepool-grid" aria-label="Tidepool matching game">
        {deck.map((card, index) => {
          const revealed = selected.includes(index) || matched.includes(card.pair);
          return (
            <button
              className={`tidepool-card${revealed ? ' revealed' : ''}`}
              type="button"
              key={card.id}
              aria-label={revealed ? card.name : `Unturned shell ${index + 1}`}
              aria-pressed={revealed}
              disabled={matched.includes(card.pair) || selected.length === 2}
              onClick={() => turnCard(index)}
            >
              <span aria-hidden="true">{revealed ? card.icon : '◌'}</span>
              <small>{revealed ? card.name : 'shell'}</small>
            </button>
          );
        })}
      </div>
      <div className="house-game-feedback">
        <p aria-live="polite">{complete ? 'Every little friend has found its way home. The grotto thanks you!' : 'Take your time. Every creature deserves to be found.'}</p>
        <button className="btn btn-secondary" type="button" onClick={restartGame}>{complete ? 'Play again' : 'Start the tide over'}</button>
      </div>
    </div>
  );
}

function CommonRoomsPage() {
  const [assignment, setAssignment] = React.useState({ loading: false, house: null, characterId: null, characterName: '', error: '', missing: false, dm: false });
  const [previewHouse, setPreviewHouse] = React.useState('Phoenix');
  const [savingHouse, setSavingHouse] = React.useState(false);
  const [housePickerOpen, setHousePickerOpen] = React.useState(false);
  const [sharedMatchId, setSharedMatchId] = React.useState(null);
  const [sharedGameLoading, setSharedGameLoading] = React.useState(false);
  const [sharedGameError, setSharedGameError] = React.useState('');
  window.setCommonRoomAssignment = setAssignment;
  window.setCommonRoomPreview = setPreviewHouse;

  React.useEffect(() => {
    if (!housePickerOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setHousePickerOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [housePickerOpen]);

  const house = assignment.dm ? previewHouse : assignment.house;
  const details = house ? commonRoomHouses[house] : null;

  React.useEffect(() => {
    let active = true;
    setSharedMatchId(null);
    setSharedGameError('');

    if (assignment.dm || !assignment.house || assignment.loading || !window.currentUserId) {
      setSharedGameLoading(false);
      return undefined;
    }

    setSharedGameLoading(true);
    sb.rpc('join_common_room', { game: 'shared_constellation' }).then(({ data, error }) => {
      if (!active) return;
      if (error) setSharedGameError(error.message);
      else setSharedMatchId(data?.id || null);
      setSharedGameLoading(false);
    });

    return () => { active = false; };
  }, [assignment.house, assignment.dm, assignment.loading]);

  async function chooseHouse(houseName) {
    if (savingHouse || !assignment.characterId || !commonRoomHouses[houseName]) return;
    setSavingHouse(true);
    setAssignment(previous => ({ ...previous, error: '' }));

    const { data, error } = await sb.from('characters')
      .update({ house: houseName })
      .eq('id', assignment.characterId)
      .select('id')
      .maybeSingle();

    if (error) {
      setAssignment(previous => ({ ...previous, error: `Could not save your house choice: ${error.message}` }));
    } else if (!data) {
      setAssignment(previous => ({
        ...previous,
        error: 'Your house choice could not be saved for this character. Please ask the DM to check your character assignment.'
      }));
    } else {
      setAssignment(previous => ({ ...previous, house: houseName, missing: false, error: '' }));
      setHousePickerOpen(false);
      window.currentHouse = houseName.toLowerCase();
      window.dispatchEvent(new CustomEvent('nocturne-auth-changed'));
    }
    setSavingHouse(false);
  }

  return (
    <PageSection
      id="common-rooms"
      eyebrow="The Houses of Elthizar"
      title="Common Rooms"
      subtitle="A little corner of the academy for every house—and a small trial to match."
    >
      {assignment.loading ? <p className="empty-note">Finding your place in the academy...</p> : null}
      {assignment.error ? <p className="house-room-error" role="alert">{assignment.error}</p> : null}
      {!assignment.loading && assignment.missing && !assignment.dm ? (
        <div className="card house-room-unassigned">
          <h3>{assignment.characterName ? `Welcome, ${assignment.characterName}!` : 'Your room is waiting'}</h3>
          {assignment.characterId ? (
            <>
              <p>Your character doesn’t have a house yet. Discover the house whose virtues feel most like your own.</p>
              <button className="btn house-picker-trigger" type="button" onClick={() => setHousePickerOpen(true)}>
                Choose Your House
              </button>
            </>
          ) : (
            <p>Your character isn’t linked to this player account yet. Please ask the DM to check your character assignment.</p>
          )}
        </div>
      ) : null}
      {housePickerOpen && assignment.missing && !assignment.dm ? (
        ReactDOM.createPortal(
          <div className="house-picker-vignette" role="presentation" onMouseDown={event => {
            if (event.target === event.currentTarget && !savingHouse) setHousePickerOpen(false);
          }}>
            <div className="house-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="house-picker-title">
              <button className="house-picker-close" type="button" aria-label="Close house selection" autoFocus disabled={savingHouse} onClick={() => setHousePickerOpen(false)}>×</button>
              <h2 id="house-picker-title" className="house-choice-heading">Choose Your House</h2>
              <p className="house-picker-intro">Hover over a house to glimpse its spirit, then choose where your story belongs.</p>
              <div className="house-choice-grid">
                {Object.entries(commonRoomHouses).map(([name, details]) => (
                  <button
                    className={`house-choice-card house-${name.toLowerCase()}`}
                    key={name}
                    type="button"
                    disabled={savingHouse}
                    onClick={() => chooseHouse(name)}
                  >
                    <img className="house-choice-crest" src={details.crest} alt={`House ${name} crest`} />
                    <span className="house-room-label">{details.room}</span>
                    <span className="house-choice-name">House {name}</span>
                    <span className="house-choice-motto">{details.motto}</span>
                    <span className="house-choice-translation">{details.translation}</span>
                    <span className="house-choice-virtue">{details.virtue}</span>
                    <span className="house-choice-action">{savingHouse ? 'Choosing…' : `Join House ${name}`}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}
      {assignment.dm ? (
        <div className="house-room-preview">
          <label htmlFor="house-room-picker">DM preview</label>
          <select id="house-room-picker" className="input-field" value={previewHouse} onChange={event => setPreviewHouse(event.target.value)}>
            {Object.keys(commonRoomHouses).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <span>Players see the room matching the house field on their character.</span>
        </div>
      ) : null}
      {!assignment.loading && assignment.house && !assignment.dm && assignment.characterName ? (
        <h3 className="house-room-welcome">Welcome, {assignment.characterName} of House {assignment.house}.</h3>
      ) : null}
      {details ? (
        <>
          <article className={`house-room-card house-${house.toLowerCase()}`} data-house={house.toLowerCase()}>
            <div className="house-room-art" aria-hidden="true">{details.emblem}</div>
            <div className="house-room-copy">
              <span className="house-room-label">{details.room}</span>
              <h3>House {house}</h3>
              <p className="house-motto">{details.motto}</p>
              <p className="house-translation">{details.translation}</p>
              <p>{details.virtue}</p>
            </div>
          </article>
          {house === 'Phoenix' ? <PhoenixGame key={house} /> : null}
          {house === 'Fox' ? <FoxGame key={house} /> : null}
          {house === 'Selkie' ? <SelkieGame key={house} /> : null}
          <div className={`games-section house-${house.toLowerCase()}`}>
            <div className="games-section-heading">
              <div>
                <span className="games-kicker">House {house}, together</span>
                <h3>Shared Constellation</h3>
              </div>
              {!assignment.dm ? <span className="games-house-badge">Cooperative game</span> : null}
            </div>
            <p className="games-rule">Place five stars together to complete the pattern. Your house earns 10 points, up to 50 common room points each UTC day.</p>
            {assignment.dm ? (
              <p className="empty-note">DM preview shows the room only. Join with a player account from this house to play its shared game.</p>
            ) : null}
            {sharedGameLoading ? <p className="empty-note">Connecting to your house game...</p> : null}
            {sharedGameError ? <p className="games-error" role="alert">{sharedGameError}</p> : null}
            {!assignment.dm && sharedMatchId ? (
              <window.SharedConstellation
                matchId={sharedMatchId}
                house={house.toLowerCase()}
                playerName={window.currentPlayerName || assignment.characterName || 'Player'}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </PageSection>
  );
}

window.CommonRoomsPage = CommonRoomsPage;

window.useMatch = function useMatch(matchId) {
  const [match, setMatch] = React.useState(null);
  const [loading, setLoading] = React.useState(Boolean(matchId));
  const [error, setError] = React.useState('');
  const [connection, setConnection] = React.useState('connecting');

  React.useEffect(() => {
    if (!matchId) {
      setMatch(null);
      setLoading(false);
      setConnection('disconnected');
      return undefined;
    }

    let mounted = true;
    setMatch(null);
    setLoading(true);
    setError('');

    async function loadMatch() {
      const { data, error: fetchError } = await sb.from('matches')
        .select('*')
        .eq('id', matchId)
        .maybeSingle();
      if (!mounted) return;
      if (fetchError) {
        setError(fetchError.message);
        setConnection('disconnected');
      } else if (!data) {
        setError('This match is not available to your account.');
        setConnection('disconnected');
      } else {
        setMatch(data);
      }
      setLoading(false);
    }

    loadMatch();
    const channel = sb.channel(`match-${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`
      }, payload => {
        if (mounted) setMatch(payload.new);
      })
      .subscribe(status => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED') setConnection('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnection('disconnected');
        }
      });

    return () => {
      mounted = false;
      sb.removeChannel(channel);
    };
  }, [matchId]);

  return { match, setMatch, loading, error, connection };
};

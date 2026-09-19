import { layoutBracket, roundLabel, scoreFor, type BracketMatch } from "@/lib/bracket";

export function PlayoffBracket({ matches }: { matches: BracketMatch[] }) {
  if (!matches.length) return <p className="empty">No bracket is available for this competition yet.</p>;
  const labels = new Map(matches.map((match, index) => [match.id, `M${index + 1}`]));
  return <div className="playoff-bracket"><p className="bracket-hint">One complete bracket · Solid lines: winners · Dashed lines: loser drops · All times UTC</p>{layoutBracket(matches).map(lane => <section className="bracket-lane" key={lane.name} aria-label={lane.name}><h3>{lane.name}</h3><div className="bracket-board" tabIndex={0} role="region" aria-label={`${lane.name}, scroll to see all rounds`}><div style={{ width: lane.width, minWidth: lane.width }}><div className="bracket-headers">{lane.rounds.map((round, index) => <h4 key={index}>{`Round ${index + 1}`}</h4>)}</div><div className="bracket-canvas" style={{ height: lane.height }}>{lane.sections.map(section => <h4 className="bracket-section-label" key={section.name} style={{ top: section.y }}>{section.name}</h4>)}<svg className="bracket-connectors" width={lane.width} height={lane.height} aria-hidden="true">{lane.edges.map(edge => <path key={edge.key} strokeDasharray={edge.loser ? "4 4" : undefined} d={`M ${edge.from.x + 256} ${edge.from.y} H ${edge.to.x - 16} V ${edge.to.y} H ${edge.to.x}`} />)}</svg>{lane.rounds.flat().map(match => {
    const position = lane.positions.get(match.id)!;
    const scores = [scoreFor(match, 0), scoreFor(match, 1)];
    const date = new Date(match.scheduled_at ?? match.begin_at ?? "");
    const time = Number.isFinite(date.getTime()) ? `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })} · ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}` : "Date TBD";
    return <article className={`bracket-match${match.status === "running" ? " is-live" : ""}`} key={match.id} style={{ left: position.x, top: position.y - 50 }} aria-label={match.name}><div className="bracket-meta"><span title={roundLabel(match)}>{labels.get(match.id)} · {roundLabel(match)}</span><span>{match.status === "running" ? "● LIVE" : match.status === "finished" ? "Finished" : match.status === "canceled" ? "Canceled" : time}</span></div>{[0, 1].map(index => {
      const team = match.opponents?.[index]?.opponent;
      const ref = match.previous_matches?.[index];
      const name = team?.name || (ref?.match_id ? `${ref.type === "loser" ? "Loser" : "Winner"} of ${labels.get(ref.match_id) ?? `#${ref.match_id}`}` : "TBD");
      const winner = match.status === "finished" && (match.winner_id != null ? team?.id === match.winner_id : scores[index] != null && scores[1 - index] != null && scores[index]! > scores[1 - index]!);
      return <div className={`bracket-team${winner ? " is-winner" : ""}`} key={index}>{team?.image_url ? <img src={team.image_url} alt="" /> : <i>{team?.name?.slice(0, 1) || "?"}</i>}<span title={name}>{name}</span><b>{scores[index] ?? "—"}</b></div>;
    })}</article>;
  })}</div></div></div></section>)}</div>;
}

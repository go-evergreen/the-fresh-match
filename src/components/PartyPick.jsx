import { useMemo, useState } from "react";
import { PARTY_PARTNERS } from "../data/partyPartners";

export function PartyPick() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const people = useMemo(
    () => PARTY_PARTNERS.filter((person) => !needle || person.name.toLowerCase().includes(needle)),
    [needle]
  );

  return (
    <div className="intro">
      <div className="intro-hero">
        <div className="intro-copy">
          <div className="eyebrow">The Fresh Match</div>
          <h1>
            Who&apos;s your
            <br />
            <span className="h1-line">
              <em>partner</em>?
            </span>
          </h1>
          <p className="intro-lead">
            Tap the friend who invited you. Their quiz opens next, and your results go to them.
          </p>
          <label className="party-search">
            <input
              type="search"
              value={query}
              placeholder="Search by name"
              aria-label="Search partners"
              autoComplete="off"
              enterKeyHint="search"
              autoCapitalize="words"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="path-label">The friend who invited you</div>
          <div className="path-grid">
            {people.map((person) => (
              <a key={person.slug} className="path-btn" href={`/${person.slug}`}>
                <span className="path-btn-main">
                  <span className="t">{person.name}</span>
                </span>
                <span className="path-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            ))}
          </div>
          {people.length === 0 ? (
            <p className="party-empty">No one by that name. Try the name on their Facebook profile.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { PARTY_PARTNERS } from "../data/partyPartners";

export function PartyPick({ onChoose }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const people = useMemo(() => {
    if (!needle) return [];
    return PARTY_PARTNERS.filter((person) =>
      `${person.name} ${person.also || ""}`.toLowerCase().includes(needle)
    );
  }, [needle]);

  return (
    <div className="party-overlay">
      <div className="party-card">
        <h2>Who&apos;s your partner?</h2>
        <label className="party-search">
          <input
            type="search"
            value={query}
            placeholder="Search by name"
            aria-label="Search by name"
            aria-expanded={needle ? "true" : "false"}
            aria-controls="party-names"
            autoComplete="off"
            enterKeyHint="search"
            autoCapitalize="words"
            onChange={(event) => setQuery(event.target.value)}
          />
          {needle ? (
            <div className="party-drop" id="party-names" role="listbox">
              {people.length ? (
                people.map((person) => (
                  <button key={person.slug} type="button" role="option" onClick={() => onChoose(person)}>
                    {person.name}
                  </button>
                ))
              ) : (
                <p className="party-empty">No one by that name. Try the name on their Facebook profile.</p>
              )}
            </div>
          ) : null}
        </label>
      </div>
    </div>
  );
}

"use client";
import { useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

function formatDate(d) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

const initialItems = [
    { id: "1", title: "Milch", owner: "Max", date: new Date(2023, 10, 20), done: false },
    { id: "2", title: "Brot", owner: "Anna", date: new Date(2023, 10, 20), done: false },
    { id: "3", title: "Eier", owner: "Max", date: new Date(2023, 10, 20), done: true },
    { id: "4", title: "Käse", owner: "Anna", date: new Date(2023, 10, 20), done: false },
    { id: "5", title: "Butter", owner: "Max", date: new Date(2023, 10, 20), done: false },
    { id: "6", title: "Joghurt", owner: "Anna", date: new Date(2023, 10, 20), done: false },
    { id: "7", title: "Obst", owner: "Max", date: new Date(2023, 10, 20), done: false },
    { id: "8", title: "Gemüse", owner: "Anna", date: new Date(2023, 10, 20), done: false },
];

export default function Page() {
    const [items, setItems] = useState(initialItems);

    const [quickText, setQuickText] = useState("");
    const [quickOwner, setQuickOwner] = useState("Anna");

    const dialogRef = useRef(null);
    const [produkt, setProdukt] = useState("");
    const [status, setStatus] = useState("Offen");
    const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
    const [person, setPerson] = useState("");
    const [editingId, setEditingId] = useState(null);

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const [filterOwner, setFilterOwner] = useState("Alle");
    const [filterStatus, setFilterStatus] = useState("Alle");
    const [sortBy, setSortBy] = useState("date"); // date | title | owner | status
    const [sortDir, setSortDir] = useState("desc"); // asc | desc

    function toggle(id) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
    }

    function remove(id) {
        setItems((prev) => prev.filter((i) => i.id !== id));
    }

    function openNewDialog() {
        setEditingId(null);
        setProdukt("");
        setStatus("Offen");
        setDatum(new Date().toISOString().slice(0, 10));
        setPerson("");
        dialogRef.current?.showModal();
    }
    function openEditDialog(item) {
        setEditingId(item.id);
        setProdukt(item.title);
        setStatus(item.done ? "Erledigt" : "Offen");
        const d = item.date instanceof Date ? item.date : new Date(item.date);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        setDatum(iso);
        setPerson(item.owner);
        dialogRef.current?.showModal();
    }
    function closeDialog() {
        dialogRef.current?.close();
    }

    function saveDialog() {
        const name = produkt.trim();
        if (!name) {
            closeDialog();
            return;
        }
        const d = new Date(datum);
        const normalizedDate = isNaN(d) ? new Date() : d;

        if (editingId) {
            setItems((prev) =>
                prev.map((i) =>
                    i.id === editingId
                        ? {
                            ...i,
                            title: name,
                            owner: person.trim() || "Unbekannt",
                            date: normalizedDate,
                            done: status === "Erledigt",
                        }
                        : i
                )
            );
        } else {
            const newItem = {
                id: crypto.randomUUID(),
                title: name,
                owner: person.trim() || "Unbekannt",
                date: normalizedDate,
                done: status === "Erledigt",
            };
            setItems((prev) => [newItem, ...prev]);
        }

        setEditingId(null);
        setProdukt("");
        setStatus("Offen");
        setDatum(new Date().toISOString().slice(0, 10));
        setPerson("");
        closeDialog();
    }

    function addQuick() {
        const parts = quickText.split(",").map((s) => s.trim()).filter(Boolean);
        if (parts.length === 0) return;
        const now = new Date();
        const toAdd = parts.map((p) => ({
            id: crypto.randomUUID(),
            title: p,
            owner: quickOwner || "Unbekannt",
            date: now,
            done: false,
        }));
        setItems((prev) => [...toAdd, ...prev]);
        setQuickText("");
    }

    function onQuickKey(e) {
        if (e.key === "Enter") addQuick();
    }

    function applySearch() {
        setSearch(searchInput);
    }
    function onSearchKey(e) {
        if (e.key === "Enter") applySearch();
    }

    const owners = useMemo(() => {
        const set = new Set(items.map((i) => i.owner).filter(Boolean));
        return ["Alle", ...Array.from(set)];
    }, [items]);

    const filteredSortedItems = useMemo(() => {
        const q = search.trim().toLowerCase();

        let res = items.filter((i) => {
            const matchesText = q
                ? (i.title || "").toLowerCase().includes(q) || (i.owner || "").toLowerCase().includes(q)
                : true;
            const matchesOwner = filterOwner === "Alle" ? true : i.owner === filterOwner;
            const matchesStatus = filterStatus === "Alle" ? true : filterStatus === "Erledigt" ? i.done : !i.done;
            return matchesText && matchesOwner && matchesStatus;
        });

        const dir = sortDir === "asc" ? 1 : -1;
        res.sort((a, b) => {
            switch (sortBy) {
                case "title": {
                    const aa = (a.title || "").toLowerCase();
                    const bb = (b.title || "").toLowerCase();
                    return aa.localeCompare(bb) * dir;
                }
                case "owner": {
                    const aa = (a.owner || "").toLowerCase();
                    const bb = (b.owner || "").toLowerCase();
                    return aa.localeCompare(bb) * dir;
                }
                case "status": {
                    const aa = a.done ? 1 : 0;
                    const bb = b.done ? 1 : 0;
                    return (aa - bb) * dir;
                }
                case "date":
                default: {
                    const aa = (a.date instanceof Date ? a.date : new Date(a.date)).getTime();
                    const bb = (b.date instanceof Date ? b.date : new Date(b.date)).getTime();
                    return (aa - bb) * dir;
                }
            }
        });

        return res;
    }, [items, search, filterOwner, filterStatus, sortBy, sortDir]);

    const list = useMemo(
        () =>
            filteredSortedItems.map((item) => (
                <article key={item.id} className={styles.card}>
                    <button
                        aria-label={item.done ? "Abhaken entfernen" : "Als erledigt markieren"}
                        className={`${styles.chk} ${item.done ? styles.chkChecked : ""}`}
                        onClick={() => toggle(item.id)}
                    >
                        {item.done ? "✓" : ""}
                    </button>

                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 className={`${styles.titleRow} ${item.done ? styles.strike : ""}`}>{item.title}</h3>
                        <div className={styles.meta}>
                            <span>👤 {item.owner}</span>
                            <span className={styles.dot}>·</span>
                            <span>📅 {formatDate(item.date instanceof Date ? item.date : new Date(item.date))}</span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={`${styles.iconSmall}`}
                            aria-label="Eintrag bearbeiten"
                            title="Bearbeiten"
                            onClick={() => openEditDialog(item)}
                        >
                            ✏️
                        </button>
                        <button
                            className={`${styles.iconSmall} ${styles.iconDanger}`}
                            aria-label="Eintrag löschen"
                            title="Löschen"
                            onClick={() => remove(item.id)}
                        >
                            🗑️
                        </button>
                    </div>
                </article>
            )),
        [filteredSortedItems]
    );

    const empty = filteredSortedItems.length === 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.topBar}>
                    <h1 className={styles.title}>Einkaufsliste</h1>
                    <button className={styles.iconBtn} onClick={openNewDialog} aria-label="Neues Produkt">
                        +
                    </button>
                </div>

                <div className={styles.searchWrap}>
                    <div className={styles.searchGrid}>
                        <input
                            className={styles.input}
                            placeholder="Suche nach Produkt oder Person..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={onSearchKey}
                            aria-label="Suche"
                        />
                        <button className={styles.btn} onClick={applySearch} aria-label="Suchen">
                            🔎 Suchen
                        </button>
                    </div>
                    {search ? <div className={styles.quickHint}>Suche aktiv: „{search}“</div> : null}
                </div>

                <div className={styles.filtersWrap}>
                    <div className={styles.filtersGrid}>
                        <select
                            className={styles.select}
                            value={filterOwner}
                            onChange={(e) => setFilterOwner(e.target.value)}
                            aria-label="Filter nach Person"
                        >
                            {owners.map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                        <select
                            className={styles.select}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            aria-label="Filter nach Status"
                        >
                            <option>Alle</option>
                            <option>Offen</option>
                            <option>Erledigt</option>
                        </select>
                        <select
                            className={styles.select}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            aria-label="Sortieren nach"
                        >
                            <option value="date">Datum</option>
                            <option value="title">Produkt</option>
                            <option value="owner">Person</option>
                            <option value="status">Status</option>
                        </select>
                        <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                            aria-label="Sortierreihenfolge ändern"
                            title="Sortierreihenfolge"
                        >
                            {sortDir === "asc" ? "⬆️ Aufsteigend" : "⬇️ Absteigend"}
                        </button>
                    </div>
                </div>

                <div className={styles.quickWrap}>
                    <div className={styles.label}>Schnell hinzufügen</div>
                    <div className={styles.quickGrid}>
                        <input
                            className={styles.input}
                            placeholder="z. B. Käse, Butter, Joghurt"
                            value={quickText}
                            onChange={(e) => setQuickText(e.target.value)}
                            onKeyDown={onQuickKey}
                        />
                        <select
                            className={styles.select}
                            value={quickOwner}
                            onChange={(e) => setQuickOwner(e.target.value)}
                        >
                            <option>Anna</option>
                            <option>Max</option>
                            <option>Unbekannt</option>
                        </select>
                        <button className={styles.btn} onClick={addQuick}>
                            Hinzufügen
                        </button>
                    </div>
                    <div className={styles.quickHint}>Tipp: mehrere Artikel mit Komma trennen</div>
                </div>
            </header>

            <main className={styles.section}>
                {empty ? (
                    <div className={styles.empty}>
                        <div>Keine Einträge gefunden.</div>
                        <div className={styles.emptyHint}>
                            Passe Suche/Filter an oder füge neue Produkte hinzu.
                        </div>
                    </div>
                ) : (
                    list
                )}
            </main>

            <dialog ref={dialogRef} className={styles.dialog}>
                <div className={styles.dialogHeader}>
                    {editingId ? "Eintrag bearbeiten" : "Neues Produkt"}
                </div>
                <div className={styles.dialogBody}>
                    <div className={styles.dialogForm}>
                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="produkt">
                                Produkt
                            </label>
                            <input
                                id="produkt"
                                className={styles.input}
                                placeholder="z. B. Milch, Brot, Eier"
                                value={produkt}
                                onChange={(e) => setProdukt(e.target.value)}
                            />
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="status">
                                Status
                            </label>
                            <select
                                id="status"
                                className={styles.select}
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option>Offen</option>
                                <option>Erledigt</option>
                            </select>
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="datum">
                                Erfassungsdatum
                            </label>
                            <input
                                id="datum"
                                type="date"
                                className={styles.dateInput}
                                value={datum}
                                onChange={(e) => setDatum(e.target.value)}
                            />
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="person">
                                Zuständige Person
                            </label>
                            <input
                                id="person"
                                className={styles.input}
                                placeholder="Name eingeben"
                                value={person}
                                onChange={(e) => setPerson(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div className={styles.dialogFooter}>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeDialog}>
                        Abbrechen
                    </button>
                    <button className={styles.btn} onClick={saveDialog}>
                        {editingId ? "Änderungen speichern" : "Produkt speichern"}
                    </button>
                </div>
            </dialog>
        </div>
    );
}
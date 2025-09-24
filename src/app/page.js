"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import { supabase } from "../lib/supabaseClient";

function formatDate(d) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

function mapRowToItem(row) {
    return {
        id: row.id,
        title: row.title ?? "",
        owner: row.assigned_to ?? "Unknown",
        date: row.created_at ? new Date(row.created_at) : new Date(),
        done: !!row.status,
    };
}

export default function Page() {
    const [items, setItems] = useState([]);

    const [quickText, setQuickText] = useState("");
    const [quickOwner, setQuickOwner] = useState("Anna");

    const dialogRef = useRef(null);
    const [product, setProduct] = useState("");
    const [status, setStatus] = useState("Open");
    const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
    const [person, setPerson] = useState("");
    const [editingId, setEditingId] = useState(null);

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const [filterOwner, setFilterOwner] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [sortBy, setSortBy] = useState("date");
    const [sortDir, setSortDir] = useState("desc");

    useEffect(() => {
        loadItems();
    }, []);

    async function loadItems() {
        const { data, error } = await supabase
            .from("items")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Failed to load items:", error);
            return;
        }
        setItems((data || []).map(mapRowToItem));
    }

    async function toggle(id) {
        const it = items.find((i) => i.id === id);
        if (!it) return;

        // Optimistic UI
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

        const { error } = await supabase.from("items").update({ status: !it.done }).eq("id", id);
        if (error) {
            console.error("Failed to update status:", error);
            // Rollback
            setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: it.done } : i)));
        }
    }

    async function remove(id) {
        const prev = items;
        setItems((p) => p.filter((i) => i.id !== id));

        const { error } = await supabase.from("items").delete().eq("id", id);
        if (error) {
            console.error("Failed to delete item:", error);
            setItems(prev); // Rollback
        }
    }

    function openNewDialog() {
        setEditingId(null);
        setProduct("");
        setStatus("Open");
        setDateStr(new Date().toISOString().slice(0, 10));
        setPerson("");
        dialogRef.current?.showModal();
    }

    function openEditDialog(item) {
        setEditingId(item.id);
        setProduct(item.title);
        setStatus(item.done ? "Done" : "Open");
        const d = item.date instanceof Date ? item.date : new Date(item.date);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        setDateStr(iso);
        setPerson(item.owner);
        dialogRef.current?.showModal();
    }

    function closeDialog() {
        dialogRef.current?.close();
    }

    async function saveDialog() {
        const name = product.trim();
        if (!name) {
            closeDialog();
            return;
        }
        const d = new Date(dateStr);
        const normalizedDate = isNaN(d) ? new Date() : d;

        if (editingId) {
            // Update existing row (including created_at as editable date for your UI)
            const updateRow = {
                title: name,
                assigned_to: person.trim() || "Unknown",
                status: status === "Done",
                created_at: normalizedDate.toISOString(),
            };
            const { data, error } = await supabase
                .from("items")
                .update(updateRow)
                .eq("id", editingId)
                .select()
                .single();

            if (error) {
                console.error("Error while saving (update):", error);
            } else if (data) {
                const mapped = mapRowToItem(data);
                setItems((prev) => prev.map((i) => (i.id === editingId ? mapped : i)));
            }
        } else {
            // Insert new row
            const insertRow = {
                title: name,
                assigned_to: person.trim() || "Unknown",
                status: status === "Done",
                created_at: normalizedDate.toISOString(),
            };
            const { data, error } = await supabase.from("items").insert(insertRow).select().single();

            if (error) {
                console.error("Error while saving (insert):", error?.message, JSON.stringify(error, null, 2));
            } else if (data) {
                const mapped = mapRowToItem(data);
                setItems((prev) => [mapped, ...prev]);
            }
        }

        setEditingId(null);
        setProduct("");
        setStatus("Open");
        setDateStr(new Date().toISOString().slice(0, 10));
        setPerson("");
        closeDialog();
    }

    async function addQuick() {
        const parts = quickText.split(",").map((s) => s.trim()).filter(Boolean);
        if (parts.length === 0) return;
        const now = new Date().toISOString();

        const toInsert = parts.map((p) => ({
            title: p,
            assigned_to: quickOwner || "Unknown",
            status: false,
            created_at: now,
        }));

        const { data, error } = await supabase.from("items").insert(toInsert).select();
        if (error) {
            console.error("Quick add failed:", error);
            return;
        }
        const mapped = (data || []).map(mapRowToItem);
        setItems((prev) => [...mapped, ...prev]);
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
        return ["All", ...Array.from(set)];
    }, [items]);

    const filteredSortedItems = useMemo(() => {
        const q = search.trim().toLowerCase();

        let res = items.filter((i) => {
            const matchesText = q
                ? (i.title || "").toLowerCase().includes(q) || (i.owner || "").toLowerCase().includes(q)
                : true;
            const matchesOwner = filterOwner === "All" ? true : i.owner === filterOwner;
            const matchesStatus =
                filterStatus === "All" ? true : filterStatus === "Done" ? i.done : !i.done;
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
                        aria-label={item.done ? "Uncheck" : "Mark as done"}
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
                            aria-label="Edit item"
                            title="Edit"
                            onClick={() => openEditDialog(item)}
                        >
                            ✏️
                        </button>
                        <button
                            className={`${styles.iconSmall} ${styles.iconDanger}`}
                            aria-label="Delete item"
                            title="Delete"
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
                    <h1 className={styles.title}>Shopping List</h1>
                    <button className={styles.iconBtn} onClick={openNewDialog} aria-label="New product">
                        +
                    </button>
                </div>

                <div className={styles.searchWrap}>
                    <div className={styles.searchGrid}>
                        <input
                            className={styles.input}
                            placeholder="Search by product or person..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={onSearchKey}
                            aria-label="Search"
                        />
                        <button className={styles.btn} onClick={applySearch} aria-label="Search">
                            🔎 Search
                        </button>
                    </div>
                    {search ? <div className={styles.quickHint}>Active search: “{search}”</div> : null}
                </div>

                <div className={styles.filtersWrap}>
                    <div className={styles.filtersGrid}>
                        <select
                            className={styles.select}
                            value={filterOwner}
                            onChange={(e) => setFilterOwner(e.target.value)}
                            aria-label="Filter by person"
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
                            aria-label="Filter by status"
                        >
                            <option>All</option>
                            <option>Open</option>
                            <option>Done</option>
                        </select>
                        <select
                            className={styles.select}
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            aria-label="Sort by"
                        >
                            <option value="date">Date</option>
                            <option value="title">Product</option>
                            <option value="owner">Person</option>
                            <option value="status">Status</option>
                        </select>
                        <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                            aria-label="Toggle sort order"
                            title="Sort order"
                        >
                            {sortDir === "asc" ? "⬆️ Asc" : "⬇️ Desc"}
                        </button>
                    </div>
                </div>

                <div className={styles.quickWrap}>
                    <div className={styles.label}>Quick add</div>
                    <div className={styles.quickGrid}>
                        <input
                            className={styles.input}
                            placeholder="e.g., Cheese, Butter, Yogurt"
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
                            <option>Unknown</option>
                        </select>
                        <button className={styles.btn} onClick={addQuick}>
                            Add
                        </button>
                    </div>
                    <div className={styles.quickHint}>Tip: separate multiple items with commas</div>
                </div>
            </header>

            <main className={styles.section}>
                {empty ? (
                    <div className={styles.empty}>
                        <div>No items found.</div>
                        <div className={styles.emptyHint}>Adjust search/filters or add new products.</div>
                    </div>
                ) : (
                    list
                )}
            </main>

            <dialog ref={dialogRef} className={styles.dialog}>
                <div className={styles.dialogHeader}>
                    {editingId ? "Edit item" : "New product"}
                </div>
                <div className={styles.dialogBody}>
                    <div className={styles.dialogForm}>
                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="product">
                                Product
                            </label>
                            <input
                                id="product"
                                className={styles.input}
                                placeholder="e.g., Milk, Bread, Eggs"
                                value={product}
                                onChange={(e) => setProduct(e.target.value)}
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
                                <option>Open</option>
                                <option>Done</option>
                            </select>
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="date">
                                Date
                            </label>
                            <input
                                id="date"
                                type="date"
                                className={styles.dateInput}
                                value={dateStr}
                                onChange={(e) => setDateStr(e.target.value)}
                            />
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="person">
                                Assignee
                            </label>
                            <input
                                id="person"
                                className={styles.input}
                                placeholder="Enter name"
                                value={person}
                                onChange={(e) => setPerson(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <div className={styles.dialogFooter}>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeDialog}>
                        Cancel
                    </button>
                    <button className={styles.btn} onClick={saveDialog}>
                        {editingId ? "Save changes" : "Save product"}
                    </button>
                </div>
            </dialog>
        </div>
    );
}
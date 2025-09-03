"use client";
import { useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

function formatDate(d){
    const dd=String(d.getDate()).padStart(2,"0");
    const mm=String(d.getMonth()+1).padStart(2,"0");
    const yyyy=d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

const initialItems=[
    { id:"1", title:"Milch", owner:"Max", date:new Date(2023,10,20), done:false },
    { id:"2", title:"Brot", owner:"Anna", date:new Date(2023,10,20), done:false },
    { id:"3", title:"Eier", owner:"Max", date:new Date(2023,10,20), done:true },
    { id:"4", title:"Käse", owner:"Anna", date:new Date(2023,10,20), done:false },
    { id:"5", title:"Butter", owner:"Max", date:new Date(2023,10,20), done:false },
    { id:"6", title:"Joghurt", owner:"Anna", date:new Date(2023,10,20), done:false },
    { id:"7", title:"Obst", owner:"Max", date:new Date(2023,10,20), done:false },
    { id:"8", title:"Gemüse", owner:"Anna", date:new Date(2023,10,20), done:false },
];

export default function Page(){
    const [items,setItems]=useState(initialItems);
    const [quickText,setQuickText]=useState("");
    const [quickOwner,setQuickOwner]=useState("Anna");
    const dialogRef=useRef(null);

    // Dialog Felder
    const [produkt,setProdukt]=useState("");
    const [status,setStatus]=useState("Offen");
    const [datum,setDatum]=useState(()=>new Date().toISOString().slice(0,10));
    const [person,setPerson]=useState("");

    function toggle(id){
        setItems(prev=>prev.map(i=>i.id===id?{...i,done:!i.done}:i));
    }

    function openDialog(){
        dialogRef.current?.showModal();
    }
    function closeDialog(){
        dialogRef.current?.close();
    }

    function addFromDialog(){
        const name=produkt.trim();
        if(!name){ closeDialog(); return; }
        const d=new Date(datum);
        const newItem={
            id:crypto.randomUUID(),
            title:name,
            owner:person.trim()||"Unbekannt",
            date:isNaN(d)?new Date():d,
            done:status==="Erledigt",
        };
        setItems(prev=>[newItem,...prev]);
        // reset
        setProdukt(""); setStatus("Offen"); setDatum(new Date().toISOString().slice(0,10)); setPerson("");
        closeDialog();
    }

    function addQuick(){
        const parts=quickText.split(",").map(s=>s.trim()).filter(Boolean);
        if(parts.length===0) return;
        const now=new Date();
        const toAdd=parts.map(p=>({ id:crypto.randomUUID(), title:p, owner:quickOwner||"Unbekannt", date:now, done:false }));
        setItems(prev=>[...toAdd,...prev]);
        setQuickText("");
    }

    function onQuickKey(e){
        if(e.key==="Enter") addQuick();
    }

    const list=useMemo(()=>items.map(item=>(
        <article key={item.id} className={styles.card}>
            <button
                aria-label={item.done?"Abhaken entfernen":"Als erledigt markieren"}
                className={`${styles.chk} ${item.done?styles.chkChecked:""}`}
                onClick={()=>toggle(item.id)}
            >
                {item.done?"✓":""}
            </button>
            <div style={{minWidth:0,flex:1}}>
                <h3 className={`${styles.titleRow} ${item.done?styles.strike:""}`}>{item.title}</h3>
                <div className={styles.meta}>
                    <span>👤 {item.owner}</span>
                    <span className={styles.dot}>·</span>
                    <span>📅 {formatDate(item.date)}</span>
                </div>
            </div>
        </article>
    )),[items]);

    return (
        <div className={styles.container}>
            {/* Kopf */}
            <header className={styles.header}>
                <div className={styles.headerRow}>
                    <h1 className={styles.title}>Einkaufsliste</h1>
                    <button className={styles.iconBtn} onClick={openDialog} aria-label="Neues Produkt">
                        +
                    </button>
                </div>

                {/* Schnell hinzufuegen */}
                <div className={styles.quickWrap}>
                    <div className={styles.label}>Schnell hinzufuegen</div>
                    <div className={styles.quickGrid}>
                        <input
                            className={styles.input}
                            placeholder="z. B. Käse, Butter, Joghurt"
                            value={quickText}
                            onChange={e=>setQuickText(e.target.value)}
                            onKeyDown={onQuickKey}
                        />
                        <select className={styles.select} value={quickOwner} onChange={e=>setQuickOwner(e.target.value)}>
                            <option>Anna</option>
                            <option>Max</option>
                            <option>Unbekannt</option>
                        </select>
                        <button className={styles.btn} onClick={addQuick}>Hinzufuegen</button>
                    </div>
                    <div className={styles.quickHint}>Tipp: mehrere Artikel mit Komma trennen</div>
                </div>
            </header>

            {/* Liste */}
            <main className={styles.section}>
                {list}
            </main>

            {/* Bottom Nav */}
            <nav className={styles.bottomNav}>
                <div className={styles.bottomInner}>
                    <button className={`${styles.navBtn} ${styles.navBtnPrimary}`}>Produkte</button>
                    <button className={styles.navBtn}>Einstellungen</button>
                </div>
            </nav>

            {/* Dialog */}
            <dialog ref={dialogRef} className={styles.dialog}>
                <div className={styles.dialogHeader}>Neues Produkt</div>
                <div className={styles.dialogBody}>
                    <div className={styles.dialogForm}>
                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="produkt">Produkt</label>
                            <input id="produkt" className={styles.input} placeholder="z. B. Milch, Brot, Eier" value={produkt} onChange={e=>setProdukt(e.target.value)} />
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="status">Status</label>
                            <select id="status" className={styles.select} value={status} onChange={e=>setStatus(e.target.value)}>
                                <option>Offen</option>
                                <option>Erledigt</option>
                            </select>
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="datum">Erfassungsdatum</label>
                            <input id="datum" type="date" className={styles.dateInput} value={datum} onChange={e=>setDatum(e.target.value)} />
                        </div>

                        <div className={styles.formRow}>
                            <label className={styles.label} htmlFor="person">Zuständige Person</label>
                            <input id="person" className={styles.input} placeholder="Name eingeben" value={person} onChange={e=>setPerson(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className={styles.dialogFooter}>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeDialog}>Abbrechen</button>
                    <button className={styles.btn} onClick={addFromDialog}>Produkt speichern</button>
                </div>
            </dialog>
        </div>
    );
}
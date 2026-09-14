# Giochi da Tavolo Offline

PWA (React + Vite) per giocare contro il computer, senza connessione, su telefono, tablet e PC:
**Dama italiana, Scacchi, Battaglia navale, Othello, Forza 4, Tris**.

## Avvio

```bash
npm install
npm run dev        # sviluppo, apre su http://localhost:5173
npm run build      # produzione in dist/
npm run preview    # prova la build di produzione
npm test           # test dei motori di gioco
```

## Pubblicazione su GitHub Pages

Il workflow `.github/workflows/deploy.yml` esegue test, build e pubblicazione a ogni push su `main`.
Operazioni da fare una volta sola:

1. Creare il repository su GitHub e fare il primo push (`git init`, `git add .`, `git commit`,
   `git branch -M main`, `git remote add origin ...`, `git push -u origin main`).
2. Nel repository: **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
3. Al termine del workflow (tab **Actions**) l'app è su `https://<utente>.github.io/GiochiTavoloOffline/`.

Sul telefono: aprire l'indirizzo in Chrome/Safari e scegliere "Aggiungi a schermata Home".
Dopo la prima apertura funziona anche senza rete (service worker); gli aggiornamenti vengono
scaricati in automatico alla successiva apertura con rete.

## Struttura

```
src/
  App.jsx                 home e navigazione (hash: #dama, #scacchi, ...)
  engine/minimax.js       ricerca negamax alfa-beta con limite di tempo (comune ai giochi a griglia)
  ai/worker.js            Web Worker: l'IA calcola senza bloccare l'interfaccia
  hooks/useGame.js        gestione partita a turni: storico, annulla, salvataggio, turno IA
  components/GameShell.jsx cornice comune (barra, stato, azioni, fine partita)
  games/<gioco>/engine.js regole + valutazione + bestMove(state, difficoltà)
  games/<gioco>/<Gioco>.jsx interfaccia
tests/engines.test.js     test delle regole e dell'IA
```

## Regole implementate

- **Dama**: regole italiane (FID). Casella scura all'angolo destro di ogni giocatore; presa
  obbligatoria; la pedina prende solo in avanti e non può prendere la dama; la dama muove di una
  casella; priorità di presa: più pezzi → con la dama → più dame → dama incontrata prima.
  La pedina che arriva in ultima riga durante una presa si ferma. Patta dopo 40 mosse senza prese.
- **Scacchi**: regole complete tramite `chess.js` (arrocco, en passant, promozione, stallo,
  ripetizione, 50 mosse). IA negamax con ricerca di quiescenza.
- **Battaglia navale**: griglia 10×10, flotta 5-4-3-3-2, le navi non possono toccarsi.
  IA: casuale / caccia con parità / mappa di probabilità a seconda della difficoltà.
- **Othello**: passo automatico quando non ci sono mosse; valutazione posizionale + mobilità.
- **Forza 4** e **Tris**: minimax; al livello difficile il Tris è imbattibile.

## Modalità istruttore (Dama e Scacchi)

Interruttore "🎓 Istruttore" sotto la plancia (attivo di default, la scelta viene ricordata):

- **Giudizio su ogni mossa**: dopo ogni tua mossa il motore la confronta con la migliore che aveva trovato
  e la classifica (mossa migliore / buona / imprecisione / errore / errore grave) con una spiegazione in
  italiano: pezzo lasciato in presa, matto mancato, cattura mancata, presa concessa all'avversario,
  promozione mancata, principi di apertura, ecc.
- **Riprova la mossa**: sugli errori compare un pulsante per annullare e rigiocare.
- **Suggerimento**: evidenzia sulla plancia la mossa consigliata e spiega perché.
- **Consigli** casuali quando non c'è nulla da commentare e **riepilogo** delle mosse a fine partita.
- Pulsante **?** in alto: regole del gioco in breve.

L'analisi gira nel Web Worker a profondità fissa (scacchi 3 semimosse + quiescenza, dama 7) ed è
indipendente dal livello di difficoltà scelto. Il codice è in `src/coach/`.

## Difficoltà

Tre livelli per ogni gioco (selettore in alto a destra). Il livello facile introduce mosse
sub-ottimali casuali; il difficile usa tutta la profondità disponibile entro un limite di tempo,
quindi su dispositivi lenti l'IA gioca comunque entro pochi secondi.

## Interfaccia, suoni ed effetti

Tema scuro "da circolo" con accenti oro e pannelli in vetro smerigliato (`src/index.css`, variabili in `:root`).
Icone SVG dei giochi in `src/components/GameIcon.jsx`. Animazioni leggere (comparsa pezzi, caduta gettoni,
capovolgimento pedine, onda sui colpi) disattivate automaticamente con `prefers-reduced-motion`.

Effetti sonori sintetizzati con WebAudio in `src/sound.js` (nessun file audio): mossa, cattura, suggerimento,
errore, colpo/acqua/affondato, vittoria/sconfitta/patta, più una vibrazione leggera sulle catture (dove supportata).
Interruttore 🔊/🔇 in home e in ogni partita; la scelta è salvata (`gto:sound`).

## Salvataggio

Partite e impostazioni sono salvate in `localStorage` (chiavi `gto:*`); la home mostra il badge
"in corso" per le partite da riprendere.

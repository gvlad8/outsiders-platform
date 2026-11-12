# OUTSIDERS Archive Network — v1.1.0

Platformă full-stack pentru trimiterea, verificarea, aprobarea și consultarea dosarelor. Interfața este realizată în React, iar API-ul folosește Node.js și Express.

## Ce include

- Acces public fără cont pentru trimiterea unui dosar și acces privat la dosarele aprobate.
- Dosare pentru PD, SMURD sau alte organizații, cu rezumat, descriere, cronologie, persoane relevante și solicitarea autorului.
- Dovezi JPG, PNG, WEBP, GIF, PDF și TXT; maximum 8 fișiere a câte 12 MB.
- Până la 8 linkuri YouTube, afișate cu player privacy-enhanced.
- Panou de administrator cu indicatori, coadă de verificare, arhivă filtrabilă și pagină detaliată pentru fiecare dosar.
- Moderare: aprobare, solicitare de completări, respingere și resetarea parolei unui dosar deja aprobat.
- Cod privat de urmărire generat la trimitere, salvat doar ca hash; autorul poate vedea statusul, nota administratorului și poate trimite completări la solicitarea de revizuire.
- Parole de dosar stocate numai ca hash bcrypt; atașamentele sunt livrate prin endpoint protejat.
- JWT pentru administrator, limitarea încercărilor de autentificare/acces și validarea tipului real al fișierelor încărcate.
- Stocare locală persistentă în `server/data/store.json` și `server/uploads/`.
- Istoric al modificărilor de stare, export CSV al rezultatelor filtrate, design responsive, suport pentru preferința de mișcare redusă și fallback când WebGL nu este disponibil.

## Cerințe

- Node.js 18 sau mai nou (recomandat Node.js 20/22).
- npm.

## Pornire locală

1. Dezarhivează proiectul.
2. Deschide terminalul în folderul `outsiders_platform`.
3. Rulează:

```bash
npm install
npm run dev
```

4. Deschide `http://localhost:5173`.

Vite servește interfața React pe portul 5173 și redirecționează cererile `/api` către serverul Express de pe portul 4000.

## Cont administrator inițial

Arhiva pregătită pentru această instalare include un fișier `.env` local:

- E-mail: `admin@outsiders.ogland`
- Parolă: `gugustiuc1.6benzina`

La pornire, serverul creează contul dacă nu există. Dacă există deja contul administrator asociat vechii adrese scrise greșit (`admin@ousiders.ogland`), îl migrează la adresa corectă și sincronizează parola configurată în `.env`.

**Securitate:** fișierul `.env` conține parola solicitată și secretul JWT. Nu publica arhiva și nu trimite `.env` unei persoane neautorizate. Înainte de găzduire publică, schimbă parola, `JWT_SECRET`, `CORS_ORIGINS` și activează HTTPS. `.env` este exclus din Git prin `.gitignore`.

Pentru o instalare nouă, poți copia `.env.example` în `.env` și completa valorile proprii. Nu introduce parola în codul React sau în fișierele servite browserului.

## Build și rulare production

```bash
npm run build
npm start
```

Serverul servește automat directorul `dist` dacă există. Pentru production, setează `NODE_ENV=production`, un `JWT_SECRET` aleator de cel puțin 32 de caractere și originea frontendului în `CORS_ORIGINS` dacă frontendul și API-ul sunt pe domenii separate.

## Date și backup

- Baza locală: `server/data/store.json`
- Fișiere încărcate: `server/uploads/`

Oprește serverul înainte de a copia aceste directoare pentru backup. Nu șterge `store.json` pentru a reseta parola: administratorul este sincronizat automat cu valoarea din `.env`, fără să fie nevoie să ștergi dosarele salvate.

Această versiune folosește stocare JSON locală și este potrivită pentru testare sau un server mic, cu un singur proces Node.js. Pentru trafic ridicat sau mai multe instanțe, migrează stocarea la PostgreSQL și mută fișierele într-un storage dedicat.

## Limitele încărcării

Sunt acceptate JPG, PNG, WEBP, GIF, PDF și TXT. Maximum 8 fișiere per dosar, 12 MB per fișier. Serverul verifică și semnătura de bază a fișierului, nu doar extensia sau MIME-ul declarat de browser.

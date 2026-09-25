# Web‑Dev Fun Portfolio

En portfolio‑webbapp byggd med Node.js, Express, Handlebars och PostgreSQL — med frontend, inloggning, gästbok och projektsida.

## 📄 Innehåll  
- Startsida med gästbok  
- Inloggning & registrering (lösenord hashade med bcrypt)  
- Admin‑funktioner för att lägga till, redigera och ta bort “work items” / projekt  
- Sidor för att visa alla “work items”, enskild projektvy och redigeringssida  
- Kontakt‑/”Contact”‑sida  
- Statisk public‑mapp för CSS och bilder  

## 🛠️ Teknikstack  
- Node.js & Express  
- Template‑motor: Handlebars  
- Databas: PostgreSQL (via `pg` + `connect-pg-simple`)  
- Sessioner & autentisering med `express-session` + PostgreSQL session store  
- Lösenord hanteras med `bcrypt`  
- Deploy: Render  

# 🏆 Tafel Wedstrijd

Een interactieve tafelsommen wedstrijd app voor het basisonderwijs. Spelers kunnen deelnemen aan wedstrijden met verschillende tafels en strijden om de hoogste score.

## ✨ Functies

- **Tafel Selectie**: Kies individuele tafels of gebruik presets (1,2,5,10 / 1-10 / 6-9)
- **Real-time Wedstrijden**: Host en deelnemers spelen tegelijkertijd
- **60 Seconden Timer**: Spelers hebben 1 minuut om zoveel mogelijk sommen goed te beantwoorden
- **Eerlijke Wedstrijd**: Alle spelers krijgen dezelfde 30 sommen
- **Snelheid Telt**: Bij gelijke scores wint de snelste speler
- **Top 3 Scoreboard**: Zie de beste spelers met tijden
- **Responsive Design**: Werkt op desktop en mobiel

## 🚀 Installatie

1. **Clone de repository:**
   ```bash
   git clone https://github.com/MeesKees7/tafelrace.git
   cd tafelrace
   ```

2. **Start de PHP server:**
   ```bash
   php -S localhost:8000
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

## 🎮 Hoe te gebruiken

1. **Host een wedstrijd:**
   - Klik "Nieuwe wedstrijd hosten"
   - Selecteer de tafels die je wilt gebruiken
   - Deel de code met deelnemers

2. **Deelnemen aan wedstrijd:**
   - Klik "Deelnemen aan wedstrijd"
   - Voer de wedstrijdcode in
   - Wacht tot de host start

3. **Spelen:**
   - Beantwoord zo snel mogelijk de sommen
   - Je hebt 60 seconden tijd
   - Na 3 foute pogingen ga je door naar de volgende som

## 🛠️ Technologie

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: PHP 8.0+
- **Database**: SQLite
- **Server**: PHP Built-in Development Server

## 📁 Project Structuur

```
tafel-wedstrijd/
├── index.html          # Hoofdpagina
├── style.css           # Styling
├── main.js            # Client-side logica
├── api/               # Backend API endpoints
│   ├── db.php         # Database connectie
│   ├── create_room.php # Room aanmaken
│   ├── join_room.php  # Deelnemen aan room
│   ├── start_game.php # Spel starten
│   ├── get_questions.php # Vragen ophalen
│   ├── submit_answer.php # Antwoord indienen
│   ├── get_scores.php # Scores ophalen
│   └── ...
└── data/              # Database bestanden
    └── basiscomp.sqlite
```

## 🎯 Game Mechanieken

- **30 Sommen**: Elke wedstrijd heeft precies 30 sommen
- **Tijd Limiet**: 60 seconden om zoveel mogelijk sommen goed te beantwoorden
- **Fout Handling**: Na 3 foute pogingen ga je automatisch door
- **Snelheid Bonus**: Bij gelijke scores wint de snelste speler
- **Gedeelde Plaatsen**: Alleen bij exact dezelfde tijd

## 🔧 Development

De app gebruikt een moderne web stack:
- **Vanilla JavaScript** voor client-side logica
- **PHP PDO** voor database interactie
- **SQLite** voor data opslag
- **CSS Grid/Flexbox** voor responsive layout

## 📝 Licentie

Dit project is gemaakt voor educatieve doeleinden.

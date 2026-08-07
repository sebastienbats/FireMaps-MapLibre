# 🔥 FireMaps - Surveillance des incendies avec météo, SDIS, graphiques, alertes et lignes de courant

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![MapLibre](https://img.shields.io/badge/MapLibre-GL-4.7.0-00B4D8?style=flat&logo=maplibre)](https://maplibre.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![NASA FIRMS](https://img.shields.io/badge/NASA-FIRMS-0B3D91?style=flat&logo=nasa)](https://firms.modaps.eosdis.nasa.gov/)
[![Open-Meteo](https://img.shields.io/badge/Open--Meteo-Weather-FF6B35?style=flat)](https://open-meteo.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**FireMaps** est une application complète de surveillance des incendies en France utilisant les données **NASA FIRMS**, les données météo **Open-Meteo**, les données **SDIS** et des **lignes de courant** pour visualiser le vent en temps réel. L'interface a été entièrement repensée avec un design moderne, des animations fluides et une expérience utilisateur optimisée.

---

## 📸 Aperçu

![FireMaps Dashboard](https://via.placeholder.com/1200x600/1a1a2e/e74c3c?text=FireMaps+Screenshot)

---

## ✨ Fonctionnalités

### 🗺️ Carte interactive
- **Fond de carte OpenStreetMap**
- **Contrôles de navigation** (zoom, rotation)
- **Attribution personnalisée** (OSM, NASA FIRMS, Open-Meteo, SDIS)
- **Mode sombre** adapté

### 🔥 Visualisation des feux (NASA FIRMS)
- **Heatmap** interactive montrant la densité des feux
- **Points individuels** classés par intensité (FRP) :
  - 🔥 **FRP > 100** : Icône 🔥 animée (Extrême)
  - 🔥 **FRP 50-100** : Cercle rouge (Élevée)
  - 🔥 **FRP 10-50** : Cercle orange (Moyenne)
  - 🔥 **FRP < 10** : Petit cercle bleu (Faible)
- **Animation de pulsation** pour les feux intenses
- **Popups interactifs** avec informations détaillées

### 🚒 Couche SDIS
- **Icônes personnalisées** 🚒 avec couleurs par département
- **Popups détaillés** (nom, type, adresse, téléphone, email, capacité)
- **Légende interactive** des couleurs par département
- **Données centralisées** dans `data/sdisData.js`

### 🌤️ Couches météo Open-Meteo
- 🌡️ **Température** à 2m
- 🌧️ **Précipitations** horaires
- ☁️ **Couverture nuageuse**
- 💨 **Vitesse du vent** à 10m
- 📊 **Pression** au niveau de la mer
- 💧 **Humidité** relative
- 👁️ **Visibilité** horizontale

### 🌬️ Lignes de courant (Vent)
- **Lignes de courant fluides** pour visualiser le flux du vent
- **Couleur selon la vitesse** (Bleu→Vert→Jaune→Orange→Rouge)
- **Épaisseur variable** selon l'intensité du vent
- **Mise à jour automatique** toutes les 5 minutes
- **Contrôle d'opacité** ajustable
- **Densité des lignes** configurable
- **Alertes** en cas de vent fort ou extrême

### 📊 Graphiques d'évolution (Chart.js)
- **Évolution temporelle** du nombre de feux et du FRP
- **Mode ligne/barres** au choix
- **Filtrage par période** (Tout, 7 jours, 30 jours)
- **Statistiques résumées** (Total, FRP moyen, FRP max)

### 🚨 Système d'alertes
- **Clusters de feux** (groupements de plus de 5 feux)
- **Feux extrêmes** (FRP > 100 MW)
- **Proximité des SDIS** (feux à moins de 10 km)
- **Tendances anormales** (> 50 feux par jour)
- **Niveaux de sévérité** (Critique, Élevé, Moyen, Faible)
- **Notifications toast** en temps réel

### 📥 Export des données
- **Export GeoJSON** complet
- **Export CSV** complet
- **Téléchargement automatique** avec date

### 🎨 Interface utilisateur améliorée
- **Design moderne** avec effets glassmorphism
- **Animations fluides** (fadeIn, slideIn, pulse, float)
- **Police Inter** pour une meilleure lisibilité
- **Thème sombre** cohérent
- **Responsive** adapté à tous les écrans
- **Scrollbar personnalisée**
- **Effets de survol** et transitions

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm 9+
- Clé API NASA FIRMS ([Obtenir une clé](https://firms.modaps.eosdis.nasa.gov/api/))

## 🚀 Installation
1. Clonez le dépôt.
   ```bash
      git clone https://github.com/sebastienbats/FireMaps-MapLibre.git
      cd FireMaps-MapLibre
   ```
2. Installation et exécution
    ```bash
    #Backend
    cd backend && npm install && npm start
    # ou en développement : npm run dev
    #Frontend
    cd frontend && npm install && npm start
    #Le frontend sera accessible sur http://localhost:3000 et le backend sur http://localhost:5000.
    ```
## 📁 Structure complète du projet
```text
FireMaps-MapLibre/
├── backend/
│   ├── controllers/         # fireController, exportController
│   ├── routes/              # fires.js, exports.js
│   ├── server.js            # CORS amélioré
│   └── .env
├── frontend/
│   ├── public/              # index.html (CDN MapLibre + OMWeather)
│   └── src/
│       ├── components/
│       │   ├── Controls/    # Filtres et contrôles (UI améliorée)
│       │   ├── Map/         # Carte MapLibre
│       │   │   ├── Map.js
│       │   │   ├── WindLayer.js       # Lignes de courant
│       │   │   ├── WindControls.js    # Contrôles du vent
│       │   │   └── WindLayerAdapter.js
│       │   ├── Charts/      # Graphiques Chart.js (UI améliorée)
│       │   └── Alerts/      # Système d'alertes (UI améliorée)
│       ├── data/            # Données centralisées
│       │   ├── sdisData.js
│       │   └── index.js
│       ├── lib/             # Bibliothèques centralisées
│       │   ├── maplibre.js  # Gestion de MapLibre GL
│       │   └── index.js
│       ├── utils/           # Utilitaires
│       │   └── errorHandler.js # Gestion d'erreurs centralisée
│       ├── api.js
│       ├── App.js
│       ├── App.css          # Styles améliorés
│       ├── index.css        # Styles globaux améliorés
│       └── index.js
└── README.md
```
## 🛠️ Technologies
### Backend
  - Node.js + Express - Serveur REST
  - node-fetch - Requêtes vers NASA FIRMS
  - csv-parse - Parsing CSV
  - express-validator - Validation des entrées
  - CORS avancé - Support multi-origines
  - Frontend
  - React 18 + Hooks
  - MapLibre GL (CDN) - Carte interactive
  - OMWeatherMapLayer (CDN) - Couches météo
  - Chart.js - Graphiques d'évolution
  - react-hot-toast - Notifications
  - Axios - Client HTTP
  - Google Fonts - Police Inter
##🎯 Personnalisation
### Ajouter une caserne SDIS
- Dans frontend/src/data/sdisData.js, ajoutez un objet au tableau SDIS_DATA :

```javascript
{
  id: 9,
  nom: 'SDIS VotreDépartement',
  adresse: 'Votre adresse',
  ville: 'Votre ville',
  codePostal: 'XXXXX',
  departement: 'VotreDépartement',
  departementCode: 'XX',
  latitude: 00.0000,
  longitude: 00.0000,
  telephone: 'XX XX XX XX XX',
  email: 'sdisXX@departement.fr',
  capacite: 100,
  type: 'Centre de secours'
}
```
### Ajouter une couleur pour un département
- Dans frontend/src/data/sdisData.js, ajoutez une entrée à SDIS_COLORS :
```javascript
export const SDIS_COLORS = {
  // ... existants
  'votre-departement': '#votre_couleur',
  default: '#e67e22'
};
```
### Modifier les couleurs du thème
- Dans frontend/src/index.css, modifiez les variables CSS :
```css
:root {
  --primary: #e74c3c;     /* Rouge principal */
  --primary-dark: #c0392b; /* Rouge foncé */
  --dark: #1a1a2e;        /* Fond sombre */
  --shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
```
## 📝 License
MIT - voir LICENSE

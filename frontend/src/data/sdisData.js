export const SDIS_DATA = [
  {
    id: 1,
    nom: 'SDIS 25 - Doubs',
    adresse: '11 Rue Pierre de Coubertin',
    ville: 'Besançon',
    codePostal: '25000',
    departement: 'Doubs',
    departementCode: '25',
    latitude: 47.2378,
    longitude: 6.0242,
    telephone: '03 81 25 25 25',
    email: 'sdis25@doubs.fr',
    capacite: 120,
    type: 'Centre de secours principal'
  },
  {
    id: 2,
    nom: 'SDIS 25 - Caserne de Montbéliard',
    adresse: 'Avenue des Pyrénées',
    ville: 'Montbéliard',
    codePostal: '25200',
    departement: 'Doubs',
    departementCode: '25',
    latitude: 47.5100,
    longitude: 6.7979,
    telephone: '03 81 94 00 00',
    email: 'sdis25@doubs.fr',
    capacite: 60,
    type: 'Centre de secours'
  },
  {
    id: 3,
    nom: 'SDIS 30 - Gard',
    adresse: '101 Rue de la République',
    ville: 'Nîmes',
    codePostal: '30900',
    departement: 'Gard',
    departementCode: '30',
    latitude: 43.8367,
    longitude: 4.3601,
    telephone: '04 66 76 30 30',
    email: 'sdis30@gard.fr',
    capacite: 150,
    type: 'Centre de secours principal'
  },
  {
    id: 4,
    nom: 'SDIS 30 - Caserne d\'Alès',
    adresse: 'Avenue Georges Clemenceau',
    ville: 'Alès',
    codePostal: '30100',
    departement: 'Gard',
    departementCode: '30',
    latitude: 44.1276,
    longitude: 4.0820,
    telephone: '04 66 86 30 30',
    email: 'sdis30@gard.fr',
    capacite: 80,
    type: 'Centre de secours'
  },
  {
    id: 5,
    nom: 'SDIS 33 - Gironde',
    adresse: '114 Rue du Commandant Charcot',
    ville: 'Bordeaux',
    codePostal: '33000',
    departement: 'Gironde',
    departementCode: '33',
    latitude: 44.8378,
    longitude: -0.5792,
    telephone: '05 56 95 33 33',
    email: 'sdis33@gironde.fr',
    capacite: 200,
    type: 'Centre de secours principal'
  },
  {
    id: 6,
    nom: 'SDIS 33 - Caserne de Mérignac',
    adresse: 'Avenue de la République',
    ville: 'Mérignac',
    codePostal: '33700',
    departement: 'Gironde',
    departementCode: '33',
    latitude: 44.8380,
    longitude: -0.6400,
    telephone: '05 56 95 33 33',
    email: 'sdis33@gironde.fr',
    capacite: 70,
    type: 'Centre de secours'
  },
  {
    id: 7,
    nom: 'SDIS 34 - Hérault',
    adresse: '122 Rue de la République',
    ville: 'Montpellier',
    codePostal: '34000',
    departement: 'Hérault',
    departementCode: '34',
    latitude: 43.6108,
    longitude: 3.8767,
    telephone: '04 67 22 34 34',
    email: 'sdis34@herault.fr',
    capacite: 180,
    type: 'Centre de secours principal'
  },
  {
    id: 8,
    nom: 'SDIS 34 - Caserne de Sète',
    adresse: 'Boulevard Maréchal Joffre',
    ville: 'Sète',
    codePostal: '34200',
    departement: 'Hérault',
    departementCode: '34',
    latitude: 43.4012,
    longitude: 3.6915,
    telephone: '04 67 74 34 34',
    email: 'sdis34@herault.fr',
    capacite: 60,
    type: 'Centre de secours'
  },
  {
    id: 9,
    nom: 'BSPP - Paris',
    adresse: 'Place Jules Renard',
    ville: 'Paris',
    codePostal: '75017',
    departement: 'Paris',
    departementCode: '75',
    latitude: 48.8839,
    longitude: 2.3275,
    telephone: '01 40 55 50 00',
    email: 'bspp@paris.fr',
    capacite: 250,
    type: 'Brigade de sapeurs-pompiers de Paris'
  },
  {
    id: 10,
    nom: 'SDIS 13 - Bouches-du-Rhône',
    adresse: '1 Rue de la Durance',
    ville: 'Marseille',
    codePostal: '13000',
    departement: 'Bouches-du-Rhône',
    departementCode: '13',
    latitude: 43.2965,
    longitude: 5.3698,
    telephone: '04 91 56 13 13',
    email: 'sdis13@bouches-du-rhone.fr',
    capacite: 220,
    type: 'Centre de secours principal'
  }
];

export const SDIS_COLORS = {
  doubs: '#e74c3c',
  gard: '#3498db',
  gironde: '#2ecc71',
  herault: '#f39c12',
  paris: '#9b59b6',
  'bouches-du-rhone': '#e67e22',
  default: '#e67e22'
};

export const getSdisColor = (departement) => {
  if (!departement) return SDIS_COLORS.default;
  const key = departement.toLowerCase().replace(/[^a-z-]/g, '');
  return SDIS_COLORS[key] || SDIS_COLORS.default;
};

export const filterSdisByDepartment = (data, departmentCode) => {
  if (!departmentCode) return data;
  return data.filter(item => item.departementCode === departmentCode);
};

export const findNearestSdis = (data, lat, lon) => {
  if (!data || data.length === 0) return null;
  
  let nearest = null;
  let minDistance = Infinity;
  
  data.forEach(item => {
    const distance = calculateDistance(lat, lon, item.latitude, item.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = item;
    }
  });
  
  return nearest;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

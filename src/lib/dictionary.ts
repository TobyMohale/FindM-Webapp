export const DICTIONARY = {
  en: {
    tagline: 'Tap for emergency contacts and medical info', selectLanguage: 'Select language',
    emergencyContacts: 'Emergency contacts', call: 'Call', whatsapp: 'WhatsApp',
    medicalInfo: 'Medical information', allergies: 'Allergies', conditions: 'Conditions', notes: 'Notes',
    shareLocation: 'Share my location with parent', locationSharing: 'Getting your location…',
    locationShared: 'Location ready — opening WhatsApp to send', locationDenied: 'Location permission declined',
    noInfo: 'No information added yet', noParentPhone: 'No parent WhatsApp number saved yet'
  },
  af: {
    tagline: 'Tik vir noodkontakte en mediese inligting', selectLanguage: 'Kies taal',
    emergencyContacts: 'Noodkontakte', call: 'Bel', whatsapp: 'WhatsApp',
    medicalInfo: 'Mediese inligting', allergies: 'Allergieë', conditions: 'Toestande', notes: 'Notas',
    shareLocation: 'Deel my ligging met ouer', locationSharing: 'Kry jou ligging…',
    locationShared: 'Ligging gereed — WhatsApp maak oop', locationDenied: 'Ligging-toestemming geweier',
    noInfo: 'Nog geen inligting bygevoeg nie', noParentPhone: 'Geen ouer-WhatsApp-nommer gestoor nie'
  },
  zu: {
    tagline: 'Thepha ukuze uthole oxhumana nabo abaphuthumayo nolwazi lwezempilo', selectLanguage: 'Khetha ulimi',
    emergencyContacts: 'Oxhumana nabo abaphuthumayo', call: 'Shayela', whatsapp: 'WhatsApp',
    medicalInfo: 'Ulwazi lwezempilo', allergies: 'Uzwayo (Allergies)', conditions: 'Izimo zezempilo', notes: 'Amanothi',
    shareLocation: 'Yabelana ngendawo nomzali', locationSharing: 'Ithola indawo yakho…',
    locationShared: 'Indawo isilungele — ivula i-WhatsApp', locationDenied: 'Imvume yendawo yenqatshiwe',
    noInfo: 'Alukho ulwazi olwengeziwe okwamanje', noParentPhone: 'Alikho inombolo ye-WhatsApp yomzali'
  },
  nso: {
    tagline: 'Kgotla go hwetša batho bao o ka ikgokaganyago le bona ka tshoganetšo le tsebišo ya kalafo', selectLanguage: 'Kgetha polelo',
    emergencyContacts: 'Batho bao o ka ikgokaganyago le bona ka tshoganetšo', call: 'Leletša', whatsapp: 'WhatsApp',
    medicalInfo: 'Tsebišo ya kalafo', allergies: 'Dilo tšeo a sa di kwanego (Allergies)', conditions: 'Maemo a maphelo', notes: 'Dintlha',
    shareLocation: 'Abelana lefelo la gago le motswadi', locationSharing: 'E hwetša lefelo la gago…',
    locationShared: 'Lefelo le lokile — e bula WhatsApp', locationDenied: 'Tumelelo ya lefelo e ganilwe',
    noInfo: 'Ga go na tsebišo yeo e tsentšhitšwego', noParentPhone: 'Ga go na nomoro ya WhatsApp ya motswadi e bolokilwego'
  }
};

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'zu', label: 'isiZulu' },
  { code: 'nso', label: 'Sepedi' },
];

export type LangCode = 'en' | 'af' | 'zu' | 'nso';

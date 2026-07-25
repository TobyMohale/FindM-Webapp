export const DICTIONARY = {
  en: {
    tagline: 'Tap for emergency contacts and medical info', selectLanguage: 'Select language',
    emergencyContacts: 'Emergency contacts', call: 'Call', whatsapp: 'WhatsApp',
    medicalInfo: 'Medical information', allergies: 'Allergies', conditions: 'Conditions', notes: 'Notes',
    shareLocation: 'Share my location with parent', locationSharing: 'Getting your location…',
    locationShared: 'Location ready — opening WhatsApp to send', locationDenied: 'Location permission declined',
    noInfo: 'No information added yet', noParentPhone: 'No parent WhatsApp number saved yet',
    finderHeader: '📢 Found this child?',
    finderSub: 'Enter your contact details so the parent can reach you immediately.',
    finderName: 'Your Name / Org',
    finderPhone: 'Your Phone Number',
    finderEmail: 'Your Email Address (Optional)',
    finderNote: 'Location Note (e.g. sitting near entrance)',
    finderBtn: '💬 Send Alert to Parent'
  },
  af: {
    tagline: 'Tik vir noodkontakte en mediese inligting', selectLanguage: 'Kies taal',
    emergencyContacts: 'Noodkontakte', call: 'Bel', whatsapp: 'WhatsApp',
    medicalInfo: 'Mediese inligting', allergies: 'Allergieë', conditions: 'Toestande', notes: 'Notas',
    shareLocation: 'Deel my ligging met ouer', locationSharing: 'Kry jou ligging…',
    locationShared: 'Ligging gereed — WhatsApp maak oop', locationDenied: 'Ligging-toestemming geweier',
    noInfo: 'Nog geen inligting bygevoeg nie', noParentPhone: 'Geen ouer-WhatsApp-nommer gestoor nie',
    finderHeader: '📢 Hierdie kind gevind?',
    finderSub: 'Voer jou besonderhede in sodat die ouer jou dadelik kan kontak.',
    finderName: 'Jou Naam / Org',
    finderPhone: 'Jou Telefoonnommer',
    finderEmail: 'Jou E-posadres (Opsioneel)',
    finderNote: 'Ligging Nota (bv. sit naby die ingang)',
    finderBtn: '💬 Stuur Waarskuwing aan Ouer'
  },
  zu: {
    tagline: 'Thepha ukuze uthole oxhumana nabo abaphuthumayo nolwazi lwezempilo', selectLanguage: 'Khetha ulimi',
    emergencyContacts: 'Oxhumana nabo abaphuthumayo', call: 'Shayela', whatsapp: 'WhatsApp',
    medicalInfo: 'Ulwazi lwezempilo', allergies: 'Uzwayo (Allergies)', conditions: 'Izimo zezempilo', notes: 'Amanothi',
    shareLocation: 'Yabelana ngendawo nomzali', locationSharing: 'Ithola indawo yakho…',
    locationShared: 'Indawo isilungele — ivula i-WhatsApp', locationDenied: 'Imvume yendawo yenqatshiwe',
    noInfo: 'Alukho ulwazi olwengeziwe okwamanje', noParentPhone: 'Alikho inombolo ye-WhatsApp yomzali',
    finderHeader: '📢 Thole lo mntwana?',
    finderSub: 'Faka imininingwane yakho ukuze umzali akuthinte masinyane.',
    finderName: 'Igama Lakho / Org',
    finderPhone: 'Inombolo Yakho Yocingo',
    finderEmail: 'I-imeli Yakho (Kuyakhetheka)',
    finderNote: 'Inothi Lendawo (isb. uhlezi eduze nomnyango)',
    finderBtn: '💬 Thumela Alethi Kumzali'
  },
  nso: {
    tagline: 'Kgotla go hwetša batho bao o ka ikgokaganyago le bona ka tshoganetšo le tsebišo ya kalafo', selectLanguage: 'Kgetha polelo',
    emergencyContacts: 'Batho bao o ka ikgokaganyago le bona ka tshoganetšo', call: 'Leletša', whatsapp: 'WhatsApp',
    medicalInfo: 'Tsebišo ya kalafo', allergies: 'Dilo tšeo a sa di kwanego (Allergies)', conditions: 'Maemo a maphelo', notes: 'Dintlha',
    shareLocation: 'Abelana lefelo la gago le motswadi', locationSharing: 'E hwetša lefelo la gago…',
    locationShared: 'Lefelo le lokile — e bula WhatsApp', locationDenied: 'Tumelelo ya lefelo e ganilwe',
    noInfo: 'Ga go na tsebišo yeo e tsentšhitšwego', noParentPhone: 'Ga go na nomoro ya WhatsApp ya motswadi e bolokilwego',
    finderHeader: '📢 O hwetše ngwana yo?',
    finderSub: 'Tsenya dintlha tša gago tša kgokagano gore motswadi a go thute ka ponyo ya leihlo.',
    finderName: 'Leina la Gago / Org',
    finderPhone: 'Nomoro ya Gago ya Mogala',
    finderEmail: 'E-meile ya Gago (Ka kgetho)',
    finderNote: 'Dintlha tša Lefelo (mohl. o dutše kgauswi le mojako)',
    finderBtn: '💬 Romela Aleriti go Motswadi'
  }
};

export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'zu', label: 'isiZulu' },
  { code: 'nso', label: 'Sepedi' },
];

export type LangCode = 'en' | 'af' | 'zu' | 'nso';

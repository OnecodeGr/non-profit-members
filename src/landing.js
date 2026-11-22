// Server-rendered marketing + sign-in page for members.onecode.win (/, /en, /fr).
// Rendered on the server so search engines index the full content in each language.

const VAT = 0.24;
export const PRICING = { base: [{ upTo: 100, net: 35 }, { upTo: 500, net: 90 }], stepMembers: 200, stepNet: 10 };

export function priceFor(members) {
  const n = Math.max(1, Math.ceil(members));
  if (n <= 100) return 35;
  if (n <= 500) return 90;
  return 90 + Math.ceil((n - 500) / PRICING.stepMembers) * PRICING.stepNet;
}

const T = {
  el: {
    locale: 'el_GR', path: '/',
    title: 'Members · Μητρώο μελών, συνδρομές & κάρτες QR για συλλόγους | OneCode',
    desc: 'Online διαχείριση μελών για συλλόγους, σωματεία και ΜΚΟ: μητρώο, ετήσιες συνδρομές, επιβεβαίωση πληρωμών, κάρτες μέλους με QR, αποδείξεις και καρτέλες σε PDF. Από 35 € + ΦΠΑ τον χρόνο.',
    keywords: 'διαχείριση μελών, μητρώο μελών, πρόγραμμα συλλόγου, συνδρομές μελών, κάρτα μέλους QR, σωματείο, ΜΚΟ, αθλητικός σύλλογος, πολιτιστικός σύλλογος',
    nav: ['Δυνατότητες', 'Πώς λειτουργεί', 'Τιμές', 'Ερωτήσεις', 'Επικοινωνία'], signin: 'Είσοδος',
    kicker: 'Για συλλόγους, σωματεία & ΜΚΟ',
    h1: 'Το μητρώο μελών σας, <em>όπως του αξίζει.</em>',
    lead: 'Μέλη, ετήσιες συνδρομές, πληρωμές, κάρτες με QR και αποδείξεις — οργανωμένα σε μία κομψή εφαρμογή που δουλεύει το ίδιο άνετα στο κινητό και στον υπολογιστή.',
    cta: 'Ζητήστε πρόσβαση', cta2: 'Δείτε τις τιμές',
    trust: ['Χωρίς εγκατάσταση', 'Ελληνικά · English · Français', 'Ασφαλές HTTPS'],
    login_title: 'Είσοδος φορέα', login_sub: 'Συνδεθείτε με τον κωδικό του φορέα σας.',
    key: 'Κωδικός φορέα', user: 'Όνομα χρήστη', pass: 'Συνθηματικό', login_btn: 'Σύνδεση', login_help: 'Δεν έχετε λογαριασμό; ', login_help_link: 'Επικοινωνήστε μαζί μας',
    feat_title: 'Όλα όσα χρειάζεται ένας σύλλογος.', feat_lead: 'Σχεδιασμένο μαζί με διοικητικά συμβούλια και ταμίες, για να φεύγει η γραφειοκρατία και να μένει ο χρόνος για την κοινότητα.',
    features: [
      ['Μητρώο μελών', 'Πλήρη στοιχεία, κατηγορίες μελών, φωτογραφία, σημειώσεις και γρήγορη αναζήτηση με όνομα, αριθμό ή τηλέφωνο.'],
      ['Κάρτα μέλους με QR', 'Κομψές κάρτες σε μέγεθος πιστωτικής, για εκτύπωση σε A4 ή εκτυπωτή καρτών, ή ως PDF στο κινητό του μέλους.'],
      ['Σάρωση & επαλήθευση', 'Σαρώστε την κάρτα με την κάμερα του κινητού και δείτε αμέσως αν το μέλος είναι ενεργό και ταμειακά εντάξει.'],
      ['Ετήσια χρέωση με ένα κλικ', 'Η συνδρομή του έτους χρεώνεται σε όλα τα ενεργά μέλη ανά κατηγορία, χωρίς διπλοχρεώσεις και με δυνατότητα αναίρεσης.'],
      ['Επιβεβαίωση πληρωμών', 'Χωρίς τραπεζικές προμήθειες: καταχωρίστε μετρητά ή καταθέσεις και ο ταμίας τις επιβεβαιώνει. Αυτόματη αρίθμηση αποδείξεων.'],
      ['Αποδείξεις & καρτέλες PDF', 'Καρτέλα κάθε μέλους και αποδείξεις είσπραξης σε PDF, έτοιμες για εκτύπωση ή αποστολή σε Viber, WhatsApp και email.'],
      ['Αναφορές για όλους', 'Υπόλοιπα όλων των μελών, κινήσεις και μητρώο σε PDF, Excel (XLSX) και CSV — για τη γενική συνέλευση και τον λογιστή.'],
      ['Μαζική εισαγωγή', 'Φέρτε τα μέλη σας από Excel σε λίγα λεπτά. Αναγνωρίζει ελληνικές επικεφαλίδες και αρχικά υπόλοιπα.'],
      ['Ρόλοι & ασφάλεια', 'Διαχειριστές, χειριστές και χρήστες μόνο προβολής. Κάθε φορέας έχει απομονωμένα δεδομένα και δικό του σύνδεσμο εισόδου.'],
    ],
    how_title: 'Σε λειτουργία σε μία απογευματινή συνεδρίαση.',
    steps: [['Λαμβάνετε τον σύνδεσμό σας', 'Δημιουργούμε τον λογαριασμό του φορέα και σας στέλνουμε τον προσωπικό σύνδεσμο εισόδου.'], ['Φέρνετε τα μέλη σας', 'Ανεβάζετε το αρχείο Excel/CSV ή προσθέτετε μέλη ένα-ένα, μαζί με τα υπόλοιπα έναρξης.'], ['Εκδίδετε κάρτες & εισπράττετε', 'Χρεώνετε τη συνδρομή του έτους, μοιράζετε κάρτες QR και καταγράφετε πληρωμές από το κινητό.']],
    price_title: 'Απλή, ετήσια τιμολόγηση.', price_lead: 'Μία τιμή ανά έτος, ανάλογα με τον αριθμό των μελών. Όλες οι δυνατότητες περιλαμβάνονται σε κάθε πακέτο.',
    per_year: '/ έτος', vat: '+ ΦΠΑ 24%', total: 'σύνολο', up_to: 'έως {n} μέλη',
    tiers: [['Σύλλογος', 'Για μικρούς συλλόγους και ομάδες.'], ['Σωματείο', 'Για οργανώσεις με μεγαλύτερη βάση μελών.'], ['Ομοσπονδία', 'Για μεγάλους φορείς, χωρίς ανώτατο όριο.']],
    tier3_price: '+10 €', tier3_unit: 'ανά επιπλέον 200 μέλη', tier3_note: 'πάνω από 500 μέλη · 12,40 € με ΦΠΑ',
    included: ['Απεριόριστοι χρήστες', 'Κάρτες QR & σάρωση', 'PDF, Excel & CSV', 'Ελληνικά, Αγγλικά, Γαλλικά', 'Υποστήριξη από την OneCode'],
    calc_title: 'Υπολογίστε το κόστος', calc_members: 'Αριθμός μελών', calc_result: 'Ετήσιο κόστος',
    faq_title: 'Συχνές ερωτήσεις',
    faq: [
      ['Χρειάζεται εγκατάσταση;', 'Όχι. Η εφαρμογή ανοίγει από οποιονδήποτε browser σε κινητό, tablet ή υπολογιστή και μπορεί να προστεθεί στην αρχική οθόνη σαν εφαρμογή.'],
      ['Γίνονται πληρωμές με κάρτα μέσα από την εφαρμογή;', 'Όχι — και αυτό είναι σκόπιμο. Δεν υπάρχουν προμήθειες συναλλαγών· καταχωρίζετε μετρητά, καταθέσεις ή POS και ο ταμίας επιβεβαιώνει κάθε πληρωμή.'],
      ['Μπορώ να φέρω τα μέλη μου από Excel;', 'Ναι. Αποθηκεύστε το αρχείο ως CSV και ανεβάστε το. Οι στήλες αναγνωρίζονται αυτόματα, ακόμη και με ελληνικές επικεφαλίδες, μαζί με τα αρχικά υπόλοιπα.'],
      ['Πώς λειτουργεί η κάρτα μέλους;', 'Κάθε κάρτα έχει μοναδικό QR. Όταν σαρωθεί, δείχνει αν το μέλος είναι ενεργό και ταμειακά εντάξει. Η κάρτα εκτυπώνεται ή στέλνεται ως PDF στο κινητό.'],
      ['Είναι ασφαλή τα δεδομένα μας;', 'Η εφαρμογή λειτουργεί στην υποδομή της Cloudflare με κρυπτογραφημένη σύνδεση, τα συνθηματικά αποθηκεύονται κρυπτογραφημένα και κάθε φορέας βλέπει μόνο τα δικά του δεδομένα.'],
      ['Τι γίνεται αν αυξηθούν τα μέλη μας;', 'Η τιμή προσαρμόζεται στην επόμενη ανανέωση: 35 € έως 100 μέλη, 90 € έως 500 και +10 € για κάθε επιπλέον 200 μέλη (πλέον ΦΠΑ).'],
    ],
    contact_title: 'Ας μιλήσουμε για τον σύλλογό σας.', contact_lead: 'Συμπληρώστε τη φόρμα και θα επικοινωνήσουμε μαζί σας για δοκιμαστική πρόσβαση και προσφορά.',
    f_name: 'Ονοματεπώνυμο', f_email: 'Email', f_phone: 'Τηλέφωνο', f_org: 'Φορέας / Σύλλογος', f_members: 'Πλήθος μελών', f_message: 'Μήνυμα',
    f_send: 'Αποστολή μηνύματος', f_sent: 'Ευχαριστούμε! Λάβαμε το μήνυμά σας και θα σας απαντήσουμε σύντομα.', f_error: 'Δεν ήταν δυνατή η αποστολή. Δοκιμάστε ξανά ή γράψτε μας στο sales@onecode.gr.',
    f_privacy: 'Τα στοιχεία σας χρησιμοποιούνται μόνο για να απαντήσουμε στο αίτημά σας.',
    suggest: 'Πρόταση ή ερώτηση;', suggest_title: 'Στείλτε μας μια πρόταση', suggest_text: 'Επιλέξτε τον τρόπο που σας βολεύει — απαντάμε γρήγορα.',
    suggest_msg: 'Γεια σας! Έχω μια πρόταση για το Members: ',
    footer: 'Λογισμικό διαχείρισης μελών για μη κερδοσκοπικούς φορείς.', rights: 'Με επιφύλαξη παντός δικαιώματος.',
    err_login: 'Λάθος στοιχεία εισόδου.', err_many: 'Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε σε 15 λεπτά.', err_inactive: 'Ο λογαριασμός του φορέα είναι ανενεργός.', err_fill: 'Συμπληρώστε όλα τα πεδία.',
    card_member: 'Μέλος', card_since: 'Μέλος από', card_org: 'Πολιτιστικός Σύλλογος',
  },
  en: {
    locale: 'en_GB', path: '/en',
    title: 'Members · Membership register, dues & QR cards for associations | OneCode',
    desc: 'Online membership management for associations, clubs and non-profits: member register, annual dues, payment confirmation, QR member cards, PDF receipts and statements. From €35 + VAT per year.',
    keywords: 'membership management, member register, association software, club membership, membership dues, QR member card, non-profit, sports club',
    nav: ['Features', 'How it works', 'Pricing', 'FAQ', 'Contact'], signin: 'Sign in',
    kicker: 'For associations, clubs & non-profits',
    h1: 'Your member register, <em>beautifully kept.</em>',
    lead: 'Members, annual dues, payments, QR cards and receipts — organised in one refined app that works just as well on a phone as on a desktop.',
    cta: 'Request access', cta2: 'See pricing',
    trust: ['Nothing to install', 'Ελληνικά · English · Français', 'Secure HTTPS'],
    login_title: 'Organisation sign-in', login_sub: 'Sign in with your organisation key.',
    key: 'Organisation key', user: 'Username', pass: 'Password', login_btn: 'Sign in', login_help: "Don't have an account? ", login_help_link: 'Get in touch',
    feat_title: 'Everything an association needs.', feat_lead: 'Designed with boards and treasurers so the paperwork disappears and the time goes back to the community.',
    features: [
      ['Member register', 'Full details, member categories, photo, notes and instant search by name, number or phone.'],
      ['QR member card', 'Elegant credit-card-size cards to print on A4 or a card printer, or send as a PDF to the member’s phone.'],
      ['Scan & verify', 'Scan a card with your phone camera and instantly see whether the member is active and up to date.'],
      ['Annual dues in one click', 'Charge the year’s dues to every active member by category — no double charges, and fully reversible.'],
      ['Payment confirmation', 'No card fees: record cash or bank transfers and the treasurer confirms them. Receipts are numbered automatically.'],
      ['PDF receipts & statements', 'A statement for every member and payment receipts as PDF, ready to print or send via Viber, WhatsApp and email.'],
      ['Reports for everyone', 'Balances of all members, transactions and the register in PDF, Excel (XLSX) and CSV — for the AGM and the accountant.'],
      ['Bulk import', 'Bring your members over from Excel in minutes, including opening balances.'],
      ['Roles & security', 'Administrators, operators and view-only users. Each organisation’s data is isolated, with its own sign-in link.'],
    ],
    how_title: 'Up and running in a single evening.',
    steps: [['Receive your link', 'We create your organisation account and send you your personal sign-in link.'], ['Bring your members', 'Upload your Excel/CSV file or add members one by one, together with opening balances.'], ['Issue cards & collect', 'Charge the year’s dues, hand out QR cards and record payments from your phone.']],
    price_title: 'Simple, annual pricing.', price_lead: 'One yearly price based on the number of members. Every feature is included in every plan.',
    per_year: '/ year', vat: '+ 24% VAT', total: 'total', up_to: 'up to {n} members',
    tiers: [['Club', 'For small clubs and groups.'], ['Association', 'For organisations with a larger membership.'], ['Federation', 'For large bodies, with no upper limit.']],
    tier3_price: '+€10', tier3_unit: 'per extra 200 members', tier3_note: 'above 500 members · €12.40 incl. VAT',
    included: ['Unlimited users', 'QR cards & scanning', 'PDF, Excel & CSV', 'Greek, English, French', 'Support from OneCode'],
    calc_title: 'Estimate your cost', calc_members: 'Number of members', calc_result: 'Yearly cost',
    faq_title: 'Frequently asked questions',
    faq: [
      ['Do I need to install anything?', 'No. The app opens in any browser on phone, tablet or computer, and can be added to the home screen like an app.'],
      ['Can members pay by card inside the app?', 'No — on purpose. There are no transaction fees; you record cash, transfers or POS payments and the treasurer confirms each one.'],
      ['Can I bring my members from Excel?', 'Yes. Save the file as CSV and upload it. Columns are detected automatically, together with opening balances.'],
      ['How does the member card work?', 'Each card has a unique QR code. When scanned it shows whether the member is active and up to date. Cards can be printed or sent as PDF.'],
      ['Is our data safe?', 'The app runs on Cloudflare’s infrastructure over encrypted connections, passwords are stored hashed, and each organisation sees only its own data.'],
      ['What if our membership grows?', 'The price adjusts at your next renewal: €35 up to 100 members, €90 up to 500 and +€10 for every extra 200 members (plus VAT).'],
    ],
    contact_title: 'Let’s talk about your association.', contact_lead: 'Fill in the form and we’ll get back to you with trial access and a quote.',
    f_name: 'Full name', f_email: 'Email', f_phone: 'Phone', f_org: 'Organisation', f_members: 'Number of members', f_message: 'Message',
    f_send: 'Send message', f_sent: 'Thank you! We received your message and will reply shortly.', f_error: 'We could not send your message. Please try again or write to sales@onecode.gr.',
    f_privacy: 'Your details are used only to reply to your request.',
    suggest: 'Idea or question?', suggest_title: 'Send us a suggestion', suggest_text: 'Pick whichever channel suits you — we reply quickly.',
    suggest_msg: 'Hello! I have a suggestion for Members: ',
    footer: 'Membership management software for non-profit organisations.', rights: 'All rights reserved.',
    err_login: 'Incorrect sign-in details.', err_many: 'Too many failed attempts. Try again in 15 minutes.', err_inactive: 'This organisation account is inactive.', err_fill: 'Please fill in all fields.',
    card_member: 'Member', card_since: 'Member since', card_org: 'Cultural Association',
  },
  fr: {
    locale: 'fr_FR', path: '/fr',
    title: 'Members · Registre des membres, cotisations & cartes QR pour associations | OneCode',
    desc: 'Gestion des adhérents en ligne pour associations, clubs et ONG : registre, cotisations annuelles, confirmation des paiements, cartes de membre QR, reçus et relevés PDF. Dès 35 € HT par an.',
    keywords: 'gestion des adhérents, registre des membres, logiciel association, cotisations, carte de membre QR, association loi 1901, club sportif',
    nav: ['Fonctionnalités', 'Fonctionnement', 'Tarifs', 'FAQ', 'Contact'], signin: 'Connexion',
    kicker: 'Pour associations, clubs & ONG',
    h1: 'Votre registre des membres, <em>tenu avec élégance.</em>',
    lead: 'Membres, cotisations annuelles, paiements, cartes QR et reçus — réunis dans une application raffinée, aussi à l’aise sur mobile que sur ordinateur.',
    cta: 'Demander un accès', cta2: 'Voir les tarifs',
    trust: ['Rien à installer', 'Ελληνικά · English · Français', 'HTTPS sécurisé'],
    login_title: 'Connexion organisation', login_sub: 'Connectez-vous avec le code de votre organisation.',
    key: "Code de l'organisation", user: "Nom d'utilisateur", pass: 'Mot de passe', login_btn: 'Se connecter', login_help: 'Pas encore de compte ? ', login_help_link: 'Contactez-nous',
    feat_title: 'Tout ce dont une association a besoin.', feat_lead: 'Conçu avec des bureaux et des trésoriers, pour que la paperasse disparaisse et que le temps revienne à la communauté.',
    features: [
      ['Registre des membres', 'Coordonnées complètes, catégories, photo, notes et recherche instantanée par nom, numéro ou téléphone.'],
      ['Carte de membre QR', 'Des cartes élégantes au format carte bancaire, à imprimer sur A4 ou imprimante à cartes, ou à envoyer en PDF.'],
      ['Scanner & vérifier', "Scannez une carte avec l'appareil photo du téléphone et voyez aussitôt si le membre est actif et à jour."],
      ['Cotisation annuelle en un clic', "Débitez la cotisation de l'année à tous les membres actifs par catégorie — sans doublon, et réversible."],
      ['Confirmation des paiements', 'Aucune commission : saisissez espèces ou virements, le trésorier les confirme. Reçus numérotés automatiquement.'],
      ['Reçus & relevés PDF', 'Un relevé pour chaque membre et des reçus en PDF, prêts à imprimer ou à envoyer par Viber, WhatsApp et e-mail.'],
      ['Rapports complets', "Soldes de tous les membres, opérations et registre en PDF, Excel (XLSX) et CSV — pour l'AG et le comptable."],
      ['Import en masse', "Importez vos membres depuis Excel en quelques minutes, soldes d'ouverture compris."],
      ['Rôles & sécurité', 'Administrateurs, opérateurs et lecture seule. Les données de chaque organisation sont isolées, avec son propre lien.'],
    ],
    how_title: 'Opérationnel en une soirée.',
    steps: [['Recevez votre lien', 'Nous créons le compte de votre organisation et vous envoyons votre lien de connexion.'], ['Importez vos membres', "Envoyez votre fichier Excel/CSV ou ajoutez les membres un à un, avec leurs soldes d'ouverture."], ['Émettez cartes & encaissez', "Lancez la cotisation de l'année, distribuez les cartes QR et enregistrez les paiements depuis votre téléphone."]],
    price_title: 'Une tarification annuelle simple.', price_lead: 'Un prix annuel selon le nombre de membres. Toutes les fonctionnalités sont incluses dans chaque formule.',
    per_year: '/ an', vat: '+ TVA 24 %', total: 'TTC', up_to: "jusqu'à {n} membres",
    tiers: [['Club', 'Pour les petits clubs et groupes.'], ['Association', 'Pour les organisations plus importantes.'], ['Fédération', 'Pour les grandes structures, sans limite.']],
    tier3_price: '+10 €', tier3_unit: 'par tranche de 200 membres', tier3_note: 'au-delà de 500 membres · 12,40 € TTC',
    included: ['Utilisateurs illimités', 'Cartes QR & scan', 'PDF, Excel & CSV', 'Grec, anglais, français', 'Support OneCode'],
    calc_title: 'Estimez votre coût', calc_members: 'Nombre de membres', calc_result: 'Coût annuel',
    faq_title: 'Questions fréquentes',
    faq: [
      ['Faut-il installer quelque chose ?', "Non. L'application s'ouvre dans n'importe quel navigateur et peut être ajoutée à l'écran d'accueil comme une application."],
      ['Peut-on payer par carte dans l’application ?', 'Non — volontairement. Aucune commission : vous saisissez espèces, virements ou TPE, et le trésorier confirme chaque paiement.'],
      ['Puis-je importer mes membres depuis Excel ?', "Oui. Enregistrez le fichier en CSV et importez-le. Les colonnes sont reconnues automatiquement, soldes d'ouverture compris."],
      ['Comment fonctionne la carte de membre ?', "Chaque carte a un QR unique. Scanné, il indique si le membre est actif et à jour. La carte s'imprime ou s'envoie en PDF."],
      ['Nos données sont-elles en sécurité ?', "L'application fonctionne sur l'infrastructure Cloudflare avec connexion chiffrée, mots de passe hachés et données isolées par organisation."],
      ['Et si le nombre de membres augmente ?', 'Le prix s’ajuste au renouvellement : 35 € jusqu’à 100 membres, 90 € jusqu’à 500 et +10 € par tranche de 200 membres (HT).'],
    ],
    contact_title: 'Parlons de votre association.', contact_lead: 'Remplissez le formulaire et nous revenons vers vous avec un accès d’essai et un devis.',
    f_name: 'Nom complet', f_email: 'E-mail', f_phone: 'Téléphone', f_org: 'Organisation', f_members: 'Nombre de membres', f_message: 'Message',
    f_send: 'Envoyer', f_sent: 'Merci ! Nous avons bien reçu votre message et vous répondrons rapidement.', f_error: "L'envoi a échoué. Réessayez ou écrivez à sales@onecode.gr.",
    f_privacy: 'Vos données servent uniquement à répondre à votre demande.',
    suggest: 'Une idée, une question ?', suggest_title: 'Envoyez-nous une suggestion', suggest_text: 'Choisissez le canal qui vous convient — nous répondons vite.',
    suggest_msg: "Bonjour ! J'ai une suggestion pour Members : ",
    footer: 'Logiciel de gestion des adhérents pour organisations à but non lucratif.', rights: 'Tous droits réservés.',
    err_login: 'Identifiants incorrects.', err_many: 'Trop de tentatives. Réessayez dans 15 minutes.', err_inactive: "Le compte de l'organisation est inactif.", err_fill: 'Veuillez remplir tous les champs.',
    card_member: 'Membre', card_since: 'Membre depuis', card_org: 'Association Culturelle',
  },
};

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function eur(n, lang) {
  return new Intl.NumberFormat(lang === 'en' ? 'en-IE' : lang === 'fr' ? 'fr-FR' : 'el-GR', { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0 }).format(n);
}

export function contactConfig(env) {
  return {
    whatsapp: String(env.CONTACT_WHATSAPP || '').replace(/[^\d]/g, ''),
    telegram: String(env.CONTACT_TELEGRAM || '').replace(/^@/, ''),
    viber: String(env.CONTACT_VIBER || '').replace(/[^\d+]/g, ''),
    email: env.SALES_EMAIL || 'sales@onecode.gr',
    turnstile: env.TURNSTILE_SITE_KEY || '',
  };
}

export function renderLanding(lang, env, origin, inlineCss = '') {
  const L = T[lang] || T.el;
  const base = (env.PUBLIC_URL || origin).replace(/\/$/, '');
  const canonical = `${base}${L.path === '/' ? '/' : L.path}`;
  const cfg = contactConfig(env);
  const tiers = [
    { ...PRICING.base[0], name: L.tiers[0] },
    { ...PRICING.base[1], name: L.tiers[1], featured: true },
  ];
  const offers = [
    { '@type': 'Offer', name: `${L.tiers[0][0]} (≤100)`, price: '43.40', priceCurrency: 'EUR', description: '35 EUR + VAT / year, up to 100 members' },
    { '@type': 'Offer', name: `${L.tiers[1][0]} (≤500)`, price: '111.60', priceCurrency: 'EUR', description: '90 EUR + VAT / year, up to 500 members' },
    { '@type': 'Offer', name: `${L.tiers[2][0]} (+200)`, price: '12.40', priceCurrency: 'EUR', description: '+10 EUR + VAT / year per additional 200 members above 500' },
  ];
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Members', url: canonical, inLanguage: lang,
      applicationCategory: 'BusinessApplication', operatingSystem: 'Web, iOS, Android, Windows, macOS', description: L.desc,
      image: `${base}/img/og.jpg`, offers, publisher: { '@type': 'Organization', name: 'OneCode', url: 'https://onecode.gr', email: cfg.email },
    },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'OneCode', url: 'https://onecode.gr', email: cfg.email, logo: `${base}/img/icon-512.png` },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: L.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const i18n = {
    err_login: L.err_login, err_many: L.err_many, err_inactive: L.err_inactive, err_fill: L.err_fill, f_sent: L.f_sent, f_error: L.f_error,
    per_year: L.per_year, vat: L.vat, total: L.total, lang, suggest_msg: L.suggest_msg,
  };
  const alt = (l) => `${base}${T[l].path === '/' ? '/' : T[l].path}`;
  const icon = (p) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const featIcons = [
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.6c2 .6 3 2.3 3.5 5.4"/>',
    '<rect x="2.5" y="5" width="19" height="14" rx="1.5"/><rect x="13.5" y="9" width="5" height="5"/><path d="M5.5 10h5M5.5 13h3"/>',
    '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h10"/>',
    '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
    '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  ];
  const ids = ['features', 'how', 'pricing', 'faq', 'contact'];

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(L.title)}</title>
<meta name="description" content="${esc(L.desc)}">
<meta name="keywords" content="${esc(L.keywords)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="OneCode">
<meta name="theme-color" content="#121110">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="el" href="${alt('el')}">
<link rel="alternate" hreflang="en" href="${alt('en')}">
<link rel="alternate" hreflang="fr" href="${alt('fr')}">
<link rel="alternate" hreflang="x-default" href="${alt('el')}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Members · OneCode">
<meta property="og:title" content="${esc(L.title)}">
<meta property="og:description" content="${esc(L.desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${L.locale}">
${Object.keys(T).filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${T[l].locale}">`).join('\n')}
<meta property="og:image" content="${base}/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(L.title)}">
<meta name="twitter:description" content="${esc(L.desc)}">
<meta name="twitter:image" content="${base}/img/og.jpg">
<link rel="icon" href="/img/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/img/icon-192.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/fonts/serif-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/manrope-500.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/img/hero.webp" as="image" type="image/webp" media="(min-width: 1020px)" fetchpriority="high">
${inlineCss ? `<style>${inlineCss}</style>` : '<link rel="stylesheet" href="/css/app.css">\n<link rel="stylesheet" href="/css/landing.css">'}
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
${cfg.turnstile ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>' : ''}
</head>
<body class="lp">
<header class="lp-nav">
  <a class="lp-logo" href="${L.path}"><img src="/img/icon.svg" alt="" width="34" height="34"><span>Members<small>by OneCode</small></span></a>
  <nav class="lp-links" aria-label="Main">${L.nav.map((n, i) => `<a href="#${ids[i]}">${esc(n)}</a>`).join('')}</nav>
  <div class="lp-nav-end">
    <div class="lp-lang">${Object.keys(T).map((l) => `<a href="${T[l].path}" hreflang="${l}" lang="${l}" class="${l === lang ? 'on' : ''}">${l.toUpperCase()}</a>`).join('')}</div>
    <a class="btn btn-primary btn-sm" href="#signin">${esc(L.signin)}</a>
  </div>
</header>

<main>
<section class="lp-hero">
  <div class="lp-hero-copy">
    <p class="lp-kicker">${esc(L.kicker)}</p>
    <h1>${L.h1}</h1>
    <p class="lp-lead">${esc(L.lead)}</p>
    <div class="lp-cta"><a class="btn btn-primary btn-lg" href="#contact">${esc(L.cta)}</a><a class="btn btn-ghost btn-lg" href="#pricing">${esc(L.cta2)}</a></div>
    <ul class="lp-trust">${L.trust.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>
  <div class="lp-hero-side" id="signin">
    <form class="lp-login" method="post" action="/api/login" novalidate>
      <h2>${esc(L.login_title)}</h2>
      <p class="muted small">${esc(L.login_sub)}</p>
      <label class="field"><span>${esc(L.key)}</span><input type="text" name="tenant_key" autocomplete="organization" autocapitalize="none" spellcheck="false" required></label>
      <label class="field"><span>${esc(L.user)}</span><input type="text" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      <label class="field"><span>${esc(L.pass)}</span><input name="password" type="password" autocomplete="current-password" required></label>
      <p class="alert" role="alert" hidden></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${esc(L.login_btn)}</button>
      <p class="small muted center">${esc(L.login_help)}<a class="link" href="#contact">${esc(L.login_help_link)}</a></p>
    </form>
  </div>
</section>

<section class="lp-showcase" aria-hidden="true">
  <div class="mcard lp-card"><div class="mcard-in"><div class="mcard-bg" style="background-image:url('/img/card-texture.webp')"></div>
    <div class="mcard-top"><span class="mcard-mono">Α</span><span class="mcard-org">${esc(L.card_org)}</span></div>
    <div class="mcard-main"><div class="mcard-info"><span class="mcard-label">${esc(L.card_member)}</span><span class="mcard-name">Ελένη<br>Αλεξίου</span>
      <span class="mcard-meta"><b>№ 128</b></span><span class="mcard-meta small">${esc(L.card_since)} 2019</span></div>
      <div class="mcard-qr"><svg viewBox="0 0 21 21" shape-rendering="crispEdges"><path fill="#111" d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM14 0h7v7h-7zM15 1v5h5V1zM16 2h3v3h-3zM0 14h7v7H0zM1 15v5h5v-5zM2 16h3v3H2zM8 0h1v2H8zM10 1h2v1h-2zM9 3h3v1H9zM8 5h2v2H8zM11 5h1v3h-1zM8 8h2v1H8zM0 8h2v1H0zM3 8h3v1H3zM13 8h2v2h-2zM16 8h1v1h-1zM18 8h3v1h-3zM1 10h3v1H1zM5 10h3v2H5zM9 10h3v1H9zM17 10h2v2h-2zM0 12h2v1H0zM10 12h1v2h-1zM12 12h3v1h-3zM20 11h1v3h-1zM8 14h2v1H8zM13 14h2v2h-2zM16 14h3v1h-3zM9 16h3v1H9zM17 16h1v3h-1zM19 17h2v1h-2zM8 18h3v1H8zM12 18h3v1h-3zM10 20h2v1h-2zM14 20h2v1h-2zM19 20h2v1h-2z"/></svg></div>
    </div></div></div>
</section>

<section class="lp-section" id="features">
  <header class="lp-head"><span class="lp-num">I</span><h2>${esc(L.feat_title)}</h2><p>${esc(L.feat_lead)}</p></header>
  <div class="lp-features">${L.features.map(([h, p], i) => `<article>${icon(featIcons[i])}<h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('')}</div>
</section>

<section class="lp-section lp-dark" id="how">
  <header class="lp-head"><span class="lp-num">II</span><h2>${esc(L.how_title)}</h2></header>
  <ol class="lp-steps">${L.steps.map(([h, p], i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join('')}</ol>
</section>

<section class="lp-section" id="pricing">
  <header class="lp-head"><span class="lp-num">III</span><h2>${esc(L.price_title)}</h2><p>${esc(L.price_lead)}</p></header>
  <div class="lp-prices">
    ${tiers.map((tr) => `<article class="${tr.featured ? 'featured' : ''}">
      <h3>${esc(tr.name[0])}</h3><p class="muted">${esc(tr.name[1])}</p>
      <p class="lp-amount"><b>${eur(tr.net, lang)}</b><span>${esc(L.per_year)}</span></p>
      <p class="lp-vat">${esc(L.vat)} · <b>${eur(+(tr.net * (1 + VAT)).toFixed(2), lang)}</b> ${esc(L.total)}</p>
      <p class="lp-limit">${esc(L.up_to.replace('{n}', tr.upTo))}</p>
    </article>`).join('')}
    <article>
      <h3>${esc(L.tiers[2][0])}</h3><p class="muted">${esc(L.tiers[2][1])}</p>
      <p class="lp-amount"><b>${esc(L.tier3_price)}</b><span>${esc(L.tier3_unit)}</span></p>
      <p class="lp-vat">${esc(L.tier3_note)}</p>
      <p class="lp-limit">500+</p>
    </article>
  </div>
  <div class="lp-price-foot">
    <ul class="lp-included">${L.included.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="lp-calc">
      <h3>${esc(L.calc_title)}</h3>
      <label class="field"><span>${esc(L.calc_members)}: <b data-calc-n>250</b></span><input type="range" min="10" max="3000" step="10" value="250" data-calc></label>
      <p class="lp-calc-out"><span>${esc(L.calc_result)}</span><b data-calc-out>${eur(90, lang)}</b><small data-calc-vat></small></p>
    </div>
  </div>
</section>

<section class="lp-section" id="faq">
  <header class="lp-head"><span class="lp-num">IV</span><h2>${esc(L.faq_title)}</h2></header>
  <div class="lp-faq">${L.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
</section>

<section class="lp-section lp-contact" id="contact">
  <header class="lp-head"><span class="lp-num">V</span><h2>${esc(L.contact_title)}</h2><p>${esc(L.contact_lead)}</p>
    <p class="lp-direct"><a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></p></header>
  <form class="lp-form form" novalidate>
    <div class="grid-2">
      <label class="field"><span>${esc(L.f_name)} *</span><input type="text" name="name" required autocomplete="name" maxlength="120"></label>
      <label class="field"><span>${esc(L.f_email)} *</span><input name="email" type="email" required autocomplete="email" maxlength="200"></label>
      <label class="field"><span>${esc(L.f_phone)}</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
      <label class="field"><span>${esc(L.f_org)}</span><input type="text" name="org" autocomplete="organization" maxlength="200"></label>
      <label class="field"><span>${esc(L.f_members)}</span><input type="text" name="members" inputmode="numeric" maxlength="8"></label>
      <label class="field hp" aria-hidden="true"><span>Website</span><input type="text" name="website" tabindex="-1" autocomplete="off"></label>
    </div>
    <label class="field"><span>${esc(L.f_message)} *</span><textarea name="message" rows="5" required maxlength="5000"></textarea></label>
    <div class="ts" data-sitekey="${esc(cfg.turnstile)}"></div>
    <p class="alert" role="alert" hidden></p>
    <p class="lp-ok" role="status" hidden></p>
    <div class="lp-form-foot"><p class="muted small">${esc(L.f_privacy)}</p><button class="btn btn-primary btn-lg" type="submit">${esc(L.f_send)}</button></div>
  </form>
</section>
</main>

<footer class="lp-footer">
  <div><a class="lp-logo" href="${L.path}"><img src="/img/icon.svg" alt="" width="30" height="30"><span>Members<small>by OneCode</small></span></a><p class="muted small">${esc(L.footer)}</p></div>
  <nav aria-label="Footer">${L.nav.map((n, i) => `<a href="#${ids[i]}">${esc(n)}</a>`).join('')}</nav>
  <p class="small muted">© ${new Date().getFullYear()} OneCode · ${esc(L.rights)}<br>Created by <a href="https://onecode.gr" target="_blank" rel="noopener">OneCode</a></p>
</footer>

<button class="lp-suggest" type="button" data-suggest aria-haspopup="dialog" aria-label="${esc(L.suggest)}">${icon('<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>')}<span>${esc(L.suggest)}</span></button>
<dialog class="lp-dialog" data-suggest-dialog>
  <form method="dialog"><h3>${esc(L.suggest_title)}</h3><p class="muted">${esc(L.suggest_text)}</p>
    <div class="lp-channels" data-channels></div>
    <button type="submit" class="btn btn-ghost btn-block">OK</button></form>
</dialog>
<script>window.LP=${JSON.stringify({ i18n, cfg }).replace(/</g, '\\u003c')};</script>
<script src="/js/landing.js" defer></script>
</body>
</html>`;
}

// Translations: Greek (default), English, French.
export const LANGS = ['el', 'en', 'fr'];

const el = {
  'app.name': 'Members',
  'suggest.button': 'Πρόταση / Ερώτηση', 'suggest.title': 'Στείλτε μας μια πρόταση', 'suggest.text': 'Επιλέξτε τον τρόπο που σας βολεύει — απαντάμε γρήγορα.',
  'suggest.message': 'Γεια σας! Πρόταση για το Members ({org}): ',
  'lang.el': 'Ελληνικά', 'lang.en': 'English', 'lang.fr': 'Français',

  'common.add': 'Προσθήκη', 'common.all': 'Όλα', 'common.all_statuses': 'Όλες οι καταστάσεις', 'common.back': 'Πίσω',
  'common.cancel': 'Άκυρο', 'common.change': 'Αλλαγή', 'common.close': 'Κλείσιμο', 'common.confirm': 'Επιβεβαίωση',
  'common.created_by': 'Created by', 'common.delete': 'Διαγραφή', 'common.done': 'Τέλος', 'common.edit': 'Επεξεργασία',
  'common.export': 'Εξαγωγή', 'common.language': 'Γλώσσα', 'common.load_more': 'Περισσότερα', 'common.ok': 'OK',
  'common.remove': 'Αφαίρεση', 'common.save': 'Αποθήκευση', 'common.saved': 'Αποθηκεύτηκε', 'common.select': 'Επιλογή',
  'common.select_all': 'Επιλογή όλων', 'common.sort': 'Ταξινόμηση', 'common.view_all': 'Όλες',

  'nav.home': 'Αρχική', 'nav.members': 'Μέλη', 'nav.scan': 'Σάρωση', 'nav.payments': 'Πληρωμές', 'nav.more': 'Μενού',
  'nav.transactions': 'Κινήσεις', 'nav.reports': 'Υπόλοιπα', 'nav.debits': 'Ετήσια χρέωση', 'nav.initial': 'Αρχικά υπόλοιπα',
  'nav.import': 'Μαζική εισαγωγή', 'nav.cards': 'Κάρτες μελών', 'nav.settings': 'Ρυθμίσεις',

  'auth.eyebrow': 'Ψηφιακή διαχείριση μελών', 'auth.hero_title': 'Η κοινότητά σας, με κομψότητα.',
  'auth.hero_text': 'Μέλη, συνδρομές, κάρτες με QR και αποδείξεις — σε ένα σημείο, από κινητό ή υπολογιστή.',
  'auth.members_area': 'Περιοχή διαχείρισης', 'auth.welcome_to': 'Καλώς ήρθατε', 'auth.tenant_key': 'Κωδικός φορέα',
  'auth.username': 'Όνομα χρήστη', 'auth.password': 'Συνθηματικό', 'auth.show_password': 'Εμφάνιση συνθηματικού',
  'auth.login': 'Σύνδεση', 'auth.logout': 'Αποσύνδεση', 'auth.fill_all': 'Συμπληρώστε όλα τα πεδία.',
  'auth.expired': 'Η συνεδρία έληξε. Συνδεθείτε ξανά.',

  'role.admin': 'Διαχειριστής', 'role.staff': 'Χειριστής', 'role.viewer': 'Μόνο προβολή',
  'status.active': 'Ενεργό', 'status.inactive': 'Ανενεργό',

  'dash.morning': 'Καλημέρα', 'dash.afternoon': 'Καλό απόγευμα', 'dash.evening': 'Καλησπέρα',
  'dash.subtitle': 'Επισκόπηση μελών και συνδρομών για το {year}.', 'dash.members': 'Ενεργά μέλη', 'dash.of_total': 'από {n} συνολικά',
  'dash.outstanding': 'Ανεξόφλητα', 'dash.owing_members': '{n} μέλη με οφειλή', 'dash.collected': 'Εισπράξεις {year}',
  'dash.of_charged': 'από {amount} χρεώσεις', 'dash.pending': 'Προς επιβεβαίωση', 'dash.recent_payments': 'Πρόσφατες πληρωμές',
  'dash.no_payments': 'Δεν υπάρχουν πληρωμές ακόμη.',

  'member.new': 'Νέο μέλος', 'member.edit': 'Επεξεργασία μέλους', 'member.search': 'Αναζήτηση ονόματος, αριθμού, τηλεφώνου…',
  'member.count': '{n} μέλη', 'member.no_results': 'Δεν βρέθηκαν μέλη.', 'member.empty': 'Δεν υπάρχουν μέλη ακόμη. Προσθέστε το πρώτο ή κάντε μαζική εισαγωγή.',
  'member.all_types': 'Όλες οι κατηγορίες', 'member.name': 'Ονοματεπώνυμο', 'member.first_name': 'Όνομα', 'member.last_name': 'Επώνυμο',
  'member.father_name': 'Πατρώνυμο', 'member.no': 'Αριθμός μητρώου', 'member.no_short': 'Α/Μ', 'member.auto': 'Αυτόματα',
  'member.phone': 'Τηλέφωνο', 'member.email': 'Email', 'member.address': 'Διεύθυνση', 'member.city': 'Πόλη',
  'member.postal_code': 'Τ.Κ.', 'member.id_number': 'Αρ. ταυτότητας', 'member.birth_date': 'Ημ. γέννησης',
  'member.join_date': 'Ημ. εγγραφής', 'member.type': 'Κατηγορία', 'member.status': 'Κατάσταση', 'member.notes': 'Σημειώσεις',
  'member.photo': 'Φωτογραφία', 'member.photo_hint': 'Εμφανίζεται στο προφίλ και στην επαλήθευση QR.',
  'member.details': 'Στοιχεία', 'member.delete': 'Διαγραφή μέλους', 'member.delete_confirm': 'Οριστική διαγραφή του μέλους «{name}» και όλων των κινήσεών του;',
  'member.deleted': 'Το μέλος διαγράφηκε',

  'sort.name': 'Αλφαβητικά', 'sort.no': 'Αριθμός μητρώου', 'sort.recent': 'Πιο πρόσφατα', 'sort.balance': 'Μεγαλύτερη οφειλή',

  'bal.balance': 'Υπόλοιπο', 'bal.owed': 'Οφειλή', 'bal.credit': 'Πίστωση', 'bal.cr': 'πίστ.', 'bal.settled': 'Εξοφλημένο',
  'bal.good_standing': 'Ταμειακά εντάξει', 'bal.outstanding_hint': 'Υπάρχει ανεξόφλητο υπόλοιπο',

  'card.title': 'Κάρτα μέλους', 'card.title_plural': 'Κάρτες μελών', 'card.member': 'Μέλος', 'card.no': '№', 'card.since': 'Μέλος από',
  'card.print_a4': 'Εκτύπωση σε A4', 'card.print_a4_hint': '10 κάρτες ανά σελίδα με σημάδια κοπής',
  'card.print_cr80': 'Εκτυπωτής καρτών', 'card.print_cr80_hint': 'Μέγεθος πιστωτικής κάρτας (CR80)',
  'card.pdf_share_hint': 'PDF σε μέγεθος κάρτας για Viber, WhatsApp, email', 'card.pdf_a4': 'Λήψη PDF (A4)', 'card.pdf_a4_hint': 'Φύλλο A4 έτοιμο για τυπογραφείο',
  'card.link': 'Ψηφιακή κάρτα', 'card.link_hint': 'Σύνδεσμος που ανοίγει την κάρτα στο κινητό του μέλους',
  'card.regen': 'Νέο QR', 'card.regen_confirm': 'Δημιουργία νέου QR; Η παλιά κάρτα δεν θα αναγνωρίζεται πλέον.', 'card.regen_done': 'Δημιουργήθηκε νέο QR',
  'card.eyebrow': 'Εκτύπωση', 'card.batch_title': 'Μαζική έκδοση καρτών', 'card.batch_text': 'Επιλέξτε μέλη και εκτυπώστε ή κατεβάστε τις κάρτες τους σε PDF.',
  'card.batch_hint': 'Εκτύπωση πολλών καρτών μαζί', 'card.print_selected': 'Κάρτες επιλεγμένων', 'card.selected': '{n} επιλεγμένα',

  'tx.initial': 'Αρχικό υπόλοιπο', 'tx.annual': 'Συνδρομή', 'tx.charge': 'Χρέωση', 'tx.payment': 'Πληρωμή', 'tx.credit': 'Πίστωση',
  'tx.type': 'Είδος', 'tx.date': 'Ημερομηνία', 'tx.description': 'Περιγραφή', 'tx.amount': 'Ποσό', 'tx.method': 'Τρόπος πληρωμής',
  'tx.reference': 'Αιτιολογία / Αρ. συναλλαγής', 'tx.status': 'Κατάσταση', 'tx.history': 'Ιστορικό κινήσεων', 'tx.none': 'Δεν υπάρχουν κινήσεις.',
  'tx.charge_col': 'Χρέωση', 'tx.payment_col': 'Πληρωμή', 'tx.balance_col': 'Υπόλοιπο', 'tx.add_charge': 'Χρέωση / Πίστωση',
  'tx.charge_placeholder': 'π.χ. Εκδρομή, Εκδήλωση…', 'tx.void': 'Ακύρωση', 'tx.void_confirm': 'Ακύρωση της κίνησης; Δεν θα μετράει στο υπόλοιπο.',
  'tx.voided': 'Η κίνηση ακυρώθηκε', 'tx.show_void': 'Ακυρωμένες ({n})', 'tx.search': 'Αναζήτηση μέλους ή αιτιολογίας…',
  'tx.all_types': 'Όλα τα είδη', 'tx.all_statuses': 'Όλες οι καταστάσεις', 'tx.hint': 'Όλες οι χρεώσεις και πληρωμές',
  'txstatus.confirmed': 'Επιβεβαιωμένη', 'txstatus.pending': 'Εκκρεμεί', 'txstatus.void': 'Ακυρωμένη',
  'method.cash': 'Μετρητά', 'method.bank': 'Τράπεζα', 'method.card': 'Κάρτα', 'method.other': 'Άλλο',

  'pay.record': 'Καταχώριση πληρωμής', 'pay.member': 'Μέλος', 'pay.full_balance': 'Ολόκληρο',
  'pay.reference_placeholder': 'π.χ. αρ. κατάθεσης', 'pay.description_placeholder': 'π.χ. Συνδρομή 2026',
  'pay.confirm_now': 'Άμεση επιβεβαίωση', 'pay.confirm_now_hint': 'Η πληρωμή μετράει αμέσως και εκδίδεται απόδειξη.',
  'pay.will_be_pending': 'Η πληρωμή θα καταχωριστεί ως εκκρεμής μέχρι να την επιβεβαιώσει διαχειριστής.',
  'pay.save': 'Καταχώριση', 'pay.success_confirmed': 'Η πληρωμή επιβεβαιώθηκε — απόδειξη #{no}.', 'pay.success_pending': 'Η πληρωμή καταχωρίστηκε και αναμένει επιβεβαίωση.',
  'pay.receipt_share': 'Απόδειξη', 'pay.next_scan': 'Επόμενη σάρωση', 'pay.pending_title': 'Προς επιβεβαίωση',
  'pay.pending_hint_admin': 'Ελέγξτε τις πληρωμές (π.χ. στο τραπεζικό σας λογαριασμό) και επιβεβαιώστε τις. Μόνο οι επιβεβαιωμένες μειώνουν την οφειλή.',
  'pay.pending_hint_staff': 'Οι πληρωμές που καταχωρείτε επιβεβαιώνονται από διαχειριστή.',
  'pay.no_pending': 'Καμία εκκρεμής πληρωμή. Όλα εντάξει!', 'pay.recent': 'Πρόσφατα επιβεβαιωμένες', 'pay.confirm': 'Επιβεβαίωση',
  'pay.reject': 'Απόρριψη', 'pay.reject_confirm': 'Απόρριψη της πληρωμής;', 'pay.rejected': 'Η πληρωμή απορρίφθηκε',
  'pay.confirmed': 'Η πληρωμή επιβεβαιώθηκε', 'pay.confirmed_n': 'Επιβεβαιώθηκαν {n} πληρωμές', 'pay.confirm_selected': 'Επιβεβαίωση',
  'pay.confirm_bulk': 'Επιβεβαίωση {n} πληρωμών;', 'pay.pending_amount': '{amount} σε εκκρεμότητα',

  'scan.starting': 'Εκκίνηση κάμερας…', 'scan.point': 'Στρέψτε την κάμερα στο QR της κάρτας',
  'scan.denied': 'Δεν επιτράπηκε η πρόσβαση στην κάμερα. Χρησιμοποιήστε την αναζήτηση αριθμού.', 'scan.no_camera': 'Η συσκευή δεν υποστηρίζει κάμερα.',
  'scan.manual': 'Ή πληκτρολογήστε αριθμό μητρώου', 'scan.manual_placeholder': 'π.χ. 125', 'scan.open': 'Προφίλ μέλους', 'scan.owes': 'Οφειλή {amount}',

  'debits.eyebrow': 'Ετήσια διαδικασία', 'debits.title': 'Χρέωση συνδρομής έτους',
  'debits.text': 'Χρεώνει με ένα κλικ την ετήσια συνδρομή σε όλα τα ενεργά μέλη, ανά κατηγορία. Μέλη που έχουν ήδη χρεωθεί για το έτος παραλείπονται αυτόματα.',
  'debits.hint': 'Συνδρομή έτους σε όλα τα μέλη', 'debits.year': 'Έτος', 'debits.amounts': 'Ποσό ανά κατηγορία',
  'debits.no_type': 'Χωρίς κατηγορία', 'debits.no_type_hint': 'Μέλη χωρίς κατηγορία', 'debits.only_joined': 'Μόνο όσοι είχαν εγγραφεί έως το έτος',
  'debits.only_joined_hint': 'Δεν χρεώνονται μέλη με μεταγενέστερη ημ. εγγραφής.', 'debits.run': 'Εκτέλεση χρέωσης',
  'debits.default_desc': 'Συνδρομή {year}', 'debits.eligible': 'Μέλη', 'debits.already': 'Ήδη', 'debits.to_charge': 'Χρέωση', 'debits.total': 'Σύνολο',
  'debits.summary': 'Θα χρεωθούν', 'debits.no_members': 'Δεν υπάρχουν ενεργά μέλη.', 'debits.history': 'Ιστορικό χρεώσεων',
  'debits.none': 'Δεν έχει γίνει ακόμη ετήσια χρέωση.', 'debits.run_meta': 'Έτος {year} · {n} μέλη · {date}',
  'debits.confirm': 'Χρέωση {n} μελών με σύνολο {total} για το {year};', 'debits.done': 'Χρεώθηκαν {n} μέλη, σύνολο {total}',
  'debits.undo': 'Αναίρεση', 'debits.undo_confirm': 'Αναίρεση της χρέωσης; Θα διαγραφούν όλες οι χρεώσεις αυτής της εκτέλεσης.', 'debits.undone': 'Η χρέωση αναιρέθηκε',

  'initial.eyebrow': 'Μετάβαση', 'initial.title': 'Αρχικά υπόλοιπα',
  'initial.text': 'Καταχωρίστε το υπόλοιπο κάθε μέλους κατά την έναρξη χρήσης. Θετικό ποσό = οφειλή, αρνητικό (με −) = πίστωση/προπληρωμή.',
  'initial.hint': 'Υπόλοιπα έναρξης ανά μέλος', 'initial.date': 'Ημερομηνία υπολοίπου', 'initial.default_desc': 'Υπόλοιπο έναρξης',
  'initial.amount': 'Αρχικό υπόλοιπο', 'initial.form_hint': 'Θετικό = οφειλή, αρνητικό = πίστωση.', 'initial.changed': '{n} αλλαγές',
  'initial.saved': 'Αποθηκεύτηκαν {n} υπόλοιπα',

  'import.eyebrow': 'CSV', 'import.title': 'Μαζική εισαγωγή μελών',
  'import.text': 'Ανεβάστε αρχείο CSV (π.χ. από Excel: «Αποθήκευση ως CSV»). Οι στήλες αναγνωρίζονται αυτόματα και μπορείτε να τις διορθώσετε πριν την εισαγωγή.',
  'import.hint': 'Εισαγωγή από αρχείο CSV', 'import.template': 'Πρότυπο αρχείο', 'import.drop': 'Επιλέξτε αρχείο CSV',
  'import.drop_hint': 'Διαχωριστικό ; ή , — κωδικοποίηση UTF-8 ή Windows Greek', 'import.empty_file': 'Το αρχείο δεν περιέχει γραμμές.',
  'import.mapping': 'Αντιστοίχιση στηλών', 'import.mapping_hint': 'Ελέγξτε ότι κάθε στήλη αντιστοιχεί στο σωστό πεδίο. Προεπισκόπηση των πρώτων 5 γραμμών.',
  'import.rows': '{n} γραμμές', 'import.ignore': '— Παράλειψη —', 'import.existing': 'Αν ο αριθμός μητρώου υπάρχει ήδη',
  'import.skip': 'Παράλειψη', 'import.update': 'Ενημέρωση στοιχείων', 'import.balance_hint': 'Η στήλη «Αρχικό υπόλοιπο» (π.χ. 30,00) δημιουργεί ή αντικαθιστά το υπόλοιπο έναρξης.',
  'import.run': 'Εισαγωγή {n} γραμμών', 'import.need_names': 'Αντιστοιχίστε τουλάχιστον Όνομα και Επώνυμο.', 'import.done': 'Η εισαγωγή ολοκληρώθηκε',
  'import.summary': 'Νέα: {created} · Ενημερώθηκαν: {updated} · Παραλείφθηκαν: {skipped}', 'import.errors': '{n} προειδοποιήσεις', 'import.row': 'Γραμμή {n}',

  'field.member_no': 'Αριθμός μητρώου', 'field.last_name': 'Επώνυμο', 'field.first_name': 'Όνομα', 'field.father_name': 'Πατρώνυμο',
  'field.phone': 'Τηλέφωνο', 'field.email': 'Email', 'field.address': 'Διεύθυνση', 'field.city': 'Πόλη', 'field.postal_code': 'Τ.Κ.',
  'field.birth_date': 'Ημ. γέννησης', 'field.id_number': 'Αρ. ταυτότητας', 'field.join_date': 'Ημ. εγγραφής', 'field.membership_type': 'Κατηγορία',
  'field.status': 'Κατάσταση', 'field.notes': 'Σημειώσεις', 'field.initial_balance': 'Αρχικό υπόλοιπο',

  'reports.eyebrow': 'Αναφορά', 'reports.text': 'Συνολική εικόνα χρεώσεων, πληρωμών και υπολοίπων όλων των μελών. Εξαγωγή σε PDF, Excel ή CSV και αποστολή.',
  'reports.hint': 'Υπόλοιπα όλων των μελών', 'report.only_owing': 'Με οφειλή', 'report.only_credit': 'Με πίστωση', 'report.only_settled': 'Εξοφλημένα',

  'range.month': 'Αυτός ο μήνας', 'range.year': 'Έτος {year}', 'range.all': 'Όλη η περίοδος', 'range.from': 'Από', 'range.to': 'Έως',

  'doc.statement': 'Καρτέλα μέλους', 'doc.receipt': 'Απόδειξη είσπραξης', 'doc.balances': 'Υπόλοιπα μελών', 'doc.transactions': 'Κινήσεις',
  'doc.roster': 'Μητρώο μελών', 'doc.generated': 'Εκδόθηκε', 'doc.total_charged': 'Χρεώσεις', 'doc.total_paid': 'Πληρωμές',
  'doc.pending': 'Σε εκκρεμότητα', 'doc.total_outstanding': 'Σύνολο οφειλών', 'doc.members_count': 'Μέλη', 'doc.count': 'Κινήσεις',
  'doc.total_charges': 'Σύνολο χρεώσεων', 'doc.total_payments': 'Σύνολο πληρωμών', 'doc.amount_received': 'Ποσό είσπραξης',
  'doc.balance_now': 'Τρέχον υπόλοιπο', 'doc.receipt_thanks': 'Σας ευχαριστούμε για τη στήριξή σας.',
  'doc.receipt_pending': 'Η πληρωμή αναμένει επιβεβαίωση.',

  'share.print': 'Εκτύπωση', 'share.print_hint': 'Εκτυπωτής ή «Αποθήκευση ως PDF»', 'share.pdf': 'Λήψη PDF', 'share.pdf_hint': 'Αποθήκευση αρχείου PDF στη συσκευή',
  'share.pdf_share': 'Αποστολή PDF', 'share.pdf_share_hint': 'Viber, WhatsApp, email, Messenger…', 'share.link': 'Σύνδεσμος', 'share.link_hint': 'Ασφαλής σύνδεσμος προβολής χωρίς σύνδεση',
  'share.xlsx': 'Excel (XLSX)', 'share.xlsx_hint': 'Για επεξεργασία σε Excel', 'share.csv': 'CSV (;)', 'share.csv_hint': 'Διαχωριστικό ερωτηματικό',
  'share.copied': 'Αντιγράφηκε', 'share.downloaded': 'Το αρχείο αποθηκεύτηκε', 'share.link_expiry': 'Ο σύνδεσμος ισχύει για 30 ημέρες.',
  'share.valid_until': 'Ο σύνδεσμος ισχύει έως {date}',

  'settings.org': 'Φορέας', 'settings.types': 'Κατηγορίες', 'settings.users': 'Χρήστες', 'settings.account': 'Ο λογαριασμός μου',
  'settings.hint': 'Φορέας, κατηγορίες, χρήστες', 'settings.name': 'Επωνυμία', 'settings.website': 'Ιστοσελίδα', 'settings.tax_id': 'ΑΦΜ',
  'settings.currency': 'Νόμισμα', 'settings.default_lang': 'Προεπιλεγμένη γλώσσα', 'settings.color': 'Χρώμα κάρτας',
  'settings.card_note': 'Σημείωση κάρτας', 'settings.card_note_placeholder': 'π.χ. Ισχύει με ταυτότητα', 'settings.logo': 'Λογότυπο',
  'settings.logo_hint': 'PNG με διάφανο φόντο για καλύτερο αποτέλεσμα.', 'settings.types_hint': 'Η ετήσια συνδρομή κάθε κατηγορίας προτείνεται στην ετήσια χρέωση.',
  'settings.per_year': 'ανά έτος', 'settings.new_type': 'Νέα κατηγορία', 'settings.edit_type': 'Επεξεργασία κατηγορίας', 'settings.type_name': 'Όνομα κατηγορίας',
  'settings.annual_fee': 'Ετήσια συνδρομή', 'settings.delete_type_confirm': 'Διαγραφή κατηγορίας; Τα μέλη θα μείνουν χωρίς κατηγορία.',
  'settings.roles_hint': 'Διαχειριστής: πλήρης πρόσβαση. Χειριστής: μέλη και καταχώριση πληρωμών (προς επιβεβαίωση). Μόνο προβολή: ανάγνωση.',
  'settings.new_user': 'Νέος χρήστης', 'settings.full_name': 'Ονοματεπώνυμο', 'settings.role': 'Ρόλος', 'settings.new_password': 'Νέο συνθηματικό',
  'settings.keep_password': 'Κενό = χωρίς αλλαγή', 'settings.delete_user_confirm': 'Διαγραφή χρήστη «{name}»;', 'settings.change_password': 'Αλλαγή συνθηματικού',
  'settings.current_password': 'Τρέχον συνθηματικό', 'settings.repeat_password': 'Επανάληψη συνθηματικού', 'settings.password_changed': 'Το συνθηματικό άλλαξε',
  'settings.login_link': 'Σύνδεσμος εισόδου', 'settings.login_link_hint': 'Μοιραστείτε τον με τους συνεργάτες σας — ανοίγει απευθείας τη σελίδα σύνδεσης του φορέα.',

  'verify.title': 'Επαλήθευση μέλους', 'verify.valid': 'Ενεργό μέλος', 'verify.inactive': 'Ανενεργό μέλος', 'verify.dues': 'Εκκρεμεί συνδρομή',
  'verify.save_hint': 'Συμβουλή: προσθέστε αυτή τη σελίδα στην αρχική οθόνη για να έχετε την κάρτα σας πάντα μαζί.',

  'admin.title': 'Διαχείριση πλατφόρμας', 'admin.hero': 'Πίνακας ελέγχου φορέων', 'admin.hero_text': 'Δημιουργία φορέων, λογαριασμών και συνδέσμων πρόσβασης.',
  'admin.tenants': 'Φορείς', 'admin.tenants_text': 'Κάθε φορέας έχει δικό του μητρώο, χρήστες και σύνδεσμο εισόδου.',
  'admin.new_tenant': 'Νέος φορέας', 'admin.search': 'Αναζήτηση φορέα…', 'admin.no_tenants': 'Δεν υπάρχουν φορείς ακόμη.',
  'admin.key_hint': 'Πεζά λατινικά, αριθμοί, παύλα (3–40). Χρησιμοποιείται στο ?soc=', 'admin.key_change_hint': 'Η αλλαγή ακυρώνει τον παλιό σύνδεσμο.',
  'admin.admin_username': 'Χρήστης διαχειριστή', 'admin.generate': 'Δημιουργία', 'admin.password_note': 'Σημειώστε το συνθηματικό· δεν θα εμφανιστεί ξανά.',
  'admin.create': 'Δημιουργία φορέα', 'admin.created': 'Ο φορέας δημιουργήθηκε', 'admin.created_text': 'Στείλτε στον φορέα τον σύνδεσμο και τα στοιχεία εισόδου.',
  'admin.tenant_link': 'Σύνδεσμος φορέα', 'admin.open_link': 'Άνοιγμα', 'admin.copy_all': 'Αντιγραφή όλων', 'admin.active': 'Ενεργός φορέας',
  'admin.active_hint': 'Ανενεργός φορέας δεν μπορεί να συνδεθεί.', 'admin.stats': '{m} μέλη · {u} χρήστες', 'admin.credentials': 'Στοιχεία εισόδου',
  'admin.credentials_hint': 'Ορίστε νέο συνθηματικό για υπάρχοντα χρήστη ή δημιουργήστε νέο διαχειριστή.', 'admin.credentials_saved': 'Τα στοιχεία αποθηκεύτηκαν',
  'admin.delete_title': 'Διαγραφή φορέα', 'admin.delete_text': 'Θα διαγραφεί οριστικά ο φορέας «{name}» με {m} μέλη και όλες τις κινήσεις.',
  'admin.delete_type_key': 'Πληκτρολογήστε «{key}» για επιβεβαίωση', 'admin.deleted': 'Ο φορέας διαγράφηκε',

  'err.error': 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.', 'err.network_error': 'Δεν υπάρχει σύνδεση στο διαδίκτυο.',
  'err.invalid_credentials': 'Λάθος στοιχεία εισόδου.', 'err.too_many_attempts': 'Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε σε 15 λεπτά.',
  'err.tenant_inactive': 'Ο λογαριασμός του φορέα είναι ανενεργός.', 'err.tenant_not_found': 'Ο φορέας δεν βρέθηκε. Ελέγξτε τον σύνδεσμο.',
  'err.unauthorized': 'Απαιτείται σύνδεση.', 'err.forbidden': 'Δεν έχετε δικαίωμα για αυτή την ενέργεια.', 'err.not_found': 'Δεν βρέθηκε.',
  'err.name_required': 'Συμπληρώστε όνομα και επώνυμο.', 'err.invalid_amount': 'Μη έγκυρο ποσό.', 'err.invalid_date': 'Μη έγκυρη ημερομηνία.',
  'err.invalid_input': 'Ελέγξτε τα στοιχεία.', 'err.member_no_taken': 'Ο αριθμός μητρώου χρησιμοποιείται ήδη.', 'err.member_not_found': 'Το μέλος δεν βρέθηκε.',
  'err.invalid_tenant_key': 'Μη έγκυρος κωδικός φορέα (πεζά λατινικά, αριθμοί, παύλα).', 'err.tenant_key_taken': 'Ο κωδικός φορέα χρησιμοποιείται ήδη.',
  'err.password_too_short': 'Το συνθηματικό πρέπει να έχει τουλάχιστον 8 χαρακτήρες.', 'err.username_required': 'Συμπληρώστε όνομα χρήστη.',
  'err.username_taken': 'Το όνομα χρήστη υπάρχει ήδη.', 'err.wrong_password': 'Λάθος τρέχον συνθηματικό.', 'err.passwords_differ': 'Τα συνθηματικά δεν ταιριάζουν.',
  'err.confirm_key_mismatch': 'Ο κωδικός επιβεβαίωσης δεν ταιριάζει.', 'err.nothing_to_charge': 'Δεν υπάρχουν μέλη προς χρέωση.', 'err.invalid_year': 'Μη έγκυρο έτος.',
  'err.invalid_photo': 'Μη έγκυρη εικόνα.', 'err.invalid_logo': 'Μη έγκυρο ή πολύ μεγάλο λογότυπο.', 'err.cannot_delete_self': 'Δεν μπορείτε να διαγράψετε τον εαυτό σας.',
  'err.link_expired': 'Ο σύνδεσμος έληξε ή δεν είναι έγκυρος.', 'err.server_misconfigured': 'Η υπηρεσία δεν έχει ρυθμιστεί σωστά.',
  'err.server_error': 'Σφάλμα διακομιστή. Δοκιμάστε ξανά.', 'err.invalid_membership_type': 'Μη έγκυρη κατηγορία.',
};

const en = {
  'app.name': 'Members',
  'suggest.button': 'Suggestion / Question', 'suggest.title': 'Send us a suggestion', 'suggest.text': 'Pick whichever channel suits you — we reply quickly.',
  'suggest.message': 'Hello! A suggestion for Members ({org}): ',
  'lang.el': 'Ελληνικά', 'lang.en': 'English', 'lang.fr': 'Français',

  'common.add': 'Add', 'common.all': 'All', 'common.all_statuses': 'All statuses', 'common.back': 'Back', 'common.cancel': 'Cancel',
  'common.change': 'Change', 'common.close': 'Close', 'common.confirm': 'Confirm', 'common.created_by': 'Created by',
  'common.delete': 'Delete', 'common.done': 'Done', 'common.edit': 'Edit', 'common.export': 'Export', 'common.language': 'Language',
  'common.load_more': 'Load more', 'common.ok': 'OK', 'common.remove': 'Remove', 'common.save': 'Save', 'common.saved': 'Saved',
  'common.select': 'Select', 'common.select_all': 'Select all', 'common.sort': 'Sort', 'common.view_all': 'View all',

  'nav.home': 'Home', 'nav.members': 'Members', 'nav.scan': 'Scan', 'nav.payments': 'Payments', 'nav.more': 'Menu',
  'nav.transactions': 'Transactions', 'nav.reports': 'Balances', 'nav.debits': 'Annual dues', 'nav.initial': 'Opening balances',
  'nav.import': 'Bulk import', 'nav.cards': 'Member cards', 'nav.settings': 'Settings',

  'auth.eyebrow': 'Digital membership management', 'auth.hero_title': 'Your community, beautifully kept.',
  'auth.hero_text': 'Members, dues, QR cards and receipts — all in one place, on mobile or desktop.',
  'auth.members_area': 'Management area', 'auth.welcome_to': 'Welcome to', 'auth.tenant_key': 'Organisation key',
  'auth.username': 'Username', 'auth.password': 'Password', 'auth.show_password': 'Show password', 'auth.login': 'Sign in',
  'auth.logout': 'Sign out', 'auth.fill_all': 'Please fill in all fields.', 'auth.expired': 'Your session expired. Please sign in again.',

  'role.admin': 'Administrator', 'role.staff': 'Operator', 'role.viewer': 'View only',
  'status.active': 'Active', 'status.inactive': 'Inactive',

  'dash.morning': 'Good morning', 'dash.afternoon': 'Good afternoon', 'dash.evening': 'Good evening',
  'dash.subtitle': 'Overview of members and dues for {year}.', 'dash.members': 'Active members', 'dash.of_total': 'of {n} in total',
  'dash.outstanding': 'Outstanding', 'dash.owing_members': '{n} members owe', 'dash.collected': 'Collected {year}',
  'dash.of_charged': 'of {amount} charged', 'dash.pending': 'Awaiting confirmation', 'dash.recent_payments': 'Recent payments',
  'dash.no_payments': 'No payments yet.',

  'member.new': 'New member', 'member.edit': 'Edit member', 'member.search': 'Search name, number, phone…', 'member.count': '{n} members',
  'member.no_results': 'No members found.', 'member.empty': 'No members yet. Add the first one or use bulk import.',
  'member.all_types': 'All categories', 'member.name': 'Full name', 'member.first_name': 'First name', 'member.last_name': 'Last name',
  'member.father_name': "Father's name", 'member.no': 'Member number', 'member.no_short': 'No.', 'member.auto': 'Automatic',
  'member.phone': 'Phone', 'member.email': 'Email', 'member.address': 'Address', 'member.city': 'City', 'member.postal_code': 'Postcode',
  'member.id_number': 'ID number', 'member.birth_date': 'Date of birth', 'member.join_date': 'Joined', 'member.type': 'Category',
  'member.status': 'Status', 'member.notes': 'Notes', 'member.photo': 'Photo', 'member.photo_hint': 'Shown on the profile and QR verification.',
  'member.details': 'Details', 'member.delete': 'Delete member', 'member.delete_confirm': 'Permanently delete “{name}” and all their transactions?',
  'member.deleted': 'Member deleted',

  'sort.name': 'Alphabetical', 'sort.no': 'Member number', 'sort.recent': 'Most recent', 'sort.balance': 'Highest balance',

  'bal.balance': 'Balance', 'bal.owed': 'Owed', 'bal.credit': 'Credit', 'bal.cr': 'cr.', 'bal.settled': 'Settled',
  'bal.good_standing': 'In good standing', 'bal.outstanding_hint': 'There is an outstanding balance',

  'card.title': 'Member card', 'card.title_plural': 'Member cards', 'card.member': 'Member', 'card.no': 'No.', 'card.since': 'Member since',
  'card.print_a4': 'Print on A4', 'card.print_a4_hint': '10 cards per page with crop marks', 'card.print_cr80': 'Card printer',
  'card.print_cr80_hint': 'Credit-card size (CR80)', 'card.pdf_share_hint': 'Card-size PDF for Viber, WhatsApp, email',
  'card.pdf_a4': 'Download PDF (A4)', 'card.pdf_a4_hint': 'A4 sheet ready for a print shop', 'card.link': 'Digital card',
  'card.link_hint': "Link that opens the card on the member's phone", 'card.regen': 'New QR',
  'card.regen_confirm': 'Generate a new QR? The old card will no longer be recognised.', 'card.regen_done': 'New QR generated',
  'card.eyebrow': 'Printing', 'card.batch_title': 'Batch card issuing', 'card.batch_text': 'Select members and print or download their cards as PDF.',
  'card.batch_hint': 'Print many cards at once', 'card.print_selected': 'Cards for selected', 'card.selected': '{n} selected',

  'tx.initial': 'Opening balance', 'tx.annual': 'Annual dues', 'tx.charge': 'Charge', 'tx.payment': 'Payment', 'tx.credit': 'Credit',
  'tx.type': 'Type', 'tx.date': 'Date', 'tx.description': 'Description', 'tx.amount': 'Amount', 'tx.method': 'Payment method',
  'tx.reference': 'Reference', 'tx.status': 'Status', 'tx.history': 'Transaction history', 'tx.none': 'No transactions.',
  'tx.charge_col': 'Charge', 'tx.payment_col': 'Payment', 'tx.balance_col': 'Balance', 'tx.add_charge': 'Charge / Credit',
  'tx.charge_placeholder': 'e.g. Trip, Event…', 'tx.void': 'Void', 'tx.void_confirm': 'Void this transaction? It will no longer count towards the balance.',
  'tx.voided': 'Transaction voided', 'tx.show_void': 'Voided ({n})', 'tx.search': 'Search member or reference…',
  'tx.all_types': 'All types', 'tx.all_statuses': 'All statuses', 'tx.hint': 'Every charge and payment',
  'txstatus.confirmed': 'Confirmed', 'txstatus.pending': 'Pending', 'txstatus.void': 'Void',
  'method.cash': 'Cash', 'method.bank': 'Bank', 'method.card': 'Card', 'method.other': 'Other',

  'pay.record': 'Record payment', 'pay.member': 'Member', 'pay.full_balance': 'Full',
  'pay.reference_placeholder': 'e.g. transfer ref.', 'pay.description_placeholder': 'e.g. 2026 dues',
  'pay.confirm_now': 'Confirm immediately', 'pay.confirm_now_hint': 'The payment counts right away and a receipt is issued.',
  'pay.will_be_pending': 'The payment will be recorded as pending until an administrator confirms it.',
  'pay.save': 'Record', 'pay.success_confirmed': 'Payment confirmed — receipt #{no}.', 'pay.success_pending': 'Payment recorded and awaiting confirmation.',
  'pay.receipt_share': 'Receipt', 'pay.next_scan': 'Scan next', 'pay.pending_title': 'Awaiting confirmation',
  'pay.pending_hint_admin': 'Check the payments (e.g. against your bank account) and confirm them. Only confirmed payments reduce the balance.',
  'pay.pending_hint_staff': 'Payments you record are confirmed by an administrator.',
  'pay.no_pending': 'No pending payments. All clear!', 'pay.recent': 'Recently confirmed', 'pay.confirm': 'Confirm',
  'pay.reject': 'Reject', 'pay.reject_confirm': 'Reject this payment?', 'pay.rejected': 'Payment rejected', 'pay.confirmed': 'Payment confirmed',
  'pay.confirmed_n': '{n} payments confirmed', 'pay.confirm_selected': 'Confirm', 'pay.confirm_bulk': 'Confirm {n} payments?',
  'pay.pending_amount': '{amount} pending',

  'scan.starting': 'Starting camera…', 'scan.point': "Point the camera at the card's QR code",
  'scan.denied': 'Camera access was denied. Use the number search instead.', 'scan.no_camera': 'This device has no camera support.',
  'scan.manual': 'Or type a member number', 'scan.manual_placeholder': 'e.g. 125', 'scan.open': 'Member profile', 'scan.owes': 'Owes {amount}',

  'debits.eyebrow': 'Yearly process', 'debits.title': 'Charge annual dues',
  'debits.text': 'Charge the yearly dues to every active member in one click, per category. Members already charged for the year are skipped automatically.',
  'debits.hint': 'Yearly dues for all members', 'debits.year': 'Year', 'debits.amounts': 'Amount per category',
  'debits.no_type': 'No category', 'debits.no_type_hint': 'Members without a category', 'debits.only_joined': 'Only members who joined by that year',
  'debits.only_joined_hint': 'Members with a later join date are not charged.', 'debits.run': 'Run charge', 'debits.default_desc': 'Dues {year}',
  'debits.eligible': 'Members', 'debits.already': 'Already', 'debits.to_charge': 'To charge', 'debits.total': 'Total', 'debits.summary': 'Will be charged',
  'debits.no_members': 'No active members.', 'debits.history': 'Charge history', 'debits.none': 'No annual charge has been run yet.',
  'debits.run_meta': 'Year {year} · {n} members · {date}', 'debits.confirm': 'Charge {n} members a total of {total} for {year}?',
  'debits.done': '{n} members charged, total {total}', 'debits.undo': 'Undo', 'debits.undo_confirm': 'Undo this run? All of its charges will be deleted.',
  'debits.undone': 'Charge run undone',

  'initial.eyebrow': 'Migration', 'initial.title': 'Opening balances',
  'initial.text': 'Enter each member’s balance as of the start. Positive = owed, negative (with −) = credit/prepaid.',
  'initial.hint': 'Starting balance per member', 'initial.date': 'Balance date', 'initial.default_desc': 'Opening balance',
  'initial.amount': 'Opening balance', 'initial.form_hint': 'Positive = owed, negative = credit.', 'initial.changed': '{n} changes',
  'initial.saved': '{n} balances saved',

  'import.eyebrow': 'CSV', 'import.title': 'Bulk member import',
  'import.text': 'Upload a CSV file (e.g. from Excel: “Save as CSV”). Columns are detected automatically and you can adjust them before importing.',
  'import.hint': 'Import from a CSV file', 'import.template': 'Template file', 'import.drop': 'Choose a CSV file',
  'import.drop_hint': 'Separator ; or , — UTF-8 or Windows Greek encoding', 'import.empty_file': 'The file has no rows.',
  'import.mapping': 'Column mapping', 'import.mapping_hint': 'Check that each column maps to the right field. Preview of the first 5 rows.',
  'import.rows': '{n} rows', 'import.ignore': '— Skip —', 'import.existing': 'If the member number already exists',
  'import.skip': 'Skip', 'import.update': 'Update details', 'import.balance_hint': 'The “Opening balance” column (e.g. 30.00) creates or replaces the opening balance.',
  'import.run': 'Import {n} rows', 'import.need_names': 'Map at least First name and Last name.', 'import.done': 'Import complete',
  'import.summary': 'New: {created} · Updated: {updated} · Skipped: {skipped}', 'import.errors': '{n} warnings', 'import.row': 'Row {n}',

  'field.member_no': 'Member number', 'field.last_name': 'Last name', 'field.first_name': 'First name', 'field.father_name': "Father's name",
  'field.phone': 'Phone', 'field.email': 'Email', 'field.address': 'Address', 'field.city': 'City', 'field.postal_code': 'Postcode',
  'field.birth_date': 'Date of birth', 'field.id_number': 'ID number', 'field.join_date': 'Join date', 'field.membership_type': 'Category',
  'field.status': 'Status', 'field.notes': 'Notes', 'field.initial_balance': 'Opening balance',

  'reports.eyebrow': 'Report', 'reports.text': 'The full picture of charges, payments and balances for every member. Export to PDF, Excel or CSV and share.',
  'reports.hint': 'Balances of all members', 'report.only_owing': 'Owing', 'report.only_credit': 'In credit', 'report.only_settled': 'Settled',

  'range.month': 'This month', 'range.year': 'Year {year}', 'range.all': 'All time', 'range.from': 'From', 'range.to': 'To',

  'doc.statement': 'Member statement', 'doc.receipt': 'Payment receipt', 'doc.balances': 'Member balances', 'doc.transactions': 'Transactions',
  'doc.roster': 'Member register', 'doc.generated': 'Issued', 'doc.total_charged': 'Charges', 'doc.total_paid': 'Payments', 'doc.pending': 'Pending',
  'doc.total_outstanding': 'Total outstanding', 'doc.members_count': 'Members', 'doc.count': 'Transactions', 'doc.total_charges': 'Total charges',
  'doc.total_payments': 'Total payments', 'doc.amount_received': 'Amount received', 'doc.balance_now': 'Current balance',
  'doc.receipt_thanks': 'Thank you for your support.', 'doc.receipt_pending': 'This payment is awaiting confirmation.',

  'share.print': 'Print', 'share.print_hint': 'Printer or “Save as PDF”', 'share.pdf': 'Download PDF', 'share.pdf_hint': 'Save the PDF to this device',
  'share.pdf_share': 'Send PDF', 'share.pdf_share_hint': 'Viber, WhatsApp, email, Messenger…', 'share.link': 'Link', 'share.link_hint': 'Secure view-only link, no login needed',
  'share.xlsx': 'Excel (XLSX)', 'share.xlsx_hint': 'For editing in Excel', 'share.csv': 'CSV (;)', 'share.csv_hint': 'Semicolon separated',
  'share.copied': 'Copied', 'share.downloaded': 'File saved', 'share.link_expiry': 'The link is valid for 30 days.', 'share.valid_until': 'Link valid until {date}',

  'settings.org': 'Organisation', 'settings.types': 'Categories', 'settings.users': 'Users', 'settings.account': 'My account',
  'settings.hint': 'Organisation, categories, users', 'settings.name': 'Name', 'settings.website': 'Website', 'settings.tax_id': 'Tax ID',
  'settings.currency': 'Currency', 'settings.default_lang': 'Default language', 'settings.color': 'Card colour', 'settings.card_note': 'Card note',
  'settings.card_note_placeholder': 'e.g. Valid with ID', 'settings.logo': 'Logo', 'settings.logo_hint': 'A PNG with transparent background works best.',
  'settings.types_hint': 'Each category’s annual fee is suggested when charging annual dues.', 'settings.per_year': 'per year',
  'settings.new_type': 'New category', 'settings.edit_type': 'Edit category', 'settings.type_name': 'Category name', 'settings.annual_fee': 'Annual fee',
  'settings.delete_type_confirm': 'Delete this category? Its members will have no category.',
  'settings.roles_hint': 'Administrator: full access. Operator: members and recording payments (to be confirmed). View only: read access.',
  'settings.new_user': 'New user', 'settings.full_name': 'Full name', 'settings.role': 'Role', 'settings.new_password': 'New password',
  'settings.keep_password': 'Empty = unchanged', 'settings.delete_user_confirm': 'Delete user “{name}”?', 'settings.change_password': 'Change password',
  'settings.current_password': 'Current password', 'settings.repeat_password': 'Repeat password', 'settings.password_changed': 'Password changed',
  'settings.login_link': 'Sign-in link', 'settings.login_link_hint': "Share it with your team — it opens your organisation's sign-in page directly.",

  'verify.title': 'Member verification', 'verify.valid': 'Active member', 'verify.inactive': 'Inactive member', 'verify.dues': 'Dues outstanding',
  'verify.save_hint': 'Tip: add this page to your home screen to always have your card with you.',

  'admin.title': 'Platform administration', 'admin.hero': 'Organisation control panel', 'admin.hero_text': 'Create organisations, accounts and access links.',
  'admin.tenants': 'Organisations', 'admin.tenants_text': 'Each organisation has its own register, users and sign-in link.',
  'admin.new_tenant': 'New organisation', 'admin.search': 'Search organisation…', 'admin.no_tenants': 'No organisations yet.',
  'admin.key_hint': 'Lowercase letters, digits, dash (3–40). Used in ?soc=', 'admin.key_change_hint': 'Changing it invalidates the old link.',
  'admin.admin_username': 'Admin username', 'admin.generate': 'Generate', 'admin.password_note': 'Note the password; it will not be shown again.',
  'admin.create': 'Create organisation', 'admin.created': 'Organisation created', 'admin.created_text': 'Send the organisation its link and sign-in details.',
  'admin.tenant_link': 'Organisation link', 'admin.open_link': 'Open', 'admin.copy_all': 'Copy all', 'admin.active': 'Active organisation',
  'admin.active_hint': 'An inactive organisation cannot sign in.', 'admin.stats': '{m} members · {u} users', 'admin.credentials': 'Sign-in details',
  'admin.credentials_hint': 'Set a new password for an existing user or create a new administrator.', 'admin.credentials_saved': 'Details saved',
  'admin.delete_title': 'Delete organisation', 'admin.delete_text': 'This permanently deletes “{name}” with {m} members and all transactions.',
  'admin.delete_type_key': 'Type “{key}” to confirm', 'admin.deleted': 'Organisation deleted',

  'err.error': 'Something went wrong. Please try again.', 'err.network_error': 'No internet connection.',
  'err.invalid_credentials': 'Incorrect sign-in details.', 'err.too_many_attempts': 'Too many failed attempts. Try again in 15 minutes.',
  'err.tenant_inactive': 'This organisation account is inactive.', 'err.tenant_not_found': 'Organisation not found. Check the link.',
  'err.unauthorized': 'Please sign in.', 'err.forbidden': 'You are not allowed to do this.', 'err.not_found': 'Not found.',
  'err.name_required': 'Enter first and last name.', 'err.invalid_amount': 'Invalid amount.', 'err.invalid_date': 'Invalid date.',
  'err.invalid_input': 'Please check the details.', 'err.member_no_taken': 'That member number is already in use.', 'err.member_not_found': 'Member not found.',
  'err.invalid_tenant_key': 'Invalid organisation key (lowercase letters, digits, dash).', 'err.tenant_key_taken': 'That organisation key is already in use.',
  'err.password_too_short': 'Password must be at least 8 characters.', 'err.username_required': 'Enter a username.',
  'err.username_taken': 'That username already exists.', 'err.wrong_password': 'Current password is incorrect.', 'err.passwords_differ': 'Passwords do not match.',
  'err.confirm_key_mismatch': 'The confirmation key does not match.', 'err.nothing_to_charge': 'There are no members to charge.', 'err.invalid_year': 'Invalid year.',
  'err.invalid_photo': 'Invalid image.', 'err.invalid_logo': 'Invalid or too large logo.', 'err.cannot_delete_self': 'You cannot delete yourself.',
  'err.link_expired': 'This link has expired or is invalid.', 'err.server_misconfigured': 'The service is not configured correctly.',
  'err.server_error': 'Server error. Please try again.', 'err.invalid_membership_type': 'Invalid category.',
};

const fr = {
  'app.name': 'Members',
  'suggest.button': 'Suggestion / Question', 'suggest.title': 'Envoyez-nous une suggestion', 'suggest.text': 'Choisissez le canal qui vous convient — nous répondons vite.',
  'suggest.message': 'Bonjour ! Une suggestion pour Members ({org}) : ',
  'lang.el': 'Ελληνικά', 'lang.en': 'English', 'lang.fr': 'Français',

  'common.add': 'Ajouter', 'common.all': 'Tous', 'common.all_statuses': 'Tous les statuts', 'common.back': 'Retour', 'common.cancel': 'Annuler',
  'common.change': 'Changer', 'common.close': 'Fermer', 'common.confirm': 'Confirmation', 'common.created_by': 'Created by',
  'common.delete': 'Supprimer', 'common.done': 'Terminé', 'common.edit': 'Modifier', 'common.export': 'Exporter', 'common.language': 'Langue',
  'common.load_more': 'Voir plus', 'common.ok': 'OK', 'common.remove': 'Retirer', 'common.save': 'Enregistrer', 'common.saved': 'Enregistré',
  'common.select': 'Sélectionner', 'common.select_all': 'Tout sélectionner', 'common.sort': 'Trier', 'common.view_all': 'Tout voir',

  'nav.home': 'Accueil', 'nav.members': 'Membres', 'nav.scan': 'Scanner', 'nav.payments': 'Paiements', 'nav.more': 'Menu',
  'nav.transactions': 'Opérations', 'nav.reports': 'Soldes', 'nav.debits': 'Cotisation annuelle', 'nav.initial': "Soldes d'ouverture",
  'nav.import': 'Import en masse', 'nav.cards': 'Cartes de membre', 'nav.settings': 'Paramètres',

  'auth.eyebrow': 'Gestion numérique des adhérents', 'auth.hero_title': 'Votre communauté, avec élégance.',
  'auth.hero_text': 'Membres, cotisations, cartes QR et reçus — au même endroit, sur mobile ou ordinateur.',
  'auth.members_area': 'Espace de gestion', 'auth.welcome_to': 'Bienvenue à', 'auth.tenant_key': "Code de l'organisation",
  'auth.username': "Nom d'utilisateur", 'auth.password': 'Mot de passe', 'auth.show_password': 'Afficher le mot de passe',
  'auth.login': 'Se connecter', 'auth.logout': 'Se déconnecter', 'auth.fill_all': 'Veuillez remplir tous les champs.',
  'auth.expired': 'Votre session a expiré. Reconnectez-vous.',

  'role.admin': 'Administrateur', 'role.staff': 'Opérateur', 'role.viewer': 'Lecture seule',
  'status.active': 'Actif', 'status.inactive': 'Inactif',

  'dash.morning': 'Bonjour', 'dash.afternoon': 'Bon après-midi', 'dash.evening': 'Bonsoir',
  'dash.subtitle': 'Vue d’ensemble des membres et cotisations {year}.', 'dash.members': 'Membres actifs', 'dash.of_total': 'sur {n} au total',
  'dash.outstanding': 'Impayés', 'dash.owing_members': '{n} membres débiteurs', 'dash.collected': 'Encaissé {year}',
  'dash.of_charged': 'sur {amount} facturés', 'dash.pending': 'À confirmer', 'dash.recent_payments': 'Paiements récents',
  'dash.no_payments': 'Aucun paiement pour le moment.',

  'member.new': 'Nouveau membre', 'member.edit': 'Modifier le membre', 'member.search': 'Rechercher nom, numéro, téléphone…',
  'member.count': '{n} membres', 'member.no_results': 'Aucun membre trouvé.', 'member.empty': 'Aucun membre. Ajoutez le premier ou importez une liste.',
  'member.all_types': 'Toutes les catégories', 'member.name': 'Nom complet', 'member.first_name': 'Prénom', 'member.last_name': 'Nom',
  'member.father_name': 'Nom du père', 'member.no': 'Numéro de membre', 'member.no_short': 'N°', 'member.auto': 'Automatique',
  'member.phone': 'Téléphone', 'member.email': 'E-mail', 'member.address': 'Adresse', 'member.city': 'Ville', 'member.postal_code': 'Code postal',
  'member.id_number': "N° pièce d'identité", 'member.birth_date': 'Date de naissance', 'member.join_date': "Date d'adhésion",
  'member.type': 'Catégorie', 'member.status': 'Statut', 'member.notes': 'Notes', 'member.photo': 'Photo',
  'member.photo_hint': 'Affichée sur le profil et lors de la vérification QR.', 'member.details': 'Coordonnées', 'member.delete': 'Supprimer le membre',
  'member.delete_confirm': 'Supprimer définitivement « {name} » et toutes ses opérations ?', 'member.deleted': 'Membre supprimé',

  'sort.name': 'Alphabétique', 'sort.no': 'Numéro de membre', 'sort.recent': 'Plus récents', 'sort.balance': 'Plus gros solde',

  'bal.balance': 'Solde', 'bal.owed': 'Dû', 'bal.credit': 'Crédit', 'bal.cr': 'créd.', 'bal.settled': 'Soldé',
  'bal.good_standing': 'À jour de cotisation', 'bal.outstanding_hint': 'Un solde reste dû',

  'card.title': 'Carte de membre', 'card.title_plural': 'Cartes de membre', 'card.member': 'Membre', 'card.no': 'N°', 'card.since': 'Membre depuis',
  'card.print_a4': 'Imprimer sur A4', 'card.print_a4_hint': '10 cartes par page avec traits de coupe', 'card.print_cr80': 'Imprimante à cartes',
  'card.print_cr80_hint': 'Format carte bancaire (CR80)', 'card.pdf_share_hint': 'PDF au format carte pour Viber, WhatsApp, e-mail',
  'card.pdf_a4': 'Télécharger PDF (A4)', 'card.pdf_a4_hint': 'Planche A4 prête pour l’imprimeur', 'card.link': 'Carte numérique',
  'card.link_hint': 'Lien qui ouvre la carte sur le téléphone du membre', 'card.regen': 'Nouveau QR',
  'card.regen_confirm': "Générer un nouveau QR ? L'ancienne carte ne sera plus reconnue.", 'card.regen_done': 'Nouveau QR généré',
  'card.eyebrow': 'Impression', 'card.batch_title': 'Émission de cartes en lot', 'card.batch_text': 'Sélectionnez des membres et imprimez ou téléchargez leurs cartes en PDF.',
  'card.batch_hint': 'Imprimer plusieurs cartes à la fois', 'card.print_selected': 'Cartes sélectionnées', 'card.selected': '{n} sélectionnés',

  'tx.initial': "Solde d'ouverture", 'tx.annual': 'Cotisation', 'tx.charge': 'Débit', 'tx.payment': 'Paiement', 'tx.credit': 'Avoir',
  'tx.type': 'Type', 'tx.date': 'Date', 'tx.description': 'Libellé', 'tx.amount': 'Montant', 'tx.method': 'Mode de paiement',
  'tx.reference': 'Référence', 'tx.status': 'Statut', 'tx.history': 'Historique des opérations', 'tx.none': 'Aucune opération.',
  'tx.charge_col': 'Débit', 'tx.payment_col': 'Paiement', 'tx.balance_col': 'Solde', 'tx.add_charge': 'Débit / Avoir',
  'tx.charge_placeholder': 'ex. Sortie, Événement…', 'tx.void': 'Annuler', 'tx.void_confirm': "Annuler cette opération ? Elle ne comptera plus dans le solde.",
  'tx.voided': 'Opération annulée', 'tx.show_void': 'Annulées ({n})', 'tx.search': 'Rechercher membre ou référence…',
  'tx.all_types': 'Tous les types', 'tx.all_statuses': 'Tous les statuts', 'tx.hint': 'Tous les débits et paiements',
  'txstatus.confirmed': 'Confirmé', 'txstatus.pending': 'En attente', 'txstatus.void': 'Annulé',
  'method.cash': 'Espèces', 'method.bank': 'Virement', 'method.card': 'Carte', 'method.other': 'Autre',

  'pay.record': 'Enregistrer un paiement', 'pay.member': 'Membre', 'pay.full_balance': 'Total',
  'pay.reference_placeholder': 'ex. réf. virement', 'pay.description_placeholder': 'ex. Cotisation 2026',
  'pay.confirm_now': 'Confirmer immédiatement', 'pay.confirm_now_hint': 'Le paiement compte tout de suite et un reçu est émis.',
  'pay.will_be_pending': 'Le paiement sera en attente jusqu’à sa confirmation par un administrateur.',
  'pay.save': 'Enregistrer', 'pay.success_confirmed': 'Paiement confirmé — reçu n° {no}.', 'pay.success_pending': 'Paiement enregistré, en attente de confirmation.',
  'pay.receipt_share': 'Reçu', 'pay.next_scan': 'Scanner suivant', 'pay.pending_title': 'À confirmer',
  'pay.pending_hint_admin': 'Vérifiez les paiements (ex. sur votre relevé bancaire) puis confirmez-les. Seuls les paiements confirmés réduisent le solde.',
  'pay.pending_hint_staff': 'Les paiements que vous saisissez sont confirmés par un administrateur.',
  'pay.no_pending': 'Aucun paiement en attente. Tout est en ordre !', 'pay.recent': 'Récemment confirmés', 'pay.confirm': 'Confirmer',
  'pay.reject': 'Rejeter', 'pay.reject_confirm': 'Rejeter ce paiement ?', 'pay.rejected': 'Paiement rejeté', 'pay.confirmed': 'Paiement confirmé',
  'pay.confirmed_n': '{n} paiements confirmés', 'pay.confirm_selected': 'Confirmer', 'pay.confirm_bulk': 'Confirmer {n} paiements ?',
  'pay.pending_amount': '{amount} en attente',

  'scan.starting': 'Démarrage de la caméra…', 'scan.point': 'Visez le QR code de la carte',
  'scan.denied': "L'accès à la caméra a été refusé. Utilisez la recherche par numéro.", 'scan.no_camera': "Cet appareil n'a pas de caméra compatible.",
  'scan.manual': 'Ou saisissez un numéro de membre', 'scan.manual_placeholder': 'ex. 125', 'scan.open': 'Profil du membre', 'scan.owes': 'Doit {amount}',

  'debits.eyebrow': 'Processus annuel', 'debits.title': 'Appel de cotisation annuelle',
  'debits.text': 'Débitez la cotisation annuelle de tous les membres actifs en un clic, par catégorie. Les membres déjà débités pour l’année sont ignorés automatiquement.',
  'debits.hint': 'Cotisation annuelle pour tous', 'debits.year': 'Année', 'debits.amounts': 'Montant par catégorie',
  'debits.no_type': 'Sans catégorie', 'debits.no_type_hint': 'Membres sans catégorie', 'debits.only_joined': "Seulement les membres inscrits avant ou pendant l'année",
  'debits.only_joined_hint': "Les membres inscrits plus tard ne sont pas débités.", 'debits.run': 'Lancer le débit', 'debits.default_desc': 'Cotisation {year}',
  'debits.eligible': 'Membres', 'debits.already': 'Déjà', 'debits.to_charge': 'À débiter', 'debits.total': 'Total', 'debits.summary': 'Seront débités',
  'debits.no_members': 'Aucun membre actif.', 'debits.history': 'Historique des appels', 'debits.none': "Aucun appel de cotisation n'a encore été lancé.",
  'debits.run_meta': 'Année {year} · {n} membres · {date}', 'debits.confirm': 'Débiter {n} membres pour un total de {total} ({year}) ?',
  'debits.done': '{n} membres débités, total {total}', 'debits.undo': 'Annuler', 'debits.undo_confirm': 'Annuler cet appel ? Tous ses débits seront supprimés.',
  'debits.undone': 'Appel annulé',

  'initial.eyebrow': 'Migration', 'initial.title': "Soldes d'ouverture",
  'initial.text': 'Saisissez le solde de chaque membre au démarrage. Positif = dû, négatif (avec −) = crédit/avance.',
  'initial.hint': 'Solde de départ par membre', 'initial.date': 'Date du solde', 'initial.default_desc': "Solde d'ouverture",
  'initial.amount': "Solde d'ouverture", 'initial.form_hint': 'Positif = dû, négatif = crédit.', 'initial.changed': '{n} modifications',
  'initial.saved': '{n} soldes enregistrés',

  'import.eyebrow': 'CSV', 'import.title': 'Import de membres en masse',
  'import.text': 'Importez un fichier CSV (ex. depuis Excel : « Enregistrer sous CSV »). Les colonnes sont détectées automatiquement et ajustables avant l’import.',
  'import.hint': 'Import depuis un fichier CSV', 'import.template': 'Fichier modèle', 'import.drop': 'Choisir un fichier CSV',
  'import.drop_hint': 'Séparateur ; ou , — encodage UTF-8 ou Windows grec', 'import.empty_file': 'Le fichier ne contient aucune ligne.',
  'import.mapping': 'Correspondance des colonnes', 'import.mapping_hint': 'Vérifiez que chaque colonne correspond au bon champ. Aperçu des 5 premières lignes.',
  'import.rows': '{n} lignes', 'import.ignore': '— Ignorer —', 'import.existing': 'Si le numéro de membre existe déjà',
  'import.skip': 'Ignorer', 'import.update': 'Mettre à jour', 'import.balance_hint': "La colonne « Solde d'ouverture » (ex. 30,00) crée ou remplace le solde d'ouverture.",
  'import.run': 'Importer {n} lignes', 'import.need_names': 'Associez au moins Prénom et Nom.', 'import.done': 'Import terminé',
  'import.summary': 'Nouveaux : {created} · Mis à jour : {updated} · Ignorés : {skipped}', 'import.errors': '{n} avertissements', 'import.row': 'Ligne {n}',

  'field.member_no': 'Numéro de membre', 'field.last_name': 'Nom', 'field.first_name': 'Prénom', 'field.father_name': 'Nom du père',
  'field.phone': 'Téléphone', 'field.email': 'E-mail', 'field.address': 'Adresse', 'field.city': 'Ville', 'field.postal_code': 'Code postal',
  'field.birth_date': 'Date de naissance', 'field.id_number': "Pièce d'identité", 'field.join_date': "Date d'adhésion", 'field.membership_type': 'Catégorie',
  'field.status': 'Statut', 'field.notes': 'Notes', 'field.initial_balance': "Solde d'ouverture",

  'reports.eyebrow': 'Rapport', 'reports.text': 'Vue complète des débits, paiements et soldes de tous les membres. Export PDF, Excel ou CSV et partage.',
  'reports.hint': 'Soldes de tous les membres', 'report.only_owing': 'Débiteurs', 'report.only_credit': 'Créditeurs', 'report.only_settled': 'Soldés',

  'range.month': 'Ce mois-ci', 'range.year': 'Année {year}', 'range.all': 'Toute la période', 'range.from': 'Du', 'range.to': 'Au',

  'doc.statement': 'Relevé de compte', 'doc.receipt': 'Reçu de paiement', 'doc.balances': 'Soldes des membres', 'doc.transactions': 'Opérations',
  'doc.roster': 'Registre des membres', 'doc.generated': 'Émis le', 'doc.total_charged': 'Débits', 'doc.total_paid': 'Paiements', 'doc.pending': 'En attente',
  'doc.total_outstanding': 'Total des impayés', 'doc.members_count': 'Membres', 'doc.count': 'Opérations', 'doc.total_charges': 'Total des débits',
  'doc.total_payments': 'Total des paiements', 'doc.amount_received': 'Montant reçu', 'doc.balance_now': 'Solde actuel',
  'doc.receipt_thanks': 'Merci pour votre soutien.', 'doc.receipt_pending': 'Ce paiement est en attente de confirmation.',

  'share.print': 'Imprimer', 'share.print_hint': 'Imprimante ou « Enregistrer en PDF »', 'share.pdf': 'Télécharger PDF', 'share.pdf_hint': 'Enregistrer le PDF sur l’appareil',
  'share.pdf_share': 'Envoyer le PDF', 'share.pdf_share_hint': 'Viber, WhatsApp, e-mail, Messenger…', 'share.link': 'Lien', 'share.link_hint': 'Lien sécurisé en lecture seule, sans connexion',
  'share.xlsx': 'Excel (XLSX)', 'share.xlsx_hint': 'Pour modifier dans Excel', 'share.csv': 'CSV (;)', 'share.csv_hint': 'Séparé par des points-virgules',
  'share.copied': 'Copié', 'share.downloaded': 'Fichier enregistré', 'share.link_expiry': 'Le lien est valable 30 jours.', 'share.valid_until': "Lien valable jusqu'au {date}",

  'settings.org': 'Organisation', 'settings.types': 'Catégories', 'settings.users': 'Utilisateurs', 'settings.account': 'Mon compte',
  'settings.hint': 'Organisation, catégories, utilisateurs', 'settings.name': 'Nom', 'settings.website': 'Site web', 'settings.tax_id': 'N° fiscal',
  'settings.currency': 'Devise', 'settings.default_lang': 'Langue par défaut', 'settings.color': 'Couleur de la carte', 'settings.card_note': 'Mention sur la carte',
  'settings.card_note_placeholder': "ex. Valable avec pièce d'identité", 'settings.logo': 'Logo', 'settings.logo_hint': 'Un PNG à fond transparent donne le meilleur résultat.',
  'settings.types_hint': 'La cotisation annuelle de chaque catégorie est proposée lors de l’appel annuel.', 'settings.per_year': 'par an',
  'settings.new_type': 'Nouvelle catégorie', 'settings.edit_type': 'Modifier la catégorie', 'settings.type_name': 'Nom de la catégorie', 'settings.annual_fee': 'Cotisation annuelle',
  'settings.delete_type_confirm': 'Supprimer cette catégorie ? Ses membres n’auront plus de catégorie.',
  'settings.roles_hint': 'Administrateur : accès complet. Opérateur : membres et saisie de paiements (à confirmer). Lecture seule : consultation.',
  'settings.new_user': 'Nouvel utilisateur', 'settings.full_name': 'Nom complet', 'settings.role': 'Rôle', 'settings.new_password': 'Nouveau mot de passe',
  'settings.keep_password': 'Vide = inchangé', 'settings.delete_user_confirm': "Supprimer l'utilisateur « {name} » ?", 'settings.change_password': 'Changer le mot de passe',
  'settings.current_password': 'Mot de passe actuel', 'settings.repeat_password': 'Répéter le mot de passe', 'settings.password_changed': 'Mot de passe modifié',
  'settings.login_link': 'Lien de connexion', 'settings.login_link_hint': 'Partagez-le avec votre équipe — il ouvre directement la page de connexion de votre organisation.',

  'verify.title': 'Vérification du membre', 'verify.valid': 'Membre actif', 'verify.inactive': 'Membre inactif', 'verify.dues': 'Cotisation due',
  'verify.save_hint': "Astuce : ajoutez cette page à votre écran d'accueil pour avoir toujours votre carte sur vous.",

  'admin.title': 'Administration de la plateforme', 'admin.hero': 'Panneau des organisations', 'admin.hero_text': "Créez des organisations, des comptes et des liens d'accès.",
  'admin.tenants': 'Organisations', 'admin.tenants_text': 'Chaque organisation dispose de son registre, de ses utilisateurs et de son lien de connexion.',
  'admin.new_tenant': 'Nouvelle organisation', 'admin.search': 'Rechercher une organisation…', 'admin.no_tenants': 'Aucune organisation.',
  'admin.key_hint': 'Minuscules, chiffres, tiret (3–40). Utilisé dans ?soc=', 'admin.key_change_hint': "Le changer invalide l'ancien lien.",
  'admin.admin_username': 'Utilisateur administrateur', 'admin.generate': 'Générer', 'admin.password_note': 'Notez le mot de passe ; il ne sera plus affiché.',
  'admin.create': "Créer l'organisation", 'admin.created': 'Organisation créée', 'admin.created_text': "Envoyez à l'organisation son lien et ses identifiants.",
  'admin.tenant_link': "Lien de l'organisation", 'admin.open_link': 'Ouvrir', 'admin.copy_all': 'Tout copier', 'admin.active': 'Organisation active',
  'admin.active_hint': 'Une organisation inactive ne peut pas se connecter.', 'admin.stats': '{m} membres · {u} utilisateurs', 'admin.credentials': 'Identifiants',
  'admin.credentials_hint': 'Définissez un nouveau mot de passe pour un utilisateur existant ou créez un administrateur.', 'admin.credentials_saved': 'Identifiants enregistrés',
  'admin.delete_title': "Supprimer l'organisation", 'admin.delete_text': 'Ceci supprime définitivement « {name} », ses {m} membres et toutes les opérations.',
  'admin.delete_type_key': 'Saisissez « {key} » pour confirmer', 'admin.deleted': 'Organisation supprimée',

  'err.error': 'Une erreur est survenue. Réessayez.', 'err.network_error': 'Pas de connexion Internet.',
  'err.invalid_credentials': 'Identifiants incorrects.', 'err.too_many_attempts': 'Trop de tentatives échouées. Réessayez dans 15 minutes.',
  'err.tenant_inactive': "Le compte de l'organisation est inactif.", 'err.tenant_not_found': 'Organisation introuvable. Vérifiez le lien.',
  'err.unauthorized': 'Veuillez vous connecter.', 'err.forbidden': "Vous n'êtes pas autorisé à faire cela.", 'err.not_found': 'Introuvable.',
  'err.name_required': 'Saisissez le prénom et le nom.', 'err.invalid_amount': 'Montant invalide.', 'err.invalid_date': 'Date invalide.',
  'err.invalid_input': 'Vérifiez les informations.', 'err.member_no_taken': 'Ce numéro de membre est déjà utilisé.', 'err.member_not_found': 'Membre introuvable.',
  'err.invalid_tenant_key': "Code d'organisation invalide (minuscules, chiffres, tiret).", 'err.tenant_key_taken': "Ce code d'organisation est déjà utilisé.",
  'err.password_too_short': 'Le mot de passe doit comporter au moins 8 caractères.', 'err.username_required': "Saisissez un nom d'utilisateur.",
  'err.username_taken': "Ce nom d'utilisateur existe déjà.", 'err.wrong_password': 'Mot de passe actuel incorrect.', 'err.passwords_differ': 'Les mots de passe ne correspondent pas.',
  'err.confirm_key_mismatch': 'Le code de confirmation ne correspond pas.', 'err.nothing_to_charge': 'Aucun membre à débiter.', 'err.invalid_year': 'Année invalide.',
  'err.invalid_photo': 'Image invalide.', 'err.invalid_logo': 'Logo invalide ou trop volumineux.', 'err.cannot_delete_self': 'Vous ne pouvez pas vous supprimer.',
  'err.link_expired': 'Ce lien a expiré ou est invalide.', 'err.server_misconfigured': "Le service n'est pas correctement configuré.",
  'err.server_error': 'Erreur serveur. Réessayez.', 'err.invalid_membership_type': 'Catégorie invalide.',
};

const DICTS = { el, en, fr };
let current = 'el';

export function initLang() {
  let l = null;
  try {
    l = localStorage.getItem('lang');
  } catch { /* storage unavailable */ }
  const qs = new URLSearchParams(location.search).get('lang');
  if (qs && LANGS.includes(qs)) l = qs;
  current = LANGS.includes(l) ? l : 'el';
  document.documentElement.lang = current;
}

export function setLang(l, persist = true) {
  if (!LANGS.includes(l)) return;
  current = l;
  document.documentElement.lang = l;
  if (persist) {
    try {
      localStorage.setItem('lang', l);
    } catch { /* ignore */ }
  }
}

export const getLang = () => current;

export function t(key, vars) {
  let s = DICTS[current][key] ?? DICTS.el[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

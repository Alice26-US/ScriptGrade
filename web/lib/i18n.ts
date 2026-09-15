export type Locale = "EN" | "FR";

const KEY = "scriptgrade_locale";

export function getLocale(): Locale {
  if (typeof window === "undefined") return "EN";
  return window.localStorage.getItem(KEY) === "FR" ? "FR" : "EN";
}

export function setLocale(locale: Locale) {
  window.localStorage.setItem(KEY, locale);
  window.location.reload();
}

const en = {
  app: "ScriptGrade",
  tagline: "Handwritten exercises. Lecturer has the final mark.",
  login: "Log in",
  register: "Register",
  logout: "Log out",
  matricule: "Student ID (matricule)",
  password: "Password",
  email: "Email",
  identifier: "Matricule or email",
  submit: "Submit",
  dashboard: "Dashboard",
  exercises: "Exercises",
  import: "CSV import",
  newExercise: "New exercise",
  publish: "Publish",
  capture: "Capture pages",
  notSubmitted: "Not submitted until the server confirms every page.",
  submitted: "Submitted successfully",
  syncing: "Uploading / syncing…",
  interrupted: "Upload interrupted. Pages are saved on this device and will continue when you are online.",
  mark: "Mark",
  startReview: "Start review",
  release: "Release to student",
  finalize: "Finalize grade",
  returnScript: "Return for resubmission",
  applyProposal: "Apply AI proposal (still editable)",
  similarity: "Similarity flags (not proof)",
  spelling: "Spelling",
  dismiss: "Dismiss (not a student error)",
  confirm: "Confirm error",
};

const fr: typeof en = {
  app: "ScriptGrade",
  tagline: "Exercices manuscrits. L'enseignant décide de la note finale.",
  login: "Connexion",
  register: "Inscription",
  logout: "Déconnexion",
  matricule: "Matricule",
  password: "Mot de passe",
  email: "E-mail",
  identifier: "Matricule ou e-mail",
  submit: "Soumettre",
  dashboard: "Tableau de bord",
  exercises: "Exercices",
  import: "Import CSV",
  newExercise: "Nouvel exercice",
  publish: "Publier",
  capture: "Photographier les pages",
  notSubmitted: "Ce n'est soumis que lorsque le serveur a confirmé toutes les pages.",
  submitted: "Soumis avec succès",
  syncing: "Téléversement / synchronisation…",
  interrupted: "Téléversement interrompu. Les pages sont enregistrées sur cet appareil et reprendront en ligne.",
  mark: "Corriger",
  startReview: "Commencer la correction",
  release: "Publier à l'étudiant",
  finalize: "Finaliser la note",
  returnScript: "Renvoyer pour nouvelle soumission",
  applyProposal: "Appliquer la proposition IA (modifiable)",
  similarity: "Alertes de similarité (pas une preuve)",
  spelling: "Orthographe",
  dismiss: "Ignorer (pas une faute de l'étudiant)",
  confirm: "Confirmer la faute",
};

export function t(): typeof en {
  return getLocale() === "FR" ? fr : en;
}

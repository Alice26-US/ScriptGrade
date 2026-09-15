const RAW = `
le la les un une des de du au aux et à a en dans que qui dont où
je tu il elle nous vous ils elles on me te se moi toi lui
mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs
ce cet cette ces ceci cela
ne pas plus jamais rien personne aucun
être suis es est sommes êtes sont été étions
avoir ai as avons avez ont avait avaient eu
faire fais fait faisons faites font faisait
aller vais va allons allez vont allé
pouvoir peux peut pouvons pouvez peuvent pu
devoir dois doit devons devez doivent dû
vouloir veux veut voulons voulez veulent voulu
falloir faut
dire dis dit disent dit
voir vois voit voyons voyez voient vu
savoir sais sait savons savez savent su
venir viens vient venons venez viennent venu
prendre prends prend prenons prenez prennent pris
mettre mets met mettons mettez mettent mis
donner donne donnons donnez donnent donné
parler parle parlons parlez parlent parlé
aimer aime aimons aimez aiment aimé
penser pense pensons pensez pensent pensé
trouver trouve trouvons trouvez trouvent trouvé
croire crois croit croyons croyez croient cru
demander demande demandons demandez demandent demandé
passer passe passons passez passent passé
rester reste restons restez restent resté
arriver arrive arrivons arrivez arrivent arrivé
partir pars part partons partez partent parti
vivre vis vit vivons vivez vivent vécu
écrire écris écrit écrivons écrivez écrivent écrit
lire lis lit lisons lisez lisent lu
étudier étudie étudions étudiez étudient étudié
comprendre comprends comprend comprenons comprenez comprennent compris
étudiant étudiants étudiante étudiantes université essai recherche écrire écriture manuscrit
page pages devoir exercice enseignant cours campus faculté département programme
technologie société entrepreneuriat connaissance actuel actuelle question questions général indépendant apprentissage pratique
argument arguments preuve preuves exemple exemples introduction conclusion structure organisation
comprendre compréhension sujet pertinence raisonnement commentaire grille orthographe langue grammaire
contenu analyse analyser discuter décrire expliquer évaluer comparer définir
important cependant donc de plus par ailleurs bien que parce que puisque pendant
entre parmi contre sans avec par pour dans sur sous
personne personnes gouvernement pays monde communauté économie économique social politique
éducation école collège étude études apprentissage enseignement enseignant
information données système systèmes ordinateur internet numérique en ligne médias
problème problèmes solution solutions résultat résultats cause causes effet effets
idée idées avis opinion opinions point points raison raisons
temps année années jour jours semaine semaines mois aujourd hui hier demain
travail travaux travailler travaillé emploi emplois
premier première second seconde dernier dernière suivant précédente
plusieurs beaucoup peu chaque tout tous toutes quelque quelques
nouveau nouvelle vieux jeune haut bas long courte grand petit
vrai faux juste possible impossible nécessaire
public privé local national international
développement développer développé
créer créé création
utiliser utilisé utile
inclure y compris
augmenter augmenté diminuer diminué
niveau niveaux partie parties domaine domaines
cas type types forme formes
nombre nombres quantité quantités
valeur valeurs qualité qualités
changer changement changements
besoin besoins
aider aide
montrer montré
devenir devenu
laisser laissé
garder gardé
appeler appelé
essayer essayé
demander demandé
sentir senti
sembler semblé
commencer commencé
finir fini
ouvrir ouvert
fermer fermé
lire lecture lecteur lecteurs
écrire écrivain écrivains
parler discours
écouter écoute
apprendre appris
enseigner enseigné
vouloir dire signification
croire croyance
considérer considéré
comprendre compris
souvenir souvenu
suivre suivi
permettre permis
exiger exigé
fournir fourni
soutenir soutenu
recevoir reçu
produire produit
offrir offert
attendre attendu
apparaître apparu
continuer continué
construire construit
mener mené
perdre perdu
payer payé
jouer joué
courir couru
bouger bougé
vivre vécu
arriver arrivé
apporter apporté
recherche article articles citation citations source sources référence références
bibliographie annexe conclusion conclusions
paragraphe paragraphes phrase phrases mot mots vocabulaire
écriture manuscrite caméra photo photographie numérisation téléverser soumettre soumission date limite
page pages original image images
français anglais bilingue campus filiale facultés
contrôle continu formatif pratique
très aussi alors ensuite maintenant ici là
comme comme ainsi afin selon parmi
`;

export const FR_WORDS = new Set(
  RAW.split(/\s+/).map((w) => w.toLowerCase()).filter(Boolean),
);

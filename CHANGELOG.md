# Journal des versions

Copie du journal intégré à l'application (**À propos → Journal des versions**).
La version faisant foi est celle du code.

## 1.0-public

Première version publiable, sous licence libre. Tout le vocabulaire du logiciel est désormais générique, libellés comme clés de données : les deux rappels de permanence s’appellent Rappel 1 et Rappel 2, la rubrique de comptage « Traitement en série », et le second identifiant d’une activité « Référence technique ». Rien dans l’application ne suppose plus un domaine d’activité particulier : ce qui est spécifique à un usage se configure, et s’importe depuis un fichier de configuration. Un fichier enregistré avant cette version se convertit une fois, avec l’outil fourni à part. La numérotation repart à 1.0 ; les versions précédentes, désormais suffixées -private, restent au journal.

## 3.39.0-private

Le logiciel passe sous licence libre : <b>GNU GPL v3 ou ultérieure</b>, au lieu de « tous droits réservés ». Vous pouvez le redistribuer et le modifier, à condition d’en faire autant pour vos versions. L’avis de licence figure en tête du fichier : celui-ci étant à la fois le programme et son code source complet, le recevoir suffit à disposer de la source.

## 3.38.0-private

Suivi de projet, désactivé par défaut : une activité devient un projet quand on l’active. Elle gagne une échéance qui ne se déplace pas sans motif — l’échéance d’origine reste affichée barrée, avec le nombre de reports et leur historique — et des jalons choisis parmi ses événements et ses tâches. L’avancement est calculé sur les jalons validés, jamais saisi. Nouvel onglet Projets, une ligne par projet, et un bloc « Projets à surveiller » sur l’écran du jour.

## 3.37.1-private

Correctif de texte : la fiche d’une activité sans événement annonçait qu’elle était signalée comme non pilotée, alors qu’une tâche en attente suffit à la piloter. Le message consulte désormais la règle au lieu de la réciter, et dit l’état réel de ce dossier-là. Deux autres textes parlaient encore de « date à venir » là où il s’agit d’un événement.

## 3.37.0-private

Fiche d’activité : les boutons d’ajout suivent désormais le titre de leur propre section, à gauche. « + Événement » n’est plus rejeté à droite, et « + Note » et « + Tâche » ne flottent plus dans une bande posée avant le titre « Notes liées ». Ce titre est maintenant affiché même sans aucune note.

## 3.36.1-private

Correctif interne : les champs de date et d’heure sont préparés au moment même où ils sont créés, et non plus par un rattrapage différé. La fenêtre « Choisir une date » affichait sa date par défaut au format interne.

## 3.36.0-private

L’onglet Données s’appelle désormais Options. Nouveau réglage : le format des dates et des heures. Un champ de date natif suit la langue du navigateur et non celle de l’application — sur un poste en anglais la saisie se lisait mm/jj/aaaa et 02:30 PM. Le mode « jj/mm/aaaa et 24 h » remplace ces champs par les nôtres, qui acceptent aussi la frappe rapide (121126, 14h30), tout en gardant le calendrier du navigateur derrière un bouton.

## 3.35.0-private

Une activité n'a plus une date unique mais une liste d'événements : visite, réunion, intervention… chacun avec son type, sa durée et son propre état (prévu, réalisé, annulé, reporté). Les activités déjà datées sont reprises en un premier événement, de type déduit de leur catégorie. Le planning, le prochain jour ouvré et le calendrier listent chaque événement ; un dossier est non piloté lorsqu'il n'a ni tâche en attente ni événement à venir non annulé. Les champs Date, Heure et Durée de la fiche affichent désormais l'événement de référence et ne se saisissent plus.

## 3.34.1-private

Correctif : le compte rendu du jour comptait les vérifications de permanence parmi les appels, et les déroulait une à une sous la mention « appelant non précisé ». Les appels ne comptent plus que de vrais appels ; les vérifications ont leur propre ligne, regroupées par intitulé.

## 3.34.0-private

Reporter une tâche et ouvrir sa note sont possibles depuis les trois écrans qui les listent : En attente, Prochain jour ouvré et Calendrier. La ligne d’échéance est désormais dessinée par une seule fonction.

## 3.33.0-private

Nouvel onglet Calendrier, entre Prochain jour ouvré et Activités : une grille mensuelle des rendez-vous datés et du nombre d’échéances par jour, et le détail de la journée choisie à côté.

## 3.32.0-private

Les vérifications de permanence s’exportent à part, avec l’écart depuis la précédente et la cadence attendue. L’export des appels ne contient plus que de vrais appels, et gagne la colonne Affaire.

## 3.31.0-private

Chaque tâche en attente porte un bouton Reporter : raccourcis 1J, 2J, 5J, 1S, 2S, 1M, ou une date au choix. Le trait des comptes rendus est raccourci à 38 cadratins, pour ne plus casser la mise en page des applications où ils sont recopiés.

## 3.30.1-private

Correctif d’impression : sur un portefeuille réel, la page « Charge et production » débordait d’une ligne et créait une page supplémentaire. Le rythme vertical du rapport est resserré, et un tableau ne se coupe plus jamais en deux.

## 3.30.0-private

Dossiers non pilotés : un dossier sans tâche en attente ni date à venir est signalé sur l’écran du jour et filtrable dans Activités. Le rapport PDF gagne une quatrième page, « Charge à venir » : jour par jour sur trois semaines, puis par semaine.

## 3.29.1-private

Correctif : ouvrir un dossier sans date proposait la date du jour, et un simple enregistrement le faisait atterrir dans le planning. Le champ reste vide tant que vous n’en mettez pas.

## 3.29.0-private

La vue Activités s’ouvre sur toutes les périodes et non plus sur « À venir ». Une note ou une tâche saisie dans une fiche sans être ajoutée ne se perd plus : l’enregistrement est bloqué, les autres sorties demandent confirmation.

## 3.28.0-private

La roue dentée d’un élément de la carte ouvre désormais tout l’élément : nom, durée, module et lien. On peut enfin renommer ce que « Parcourir un dossier » a baptisé d’après les fichiers.

## 3.27.0-private

Un module peut rendre la main lui-même (postMessage) et signaler qu’il a démarré. L’infobulle de fermeture ne promet plus Échap, qui ne fonctionne pas quand le focus est dans le module.

## 3.26.0-private

Chaque section de la carte dit quand elle est proposée : pause courte, pause longue, ou jamais — sur demande. Le temps disponible choisit la section au lieu de seulement filtrer. Les accompagnements ont leur bouton dans le bandeau, et un élément peut porter un lien.

## 3.25.0-private

La fenêtre d’un module affiche le temps de l’activité : décompte en haut à droite, puis, l’échéance passée, le dépassement en négatif et en rouge.

## 3.24.0-private

Modules de pause : un élément de la carte peut porter un fichier .html rangé dans un dossier voisin de l’application. Révéler la pause propose alors de le lancer, dans une fenêtre du pilotage.

## 3.23.0-private

Nouveau bloc « Passées sans trace » : les activités dont la date est passée sans qu’aucune note leur soit rattachée. Au retour d’une absence, rien ne passe inaperçu. Correctif : le pied des fenêtres sortait du cadre quand le contenu dépassait la hauteur de l’écran — la fenêtre borne désormais, et c’est son corps qui défile.

## 3.22.0-private

Le nom complet du logiciel devient le nom par défaut. La fenêtre « Action terminée » permet d’enchaîner : on y saisit la suite à donner et son échéance sans rouvrir la note.

## 3.21.0-private

Le modèle de catégories livré avec le code est désormais générique. La configuration propre à un usage s'importe depuis un fichier, hors du code.

## 3.20.0-private

À propos : bandeau d'en-tête reprenant l'animation d'ouverture, sur le nom du logiciel.

## 3.19.1-private

Correctif : le bouton Enregistrer était invisible sur le bandeau quand l'enregistrement automatique est actif.

## 3.19.0-private

À propos : fiche du logiciel, auteur, licence et journal des versions, déplacé depuis Données.

## 3.18.0-private

Permanence : champ Affaire à la saisie, relié au dossier quand la référence existe.

## 3.17.0-private

Bouton Compte rendu sur les fiches appel, note et activité. La permanence close indique la plage tenue, le temps cumulé et les appels.

## 3.16.3-private

Cristallisation : la réponse se lit même avec des guillemets courbes, ou collée avec la demande.

## 3.16.2-private

Import : un dossier déjà archivé n'est plus reproposé à l'archivage.

## 3.16.1-private

Idées : carte vivante — membranes de groupe, cristaux, couleurs des catégories, glisser et zoom.

## 3.16.0-private

Onglet Idées : capture, regroupement automatique par similarité, cristallisation par copier-coller, conversion en activité.

## 3.15.2-private

Correctif : en fenetre etroite, Aide et Pause restent groupes a droite.

## 3.15.1-private

Correctif : le bouton Aide etait invisible tant que l'aide n'avait pas ete ouverte une fois.

## 3.15.0-private

Aide integree : bouton Aide, touche F1 contextuelle, recherche, 14 rubriques.

## 3.14.0-private

Renommage en My Pilot Professional Edition. En-tete lisible en fenetre etroite. Ajout en liste dans une fenetre de l'application.

## 3.13.1-private

Nom d'application par defaut : My Pilot.

## 3.13.0-private

Planning du jour : « Noter » remplace « Clore » — compte rendu prefixe du motif, temps pre-rempli, statut au choix.

## 3.12.0-private

Note : traitement de l'action depuis la fiche. Permanence : entreprise et commune a la saisie. Correctif du rattachement perdu.

## 3.11.4-private

Rapport : trois pages equilibrees, le journal rejoint la production.

## 3.11.3-private

Rapport : avancement detaille en tete de page 3, plus de ligne orpheline.

## 3.11.2-private

Rapport : le temps trace passe en page 2 (charge), la page 1 ne deborde plus.

## 3.11.1-private

Impression : les longs tableaux se coupent entre deux lignes, plus de demi-page blanche.

## 3.11.0-private

Rapport : « Nature des affaires » et bloc separe pour le compteur et la permanence.

## 3.10.1-private

Rapport : chaque categorie indique ce qu'elle porte hors periode.

## 3.10.0-private

Rapport : section Prevention et reduction du risque a la place de la couverture territoriale ; categorie sans activite rendue visible.

## 3.9.1-private

Rapport : l'archivage rattache le dossier a sa periode ; couverture territoriale et jours ouvres corriges.

## 3.9.0-private

Archivage qualifie : un dossier traite compte parmi les affaires menees a terme, une sortie de perimetre est comptee a part.

## 3.8.1-private

Rubriques d'activite : ordre reglable par fleches, respecte partout.

## 3.8.0-private

Rapport : un dossier sans date de planification est rattache a la periode par sa derniere action ou ses notes.

## 3.7.2-private

Rapport : une categorie a statut unique n'est plus omise de l'avancement detaille.

## 3.7.1-private

Contacts : civilite dans un champ dedie, detectee a la saisie, a l'import et sur l'existant.

## 3.7.0-private

Les relations peuvent viser une organisation ; fiche organisation enrichie, graphe distinguant les formes.

## 3.6.2-private

Correctif : la recherche Contacts perdait le focus a chaque caractere.

## 3.6.1-private

En attente : filtre « Aujourd'hui » (echeances du jour et en retard) avec compteur permanent.

## 3.6.0-private

Detection des organisations et rattachement automatique des contacts ; nature du tiers par categorie.

## 3.5.0-private

Contacts : detection depuis les activites et les appels, graphe egocentre des relations.

## 3.4.0-private

Archivage des dossiers : sortie des vues courantes sans perte de notes, taches ni rattachements.

## 3.3.1-private

Import : un marqueur de realisation en colonne date retire la fiche du planning.

## 3.3.0-private

Import : cellule vide non destructrice, suppression proposee au cas par cas, dates non exploitables signalees.

## 3.2.5-private

Import Excel : le filtre gestionnaire non applique est signale et bloque l'application.

## 3.2.4-private

Correctif : la feuille de style de la 3.2.2 ecrasait les barres de « Ou passe le temps ».

## 3.2.3-private

Categorie inconnue au chargement : signalee au lieu d'etre rattachee en silence.

## 3.2.2-private

Correction des categories : choix de la destination lot par lot quand le statut ne la designe pas seul.

## 3.2.1-private

Rapport PDF : aplats conserves a l'impression, avancement ventile par categorie, listes plafonnees, pagination.

## 3.2.0-private

Rapport d'activite en PDF : trois pages, comparaison avec la periode precedente, sections redigees.

## 3.1.0-private

Rapport d'activite sur une periode, sans donnee nominative ni reference de dossier.

## 3.0.0-private

Module Contacts : fiches, organisations, relations typees, historique reconstitue, import et export CSV.

## 2.9.0-private

Rappels de permanence parametrables, trace des verifications dans le journal des appels, textes revus.

## 2.8.4-private

L'animation affiche toujours le nom, y compris au premier demarrage sur un poste.

## 2.8.3-private

Nom de poste modifiable en tete de fichier, et messages ne presentant plus le tampon comme une sauvegarde.

## 2.8.2-private

Au tout premier demarrage sur un poste, l'animation n'affiche plus de nom par defaut.

## 2.8.1-private

Navigateurs sans ecriture directe (Brave, Firefox) : etat signale dans le bandeau et rappel de sauvegarde.

## 2.8.0-private

Animation d'ouverture : le nom se compose depuis une suite de 0 et 1, desactivable dans Donnees.

## 2.7.1-private

Le chargement d'un fichier bascule directement sur la vue du jour.

## 2.7.0-private

Portabilite : demarrage verrouille sans fichier, aucune categorie imposee, blocs desactivables, nom et titre personnalisables.

## 2.6.2-private

Retrait du chargement automatique de fichiers .js : plus aucun fichier executable n'est lu au demarrage.

## 2.6.1-private

Robustesse : validation des fichiers importes avant chargement, cle de categorie assainie, plafond de taille.

## 2.6.0-private

Navigation entre note et activite, duree libre dans le journal, correction des creneaux du compteur.

## 2.5.1-private

Compte-rendu : le rattachement apparait dans la section A suivre, et les rubriques dans le journal.

## 2.5.0-private

Bloc En attente : filtre par horizon (1 a 3 semaines, 1 mois, tout), une semaine par defaut.

## 2.4.0-private

Depuis la fiche d'une activite : ajout direct d'une note ou d'une tache rattachee.

## 2.3.1-private

La date d'un point de vigilance devient une echeance : le point reste visible jusqu'a ce jour, et au-dela.

## 2.3.0-private

Marquer une action faite propose d'enregistrer une note de tracabilite sur le dossier concerne.

## 2.2.1-private

Correctif : code JavaScript affiche en haut de page, et champ d'avancement desormais pilote par la configuration.

## 2.2.0-private

Les appels de permanence sont consultables dans le journal, avec filtre et recherche.

## 2.1.0-private

Les comportements specifiques (import Excel, miroir de statut, apercu) sont pilotes par la configuration, non plus par la cle.

## 2.0.0-private

Categories d'activite entierement configurables : apparence, champs, statuts, import et export de configuration.

## 1.24.1-private

La duree d'une activite close est desormais comptee dans la repartition du temps.

## 1.24.0-private

Journal : recherche et filtre par categorie sur la liste de rattachement.

## 1.23.0-private

Les dossiers prennent l'Etat affaire comme statut, avec le cycle de vie complet.

## 1.22.1-private

Import : avertissement et protection des libelles modifies a la main.

## 1.22.0-private

Sous-ligne de contexte dans la liste, et regle de libelle a l'import.

## 1.21.2-private

Liste des activites a hauteur d'ecran avec en-tete fixe ; correction des dates invalides issues de l'import.

## 1.21.1-private

Import Excel limite aux lignes du gestionnaire configure.

## 1.21.0-private

Import Excel des dossiers avec detection des doublons par reference technique et apercu des differences.

## 1.20.1-private

Dossiers : champ Interlocuteur et liste de types alignee sur l'usage.

## 1.20.0-private

La categorie importee prend le libelle Dossier.

## 1.19.0-private

Report de pause a la duree choisie : 5, 15, 30 ou 60 minutes.

## 1.18.1-private

Le bloc des entrees datees devient Planning du jour, dans l'application comme dans le compte-rendu.

## 1.18.0-private

Compte-rendu etablissable a n'importe quelle date, exports CSV filtrables par periode.

## 1.17.0-private

Cycle de vie propre aux convocations et animations, tirage de pause plus varie.

## 1.16.1-private

Correctif : les listes de valeurs s'enregistrent des la sortie du champ, sans bouton de validation separe.

## 1.16.0-private

Duree par appel de permanence, imputee a la rubrique Permanence telephonique.

## 1.15.2-private

Permanence : champ telephone dans la saisie rapide, avec reconnaissance des numeros deja croises.

## 1.15.1-private

Correctif : les champs de saisie se vident bien apres l'ajout d'une note ou d'un point de vigilance.

## 1.15.0-private

Nouvelle categorie Transverse pour tout ce qui n'entre pas dans les trois autres.

## 1.14.1-private

Retrait de l'ancienne banniere de pause qui subsistait dans le bloc du compteur.

## 1.14.0-private

Les points de vigilance dont la date est passee ne disparaissent plus : ils restent affiches et signales comme depasses.

## 1.13.0-private

Un seul rappel de pause, avec compte a rebours dans le bandeau. Le minuteur lie aux sessions de comptage est supprime.

## 1.12.0-private

Rappel de pause regulier, independant du chronometre et de la cloture : la fenetre s'ouvre meme sans les utiliser.

## 1.11.1-private

Les propositions de pause ne peuvent plus echouer en silence : repli entre sections, avertissement si les sections cles sont vides, apercu a la demande, reglages reformules.

## 1.11.0-private

Fenetre de pause centree avec devoilement, creation des trois categories depuis Activites, origine du temps chronometre affichee.

## 1.10.0-private

La carte Pause est desormais enregistree avec les donnees : un seul fichier a lier le matin.

## 1.9.1-private

Correctifs : le temps impute sur les dossiers apparait dans la repartition, et lier le fichier de la carte ne peut plus l'ecraser.

## 1.9.0-private

Rubriques d'activite : rattachement des notes hors dossier, imputation en un clic, repartition du temps.

## 1.8.3-private

Nouveau logo : dossier et engrenage, en remplacement de la croix.

## 1.8.1-private

Correctif important : lier un fichier ne peut plus l'écraser. Ouverture et création sont désormais distinctes.

## 1.8.0-private

Les chantiers deviennent des dossiers : renommage de la catégorie dans toute l'interface.

## 1.7.0-private

Icône d'onglet et logo, qui passent au rouge quand un rappel de permanence se déclenche.

## 1.6.0-private

Permanence d'assistance téléphonique : journal d'appels, rappels périodiques réglables, alerte sonore et visuelle.

## 1.5.0-private

Pauses proposées à la clôture d'une activité, marquage des activités éprouvantes, suggestions calibrées sur le temps disponible.

## 1.4.0-private

Carte personnelle « Pause » dans son propre fichier, suggestions au fil des sessions de comptage.

## 1.3.0-private

Convocations et animations : trois catégories d'activité, filtres, comptes-rendus et exports distincts.

## 1.2.0-private

Chronomètre de session de comptage, cadence calculée sur le temps réellement travaillé, versionnage de l'application.

## 1.1.0-private

Points de vigilance du jour, comptage de traitement, enregistrement automatique du fichier, listes déroulantes modifiables.

## 1.0.0-private

Dossiers du jour et prochain jour ouvré, journal de notes, suites à donner, imports et exports.

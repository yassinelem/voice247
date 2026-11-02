# Discord Voice 24/7

Garde un compte Discord connecté en permanence dans un salon vocal, avec reconnexion automatique.

## Fonctionnalités

- Connexion 24/7 dans un salon vocal (`selfMute` + `selfDeaf`).
- Retour automatique si le compte est déplacé, déconnecté ou expulsé du salon.
- Watchdog toutes les 60 s pour vérifier la connexion vocale.
- Service systemd : redémarrage après crash et au reboot du serveur.

> ⚠️ Utiliser un token de **compte** pour automatiser est interdit par les ToS Discord : le compte peut être désactivé. Utilise un compte secondaire et n'expose jamais le token.

## Structure

```
index.js                        # code principal
package.json / package-lock.json
.env.example                    # modèle (sans secret)
deploy/voice247.service         # unité systemd
deploy/install.sh               # installation Node + deps + service
.github/workflows/deploy.yml    # déploiement via GitHub Actions
```

## Configuration

Copie `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Puis renseigne :

```env
TOKEN=ton_token_de_compte
CHANNEL_ID=id_du_salon_vocal
# Optionnel :
GUILD_ID=id_du_serveur
```

- `TOKEN` : token du compte (ne jamais committer).
- `CHANNEL_ID` : ID du salon vocal (mode développeur Discord → clic droit → Copier l'identifiant).
- `GUILD_ID` : facultatif, déduit du salon si absent.

## Lancer en local

```bash
npm install
npm start
```

## Déploiement sur Google Cloud (e2-micro gratuit)

1. Créer un projet GCP, activer la facturation et une alerte budget à 1 $.
2. Créer une VM `e2-micro`, région `us-central1` / `us-west1` / `us-east1`, Ubuntu 24.04, disque standard 30 Go, IP éphémère.
3. Se connecter en SSH (bouton SSH de la console).
4. Copier le projet dans `~/bot` (voir ci-dessous) et lancer :

```bash
cd ~/bot
bash deploy/install.sh
sudo journalctl -u voice247 -f
```

## Déploiement automatique via GitHub Actions

Le workflow `.github/workflows/deploy.yml` déploie à chaque push sur `main` (ou manuellement via **Actions → Deploy → Run workflow**). Il envoie les fichiers sur la VM, écrit `.env` depuis les secrets, installe et redémarre le service.

### 1. Créer le dépôt privé et pousser le code

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<TON_USER>/discord-voice-247.git
git push -u origin main
```

Le fichier `.env` est ignoré par `.gitignore` : il ne sera jamais envoyé.

### 2. Ajouter les secrets

Dépôt → **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Obligatoire | Valeur |
|---|---|---|
| `SSH_HOST` | oui | IP publique de la VM |
| `SSH_USER` | oui | utilisateur SSH (ex. celui affiché par `whoami`) |
| `SSH_PRIVATE_KEY` | oui | clé privée SSH (contenu complet, ligne `BEGIN ... PRIVATE KEY`) |
| `SSH_PORT` | non | port SSH (défaut 22) |
| `TOKEN` | oui | token du compte Discord |
| `CHANNEL_ID` | oui | ID du salon vocal |
| `GUILD_ID` | non | ID du serveur |

Prérequis sur la VM : l'utilisateur SSH doit avoir `sudo` sans mot de passe (par défaut sur les images Ubuntu de GCP).

### 3. Déclencher

Pousse un commit sur `main` ou lance le workflow manuellement. Suivi : onglet **Actions**.

## Déploiement manuel (sans Actions)

```bash
# depuis ta machine
scp -r index.js package.json package-lock.json deploy README.md <user>@<ip>:~/bot/

# sur la VM
cd ~/bot
nano .env   # TOKEN + CHANNEL_ID
chmod 600 .env
bash deploy/install.sh
```

## Commandes utiles

```bash
sudo systemctl status voice247
sudo systemctl restart voice247
sudo systemctl stop voice247
sudo journalctl -u voice247 -f
sudo journalctl -u voice247 -n 100 --no-pager
```

Mise à jour : `git pull` (ou nouveau déploiement), `npm install --omit=dev`, `sudo systemctl restart voice247`.

## Sécurité

- `.env` est ignoré par git (`node_modules/`, `.env`, `.env.*`).
- Les secrets de déploiement sont stockés dans GitHub Actions, jamais dans le code.
- En cas de fuite du token : change le mot de passe Discord et déconnecte toutes les sessions.

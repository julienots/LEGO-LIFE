# LEGO POWERS

Jeu 3D avec mes propres minifigs LEGO. Prototype v0.1 : un seul personnage (le Jor-El de ma collection,
avec ses auras de pouvoir rouges aux mains et aux pieds) qu'on déplace dans un monde ouvert.

## Télécharger
APK Android : [`dist/lego-powers.apk`](dist/lego-powers.apk) — l'installer sur le téléphone (autoriser « sources inconnues »).

## Contrôles
- Pouce gauche : joystick pour marcher
- Glisser à droite : tourner la caméra
- Bouton SAUT (en l'air, il lève les bras)
- PC : ZQSD / WASD / flèches, Espace, molette pour zoomer (ouvrir `web/index.html`)

## Structure
- `web/` : le jeu (Three.js), lancé dans une WebView
- `android/` : coquille Android (manifest, activité en smali, icône)
- `build-apk.sh` : construit l'APK sans SDK Android (apktool + uber-apk-signer)

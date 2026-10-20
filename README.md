# LEGO POWERS

Jeu 3D avec mes propres minifigs LEGO. Prototype v0.2 : écran de choix des persos, puis on se déplace dans un monde ouvert.

Persos :
- **Jor-El** : armure or, cape marron, auras de pouvoir rouges aux mains et aux pieds
- **Cyborg** : robot à capuche, armure blanche/bleue/orange, aura de glace dans la main droite

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

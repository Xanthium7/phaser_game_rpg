# Phaser RPG Game

This project is an RPG-like game built using Phaser.js and GridEngine. The game allows a player to move around in a tilemap world and interact with objects and environments.

server: https://github.com/Xanthium7/phaser_game_server

## DAY 1:
- Achieved Player movement
- Achieved Player Collision with fences

![alt text](image.png)

## DAY 2 - 5:
- Achieved Player movement with Walking animation
- Achieved Player movement to be synced between Multiple windows
- Multiplayer Functionality in the begining stages



https://github.com/user-attachments/assets/f1f731d4-3beb-4a94-824a-c9748e46e092

## DAY 6:
- Added Player Name field which moves around with player
- Player name does not exist yet, so i used first 6 letters of Player id

![image](https://github.com/user-attachments/assets/784f2972-a319-465c-a067-adbf86638555)


## DAY 7:
- Made it so that very new player will get a specific sprite (built a hash function that generates an index between 0 and 9 based on player id)
- this will be useful in distinguishing multiple players
- imporvements needed: every new player can select their needed color

![image](https://github.com/user-attachments/assets/ba8b5474-cc34-4396-90ba-6a326219c0f7)


## DAY 8
- Added ability to create and join multiple rooms
- the players can join unquie individual rooms
- This was easier than what iI expected initally,  since SOCKETS.IO had room feature available already
refrence link: https://socket.io/docs/v3/rooms/


![Screenshot 2024-11-20 000910](https://github.com/user-attachments/assets/a6465f1a-71a1-4f35-bfe7-cc2e3a84791f)


## DAY 9 - 10
- Added Clerk Authentication
- Made so the username will be shown as IGNs
- This took a while cause rect strict mode was causing double renderings and breaking the game, had to disable it

![image](https://github.com/user-attachments/assets/20a70dcd-b1e4-4f8e-8eb2-3cd566bb6432)



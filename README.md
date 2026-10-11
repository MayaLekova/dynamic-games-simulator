# dynamic-games-simulator

A simple web-based simulator for creating and analysing dynamic resource allocation games, written in TypeScript. Inspired by the karma_game_library available on PyPI.

## Start the system

To run the server:

> node backend/server.js

User panel:

> open http://127.0.0.1:8000/

Admin panel:

> open http://127.0.0.1:8000/admin.html

## Reservation process details

Priority to points equivalence:
   - low = 2 pt.
   - medium = 5 pt.
   - high = 10 pt.

Algorithm for allocating the spaces:

 - each user places a vector of bids for each subzone
 - for each subzone with `M` spaces, the system executes the following allocation procedure:
   - allocate spaces to the users with "high" bids;
     let's denote their number by `U_h`.
   - if `M >= U_h` (i.e. there are still spaces to
     allocate), allocate as much as possible, spaces to the users with  "medium" bids; let's denote their number by `U_m`.
   - if `M >= U_h + U_m` (i.e. there are still spaces to allocate), allocate as much as possible, spaces to the users with "low" bids; let's denote their number by `U_l`.
 - if at any point 2 users compete with the same bid for a given space, the one with the smaller (earlier) timestamp wins.

// import 'node:assert';

/*
Priority to points equivalence:
   - low = 2 pt.
   - medium = 5 pt.
   - high = 10 pt.
*/

// Mapping from priority of the bid to parking points (pp.) 
const Priority = {
  low: 2,
  medium: 5,
  high: 10
};

// Sample number of spaces for each subzone
let spaces_per_subzone = [5, 15, 25, 10, 25, 15, 10];

// function to perform allocation for a given subzone.
// parameters:
//  - `subzone` - index of the subzone; validated after calling `allocate`
//  - `bids` - an array of non-negative integers, representing the bid
//     of each user for this particular subzone. If the array contains
//     `null` at position `index`, this represents that the user with id
//     `index` hasn't bid anything for this particular subzone.
function allocate(subzone, bids) {
  // assert(subzone >= 0);
  // assert(subzone <= spaces_per_subzone.length);
  let num_spaces = spaces_per_subzone[subzone];

  let num_high = bids.reduce((num, bid) => (bid == Priority.high) ? num + 1 : num, 0);
  let num_medium = bids.reduce((num, bid) => (bid == Priority.medium) ? num + 1 : num, 0);
  let num_low = bids.reduce((num, bid) => (bid == Priority.low) ? num + 1 : num, 0);

  console.log('high: ', num_high);
  console.log('medium: ', num_medium);
  console.log('low: ', num_low);

  let alloc_high = 0, alloc_medium = 0, alloc_low = 0;

  // TODO: add conflict resolution based on timestamps

  // TODO: add personal adjustment (assignment) of the allocated spaces
  // Allocate spaces to high-priority bidders as much as possible.
  alloc_high = Math.min(num_high, num_spaces);
  num_spaces -= alloc_high;

  // Allocate spaces to medium-priority bidders, if possible.
  if (num_spaces > 0) {
    alloc_medium = Math.min(num_medium, num_spaces);
    num_spaces -= alloc_medium;
  }

  // Allocate remaining spaces to low-priority bidders.
  if (num_spaces > 0) {
    alloc_low = Math.min(num_low, num_spaces);
    num_spaces -= alloc_low;
  }


  const final_allocation = {
    high: alloc_high,
    medium: alloc_medium,
    low: alloc_low,
    remaining: num_spaces
  };
  console.log('final allocation: ', final_allocation);
  return final_allocation;
}

export { Priority, allocate };

/*
Algorithm for allocating the spaces:

- each user places a vector of bids for each subzone
 - for each subzone with `M` spaces, the system executes the following allocation procedure:
   - allocate spaces to the users with "high" bids;
     let's denote their number by `U_h`.
   - if `M >= U_h` (i.e. there are still spaces to
     allocate), allocate as much as possible, spaces to the users with  "medium" bids; let's denote their number by `U_m`.
   - if `M >= U_h + U_m` (i.e. there are still spaces to allocate), allocate as much as possible, spaces to the users with "low" bids; let's denote their number by `U_l`.
 - if at any point 2 users compete with the same bid for a given space, the one with the smaller (earlier) timestamp wins.

*/

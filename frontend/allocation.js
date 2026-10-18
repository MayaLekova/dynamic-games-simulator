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
// total: 56
let spaces_per_subzone = [5, 3, 7, 65, 4, 2, 10];
// At each re-distribution it's possible that the surplus
// karma is not divisible by the number of users; thus we
// give the opportunity to accumulate the extra karma
// between iterations and add it to the surplus, so that
// the total karma in the system stays as stable as possible.
let karma_residue = 0;

// unit test for the conflict resolution algorithm
// that supports 3 different priority levels:
// high, medium, low, each of which gets fulfilled
// consecutively.
function test_allocate() {
  // contains 3 high's, 4 medium's, 3 low's
  let sample_bids = [10, 5, 10, 5, 2, 2, 2, 5, 10, 5];
  let results_per_subzone = [
    { high: 3, medium: 2, low: 0, remaining: 0 },
    { high: 3, medium: 0, low: 0, remaining: 0 },
    { high: 3, medium: 4, low: 0, remaining: 0 },
    { high: 3, medium: 4, low: 3, remaining: 55},   // space for everyone + extra
    { high: 3, medium: 1, low: 0, remaining: 0 },
    { high: 2, medium: 0, low: 0, remaining: 0 },
    { high: 3, medium: 4, low: 3, remaining: 0 },   // space for everyone
  ];

  function compare(a, b) {
    return a.high == b.high &&
      a.medium == b.medium &&
      a.low == b.low &&
      a.remaining == b.remaining;
  }

  for (let subzone = 0; subzone < spaces_per_subzone.length; ++subzone) {
    let alloc = allocate(subzone, sample_bids);
    let expected = results_per_subzone[subzone];
    if (!compare(alloc, expected)) {
      debug_log('mismatch for subzone', subzone);
      debug_log('expected: ', expected);
      debug_log('actual: ', alloc);
      continue;
    }
    debug_log('test OK for subzone ', subzone);
  }
}

// runs a large number of iterations (e.g. >1000)
// with 25 users, random distribution of bids
// and update their karma points respectively
function stress_random(subzone, num_users_, iterations_, output_histogram) {
  let num_users = num_users_ || 25, iterations = iterations_ || 10;
  let bids = [], karma = [],
    bid_values = [0, Priority.low, Priority.medium, Priority.high];

  for (let user = 0; user < num_users; ++user) {
    karma.push(42);
  }
  
  // TODO: stress can do a single iteration
  // and be called N times (e.g. N > 1000)
  for (let i = 0; i < iterations; ++i) {
    debug_log('------ ', i, ' ------');

    bids = [];
    // generate a sample
    for (let user = 0; user < num_users; ++user) {
      let bid = bid_values[Math.floor(Math.random() * 4) % 4];
      // disallow negative karma values
      if (karma[user] >= bid) {
        bids.push(bid);
      } else {
        bids.push(0);
      }
    }

    debug_log('bids: ', bids);
    // adjust karma values according to an allocation
    let allocation = allocate(subzone, bids);
    let surplus = karma_residue;
    debug_log('updates: ', allocation.updates);
    for (let user = 0; user < num_users; ++user) {
      let update = allocation.updates[user];
      karma[user] += update;
      if (update < 0) {
        surplus += (-update);
      }
    }

    // redistribute surplus karma; we're implementing
    // `Pay Bid to Society (PBS) — Uniform Redistribution`
    // (see "A Self-Contained Karma Economy for the Dynamic
    // Allocation of Common Resources",
    // section "2.1 Examples of Karma Payment Rules")
    for (let user = 0; user < num_users; ++user) {
      karma[user] += Math.floor(surplus / num_users);
    }
    karma_residue = surplus % num_users;
    debug_log('Surplus at iteration ', i, ': ', surplus,
      '; residue: ', karma_residue);

    // TODO: add redistribution with various variants
    // (redistribution functions)
    debug_log('iteration ', i, '; karma: ', karma);

    if (output_histogram) {
      const output_at_iter = [10, 100, 1000];
      if (output_at_iter.indexOf(i+1) < 0) continue;

      console.log(i+1);
      console.log(karma);
    }
  }

  let sum = 0;
  karma.forEach((n) => sum += n);
  debug_log('>>> sum: ', sum, '; total karma: ', 42 * num_users);
  return karma;
}

// function to perform allocation for a given subzone.
// parameters:
//  - `subzone` - index of the subzone; validated after calling `allocate`
//  - `bids` - an array of non-negative integers, representing the bid
//     of each user for this particular subzone. If the array contains
//     0 at position `index`, this represents that the user with id
//     `index` hasn't bid anything for this particular subzone.
//
// Algorithm for allocating the spaces:
//
// - each user places a vector of bids for each subzone
//  - for each subzone with `M` spaces, the system executes the following allocation procedure:
//    - allocate spaces to the users with "high" bids;
//      let's denote their number by `U_h`.
//    - if `M >= U_h` (i.e. there are still spaces to
//      allocate), allocate as much as possible, spaces to the users with  "medium" bids; let's denote their number by `U_m`.
//    - if `M >= U_h + U_m` (i.e. there are still spaces to allocate), allocate as much as possible, spaces to the users with "low" bids; let's denote their number by `U_l`.
//  - if at any point 2 users compete with the same bid for a given space, the one with the smaller (earlier) timestamp wins.

function allocate(subzone, bids) {
  // assert(subzone >= 0);
  // assert(subzone <= spaces_per_subzone.length);
  let num_spaces = spaces_per_subzone[subzone];

  let num_high = bids.reduce((num, bid) => (bid == Priority.high) ? num + 1 : num, 0);
  let num_medium = bids.reduce((num, bid) => (bid == Priority.medium) ? num + 1 : num, 0);
  let num_low = bids.reduce((num, bid) => (bid == Priority.low) ? num + 1 : num, 0);

  let alloc_high = 0, alloc_medium = 0, alloc_low = 0;

  // an array of updates for karma values, with indices corresponding
  // to the indices in `bids`; negative numbers mean the user
  // has been allocated a space, 0's mean they pass at the given
  // iteration
  let updates = [];
  for (let id = 0; id < bids.length; ++id) updates.push(0);

  // Allocate spaces to high-priority bidders as much as possible.
  alloc_high = Math.min(num_high, num_spaces);
  if (alloc_high > 0) {
    updates = rank(bids, updates, Priority.high, alloc_high);
    debug_log('high allocated; updates: ', updates);
  }
  num_spaces -= alloc_high;

  // Allocate spaces to medium-priority bidders, if possible.
  if (num_spaces > 0) {
    alloc_medium = Math.min(num_medium, num_spaces);
    if (alloc_medium > 0) {
      updates = rank(bids, updates, Priority.medium, alloc_medium);
      debug_log('medium allocated; updates: ', updates);
    }
    num_spaces -= alloc_medium;
  }

  // Allocate remaining spaces to low-priority bidders.
  if (num_spaces > 0) {
    alloc_low = Math.min(num_low, num_spaces);
    if (alloc_low > 0) {
      updates = rank(bids, updates, Priority.low, alloc_low);
      debug_log('low allocated; updates: ', updates);
    }
    num_spaces -= alloc_low;
  }

  const final_allocation = {
    high: alloc_high,
    medium: alloc_medium,
    low: alloc_low,
    remaining: num_spaces,
    updates: updates
  };
  return final_allocation;
}

// function to perform ranking of users competing with
// equal prioirity.
// parameters:
//  - `subzone` - index of the subzone;
//  - `bids` - an array of non-negative integers, representing the bid
//     of each user for this particular subzone.
//  - `updates` - an array with matching indices with karma value updates.
//  - `priority` - priority for which we do the ranking
//  - `num_allocated` - number of spaces available for this priority
// returns updated version of `updates` with values meaning:
//  - negative values represent the user has acquired a space
//  - the remaining karma values are left unchanged
function rank(bids, updates, priority, num_allocated) {
  // gather all competing users with the same priority
  let indices_pool = [];
  for (let id = 0; id < bids.length; ++id) {
    if (bids[id] == priority)
      indices_pool.push(id);
  }
  debug_log('ranking: ', indices_pool);

  // TODO: add conflict resolution based on timestamps;
  // for now a random sample of same level bidders get allocated
  if (indices_pool.length > num_allocated) {
    // we do ranking;
    shuffle(indices_pool);
    // we drop the ones that don't get a space
    let num_dropped = indices_pool.length - num_allocated;
    debug_log('dropping ', num_dropped, ' users...');
    indices_pool.length -= num_dropped;
    debug_log('remaining: ', indices_pool);
  } else {
    // everyone from this level gets a space
  }
  for (let id of indices_pool) {
    updates[id] = -bids[id];
  }
  return updates;
}
// TODO: add unit test for `rank`

// ========= Helper and debug functions =========

// implementation of Durstenfeld shuffle
// (https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle#The_modern_algorithm)
// as suggested by https://stackoverflow.com/a/12646864
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function debug_log(...args) {
  // console.log(...args);
}

export { Priority, allocate, test_allocate, stress_random };

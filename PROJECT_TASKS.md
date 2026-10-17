## TODO:

 - [x] create Nuxt.js app
 - [ ] add and configure PowerSync module
 - [ ] add Leaflet module
 - [ ] add GIS data
 - [ ] ....

## Research

 - [A blockchain-enabled parking space allocation...](https://www.sciencedirect.com/science/article/abs/pii/S0360835224007356)

## Data model

- current per-user data:

```
{
    urgency: String['low', 'medium', 'high'], 
    karma: Number,
    message: String
}
```

## Sync engine

 - 1st alternative - [Teleportal.js](https://pckt.blog/b/nick-the-sick/teleportal-a-real-time-collaborative-editing-framework-y5fe174)
 - 2nd alternative - [PowerSync](https://docs.powersync.com/intro/powersync-overview)
   - [Nuxt module](https://docs.powersync.com/client-sdks/frameworks/nuxt)
 - 3rd alternative - [Pinia plugin](https://www.npmjs.com/package/pinia-plugin-yjs) for Y.js; other [state management](https://nuxt.com/docs/4.x/getting-started/state-management) libraries for Nuxt.js
 - list of other [offline-first projects](https://openlocalfirst.org/schedules/)

## Integrate Nuxt.js to the server

- understand how Nuxt fits with my current prototype
Decide: should I use some special auth helper(s), i.e. [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils)?
- decide: what kind of storage do I need?
- integrate [Leaflet module](https://nuxt.com/modules/leaflet) in the app
- implement server-side conflict resolution algorithm (see the paper notebook)
- undestand: what is a Vue composable (e.g. `useFetch`) vs. Vue component (e.g. the header and footer of my app)?
  => see [auto imports](https://nuxt.com/docs/4.x/guide/concepts/auto-imports)

## Client side

- add map view with sub-zone picker
- add time interval picker
- add duration picker

## Misc

 - project management with [Plane](https://plane.so/pricing)
 - конкуренция: https://parkingspace.bg/%D0%BD%D0%B0%D1%87%D0%B0%D0%BB%D0%BE
 - конкуренция 2: Hybo.app - https://hybo.app/en/blog/algorithm-for-parking-spaces/
 - конкуренция 3: Parkalot - https://parkalot.io/tips/parking-space-optimisation/
## Data model

- current per-user data:

```
{
    urgency: String['low', 'medium', 'high'], 
    karma: Number,
    message: String
}
```

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

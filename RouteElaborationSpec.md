# Route Elaboration Spec

Routes and their two portals are top-level sector entities. A portal represents
one end of a warp tunnel at a system boundary; the route represents the warp
space between its portals. Route portals are not points of interest.

```ts
interface Sector {
  Routes: Route[];
  RoutePortals: RoutePortal[];
}

interface Route extends SelectableEntity {
  PortalIds: [Guid, Guid];
}

interface RoutePortal extends SelectableEntity {
  RouteId: Guid;
  SystemId: Guid;
  BoundaryAngleDegrees: number;
}
```

`PlayerShip.CurrentLocationId` remains a single identity reference. It may
refer to a normal location contained by a system, a route portal, or a route.
A portal means the ship is at that portal on the named system's boundary. A
route means the ship is in warp between its two portals and consequently has
no current system.

Each route references exactly two different portals. Both portals exist, refer
back to that route, belong to different existing systems, and belong to no
other route. Portal angles are valid boundary angles. A ship location must
resolve to an allowed location and may not refer to the ship itself. The
previous rule requiring every ship location to be contained by one system is
therefore relaxed only for routes; top-level route portals still identify their
containing system directly.

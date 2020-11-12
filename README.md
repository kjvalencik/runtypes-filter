# runtypes-filter

Clone and filter [runtypes][runtypes] objects.

## Limitations

Filtering objects with the following types is not supported because
they may not be safely cloned.

- `InstanceOf`
- `Intersect`
- `Function`

## Usage

### Recommended

Since not all types may be [safely](#limitations) cloned, it is
recommended to statically construct a filter method per type.

Filter methods are recursive. It is only necessary to filter at
the top level.

```ts
import { Literal, Number, Record } from "runtypes";
import CheckFilter from "runtypes-filter";

const Asteroid = Record({
	type: Literal("asteroid"),
	mass: Number,
});

const filterAsteroid = CheckFilter(Asteroid);

const untrustedAsteroid: unknown = {
	type: "asteroid",
	mass: 100,
};

const trustedAteroid = filterAsteroid(untrustedAsteroid);
```

### Manual

Validation of the type, checking unknown objects and filtering may also
be handled manually.

```ts
import { Literal, Number, Record } from "runtypes";
import { filter, validate } from "runtypes-filter";

// Statically validate that the runtype can be filtered
const Asteroid = validate(
	Record({
		type: Literal("asteroid"),
		mass: Number,
	})
);

const untrustedAsteroid: unknown = {
	type: "asteroid",
	mass: 100,
};

const trustedAsteroid = Asteroid.check(untrustedAsteroid);

// This method will `throw` if `Asteroid` cannot be safely cloned
const filteredAsteroid = filter(Asteroid, trustedAsteroid);
```

[runtypes]: https://github.com/pelotom/runtypes

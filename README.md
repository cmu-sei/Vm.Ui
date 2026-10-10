# Player.Vm.Ui Readme

This project uses [Angular](https://angular.dev) 21 (`@angular/core` ^21.2.1, Angular CLI 21.2.1).

## Requirements

Node.js `^20.19.0 || ^22.12.0 || >=24.0.0` (the Angular CLI 21 engine range). The Angular CLI is a local devDependency, so after `npm ci` use `npm start`, `npm run build`, `npm test`, etc. (or `npx ng ...`); no global `ng` is needed.

## Development server

Run `npm start` (`ng serve`) for a dev server. Navigate to `http://localhost:4303/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use:

`ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` (`ng build`) to build the project. The build artifacts will be stored in the `dist/browser` directory. The `production` configuration is the default (`--configuration production` to be explicit).

## Running unit tests

Unit tests run on Vitest through Angular's `@angular/build:unit-test` builder, in jsdom with
zone.js change detection like the app, using `@testing-library/angular`. The setup follows the
shared Crucible UI test standard.

```bash
npm test                 # Run all tests once (ng test --watch=false)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run once with v8 coverage and thresholds (output in coverage/)
```

Shared helpers live in `src/app/test-utils/`: `renderComponent` (with `childStubs` for
standalone child components), `getDefaultProviders` (throwing placeholders for every service
a test does not stub), `ApiStub<T>` for generated API stubs, the SignalR fake, and
`permissionDataProviders(grants)`, which builds the real `UserPermissionsService` over stubbed
player-api endpoints. `vitest.config.ts` applies the Akita patches in `patches/` with
`patch-package` when the tests start; there is deliberately no `postinstall` hook.

## Running end-to-end tests

Run `npm run e2e` (`ng e2e`) to execute the end-to-end tests via [Protractor](http://www.protractortest.org/). Note: this is legacy and is not part of the Vitest setup; the `e2e` target uses `@angular-devkit/build-angular:protractor`, which is not a dependency of this project, so it is not expected to run.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

#### Settings

All configurable values (URLs, etc.) should be made to use the `ComnSettingsService` (from `@cmusei/crucible-common`). It loads its values from configuration files located in `/assets/config/`. There are three files used for this; they are merged in the order `settings.json`, `settings.shared.json`, `settings.env.json`, and later files win. They are as follows:

- **settings.json:** This file is committed to source control and holds default values for all settings. Changes should only be made to this file to add new settings, or change the default value of a setting that will affect everyone who pulls down the project.
- **settings.shared.json:** This file is **_not_** committed to source control and holds settings shared across Crucible apps. Settings placed in it override `settings.json`.
- **settings.env.json:** This file is **_not_** committed to source control and will differ for each environment. Settings can be placed into this file and they will override settings found in `settings.json` and `settings.shared.json`. Any settings not found in this file will default to the values in `settings.json`.

In a production environment, `settings.env.json` should contain only the settings that need to be changed for that environment, and `settings.json` serves as a reference for the default values as well as any unchanged settings. `settings.json` should not be altered in a production environment for any reason.

## Reporting bugs and requesting features

Think you found a bug? Please report all Crucible bugs - including bugs for the individual Crucible apps - in the [cmu-sei/crucible issue tracker](https://github.com/cmu-sei/crucible/issues).

Include as much detail as possible including steps to reproduce, specific app involved, and any error messages you may have received.

Have a good idea for a new feature? Submit all new feature requests through the [cmu-sei/crucible issue tracker](https://github.com/cmu-sei/crucible/issues).

Include the reasons why you're requesting the new feature and how it might benefit other Crucible users.

## License

Copyright 2021 Carnegie Mellon University. See the [LICENSE.md](./LICENSE.md) files for details.

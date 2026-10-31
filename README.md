# companion-module-jubilatesoftware-zionworx

Bitfocus Companion module for ZionWorx 5 (Jubilate Software). See [HELP.md](./companion/HELP.md) and
[LICENSE](./LICENSE).

The ZionWorx side (the HTTP control API, its OpenAPI spec and the plan for this module) lives in the ZionWorx
source tree: `common\WebRemote\HTTP_API.md`, `openapi.yaml` and `Companion_Plan.md` (step 5, M0-M6).

## Getting started

Executing a `yarn` command should perform all necessary steps to develop the module, if it does not then follow the steps below.

The module can be built once with `yarn build`. This should be enough to get the module to be loadable by companion.

While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.

`yarn package` builds the `.tgz` that testers install with Companion's Modules → Import module package.

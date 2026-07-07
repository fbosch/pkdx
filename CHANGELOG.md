# Changelog

## [0.7.0](https://github.com/fbosch/pkdx/compare/pkdx-v0.6.0...pkdx-v0.7.0) (2026-07-07)


### Features

* **cli:** add version flag ([072dcd4](https://github.com/fbosch/pkdx/commit/072dcd4b2a45a0ee1fa12992dfdd56cb35afb82d))
* **detail:** add ability links ([7a1cc59](https://github.com/fbosch/pkdx/commit/7a1cc59845e047c0a4c5f9d148e1f87ee61b8bf7))
* **detail:** add egg group links ([9d446dc](https://github.com/fbosch/pkdx/commit/9d446dcf3b6a366a741ea8647e6289e24086d61f))
* **detail:** add generation links ([59f1fe3](https://github.com/fbosch/pkdx/commit/59f1fe3f6638a59c79fe7ac41ee8be53c55e945a))
* **detail:** format generation names ([e502ce9](https://github.com/fbosch/pkdx/commit/e502ce91ee7e0c5fa083821cf60aa95a7f32a42c))


### Bug Fixes

* **pokeapi:** accept named trade species ([a3fbe7c](https://github.com/fbosch/pkdx/commit/a3fbe7c4571ab1280516ff1a48bd701d3eeefca6))
* **pokesprite:** preserve sprite placeholders ([7a3956a](https://github.com/fbosch/pkdx/commit/7a3956a52cde31a3465f592bba609c14d8c8d4fd))

## [0.6.0](https://github.com/fbosch/pkdx/compare/pkdx-v0.5.0...pkdx-v0.6.0) (2026-07-01)


### Features

* **cache:** add schema-based cache busting ([cf7da3f](https://github.com/fbosch/pkdx/commit/cf7da3ff72dfccb49dca7f20719d093d0f86abf1))
* **ui:** add alias and evo shortcuts ([b2d2222](https://github.com/fbosch/pkdx/commit/b2d2222082ae471d10bb48e5f1ea0aa6172c4529))
* **ui:** add query debug filters ([25f9c45](https://github.com/fbosch/pkdx/commit/25f9c45dc3fb4f5598808b420f1a32e2b0d51571))


### Bug Fixes

* **ui:** debounce cache stats refresh ([1f90bd9](https://github.com/fbosch/pkdx/commit/1f90bd96a88f822f2724632217ce5fdafc2e17c8))


### Performance Improvements

* **terminal:** bound image cache ([e05f1a8](https://github.com/fbosch/pkdx/commit/e05f1a87e8373b0a629dcc342b8daa2af5e66320))

## [0.5.0](https://github.com/fbosch/pkdx/compare/pkdx-v0.4.0...pkdx-v0.5.0) (2026-06-29)


### Features

* **query:** persist query cache in sqlite ([37b9097](https://github.com/fbosch/pkdx/commit/37b90974759203155ff35fdd16d43f119cb9a0f1))
* **ui:** prewarm sprites on ready ([cd1d25b](https://github.com/fbosch/pkdx/commit/cd1d25bbf9830ff1ad8950a25c9be7b097bc59ad))


### Bug Fixes

* **cli:** let app own ctrl-c ([f4037dd](https://github.com/fbosch/pkdx/commit/f4037dd77f3c58a0b8731515ebd37e51ce388aa8))
* improve packaging ([1d44ae1](https://github.com/fbosch/pkdx/commit/1d44ae1b6092fd101881807781171015d40f30b9))
* **sprite:** prewarm terminal sprite images ([f401275](https://github.com/fbosch/pkdx/commit/f401275fed1d55c00f1a199150bbb52b5aceb7ae))

## [0.4.0](https://github.com/fbosch/pkdx/compare/pkdx-v0.3.0...pkdx-v0.4.0) (2026-06-29)


### Features

* **release:** split pkdx binaries into platform npm packages ([dfbcd85](https://github.com/fbosch/pkdx/commit/dfbcd85d8700714643e90a10d89a79144ee473f7))

## [0.3.0](https://github.com/fbosch/pkdx/compare/pkdx-v0.2.0...pkdx-v0.3.0) (2026-06-29)


### Features

* **detail:** hide evo hint when absent ([f8202f7](https://github.com/fbosch/pkdx/commit/f8202f7ef39db02d2aeab862b09e06d247cc8fd2))

## [0.2.0](https://github.com/fbosch/pkdx/compare/pkdx-v0.1.0...pkdx-v0.2.0) (2026-06-28)


### Features

* **app:** allow q and esc to exit ([3d2bd75](https://github.com/fbosch/pkdx/commit/3d2bd754e757e04f82c86dba9e372d55ffe37ad6))
* **cli:** add image mode flag ([18d1e75](https://github.com/fbosch/pkdx/commit/18d1e75aa90d69dbc095bf695b3b639344694fce))
* **cli:** add opentui search screen ([55a24f1](https://github.com/fbosch/pkdx/commit/55a24f16cc36786cf34436a1df8c5e8aa52ced8c))
* **detail:** add ability overlay ([46e055b](https://github.com/fbosch/pkdx/commit/46e055b4f2c73317a14e553bac64a2cdb0a7593e))
* **detail:** add atomic loading state ([a19698b](https://github.com/fbosch/pkdx/commit/a19698bb65bd4e74e742f37380e97f26f04e79cd))
* **detail:** add description cycling ([2008003](https://github.com/fbosch/pkdx/commit/2008003d3913d7ca06f941c511de17a11473ef32))
* **detail:** add dex navigation ([585f33a](https://github.com/fbosch/pkdx/commit/585f33abdb3a73ca196b8676518b9f18474a30d5))
* **detail:** add ev yield ([e625493](https://github.com/fbosch/pkdx/commit/e625493dbd3690e30c3ac7275d94edbf0df6f6f2))
* **detail:** add evolution species links ([caa6685](https://github.com/fbosch/pkdx/commit/caa668591def5379aac5ea180a3931bd8182ed21))
* **detail:** add evolution viewer ([b6f1b32](https://github.com/fbosch/pkdx/commit/b6f1b32cae79fb0dc6f337375846efb1b7d54d38))
* **detail:** add form selector ([d143a1c](https://github.com/fbosch/pkdx/commit/d143a1c89c6ec8f7417cafb0cc5b3b954d54ce20))
* **detail:** add pokemon detail facts ([d9cecb9](https://github.com/fbosch/pkdx/commit/d9cecb9db833f884fc73c8bd513cc814bffe0b17))
* **detail:** add pokemon detail model ([4915014](https://github.com/fbosch/pkdx/commit/491501461003cc808e1dddc20b8b5018118b7eed))
* **detail:** add shiny sprite toggle ([0178bd2](https://github.com/fbosch/pkdx/commit/0178bd2c8d85abef4ab85e1680aa082dbb22ced2))
* **detail:** add species and gender data ([3eaf3e1](https://github.com/fbosch/pkdx/commit/3eaf3e18b49bfb46c4604ed699798b7976302d94))
* **detail:** highlight detail nav on hover ([e29fb12](https://github.com/fbosch/pkdx/commit/e29fb12117920199f9091d521f09a104b381a53e))
* **pokeapi:** add query helpers ([54e5314](https://github.com/fbosch/pkdx/commit/54e5314ba7ae10d9995c4f8ebc7a21c4781d02dd))
* **pokesprite:** add metadata parsing ([ceee072](https://github.com/fbosch/pkdx/commit/ceee07207c8e612cf555a165b69e850e01bdf7ff))
* **pokesprite:** add scarlet violet sprite ([8a54a02](https://github.com/fbosch/pkdx/commit/8a54a029cdbb73771020bb7c2fdd53d3b35901ea))
* **query:** add query cache ([ace6c02](https://github.com/fbosch/pkdx/commit/ace6c02f1f284a1656596f8c5d22a7154e9d238f))
* **search:** add ctrl-j/k nav ([4d95bf2](https://github.com/fbosch/pkdx/commit/4d95bf23fd93a7256b713b6d815e79d718ca7f78))
* **search:** add prebuilt fuse index ([e18b5dc](https://github.com/fbosch/pkdx/commit/e18b5dc21c510c0db12de9140abd998b6eed98ab))
* **search:** add species search and detail flow ([a229429](https://github.com/fbosch/pkdx/commit/a2294293d556dc316c18789e88b6f8c07a9c167b))
* **search:** delay search until 3 chars ([cb36a6c](https://github.com/fbosch/pkdx/commit/cb36a6c89f9d531559a74fe699952ed2381a7bf5))
* **sprite:** add png sprite rendering ([831385f](https://github.com/fbosch/pkdx/commit/831385f961d5d150a28bb5515339d96b0111f7b3))
* **type:** add matchup damage data ([5397af4](https://github.com/fbosch/pkdx/commit/5397af4dde9a2ddc344817a395ac8af1ccb15966))
* **ui:** add detail card styling ([79e2f4b](https://github.com/fbosch/pkdx/commit/79e2f4bc125109302b96b3032d0caa99ee553e0a))
* **ui:** add pokemondb web link ([b939e64](https://github.com/fbosch/pkdx/commit/b939e645ae2126a1a7734926b5cc24f75ff59c25))
* **ui:** add query debug panel ([d3db7a6](https://github.com/fbosch/pkdx/commit/d3db7a68dd74d1a5348d76bf2c463ba6b75f4874))
* **ui:** add terminal image support ([9d63b7c](https://github.com/fbosch/pkdx/commit/9d63b7c64ef6021aa6b147bef0a38e87b09fd041))
* **ui:** log detail errors in debug ([00e6988](https://github.com/fbosch/pkdx/commit/00e6988e65abd97391b2615879619261d68731ff))
* **ui:** prefetch adjacent pokemon ([3cf7b0f](https://github.com/fbosch/pkdx/commit/3cf7b0ffaf5065810658005a5bdcd196b88f4139))
* **ui:** redesign search view ([9a35bca](https://github.com/fbosch/pkdx/commit/9a35bca9ad273a746acc474f70065659d044dcf3))
* **ui:** show query status summary ([f5bed27](https://github.com/fbosch/pkdx/commit/f5bed27fc23a18d21deee6f886964ab06324b881))


### Bug Fixes

* **cli:** defer exit cleanup ([56a1c04](https://github.com/fbosch/pkdx/commit/56a1c04b2eeb9f9939163505e8f90b6059cd67b6))
* **cli:** parse debug flag in cli ([7c1e8a7](https://github.com/fbosch/pkdx/commit/7c1e8a70c952f8663fd24c23dda065d7b8bd65c7))
* **detail:** block cosmetic form fallback ([2bc5eee](https://github.com/fbosch/pkdx/commit/2bc5eee87f860e8a3c140f99971a94d0ab8388fb))
* **detail:** carry direct evolutions ([cd3b53e](https://github.com/fbosch/pkdx/commit/cd3b53eb7a7c3eee3e5fe2f8ea4cc4e1769354e8))
* **detail:** carry form intent across detail loads ([2a8c7af](https://github.com/fbosch/pkdx/commit/2a8c7af1d845b3de588efe46deab64a73768eba5))
* **detail:** delay ability viewer until loaded ([c9c3955](https://github.com/fbosch/pkdx/commit/c9c39555efe9bc5bed4c01c6c4671d1ae172db58))
* **detail:** fix sprite form selection ([4a4c4e9](https://github.com/fbosch/pkdx/commit/4a4c4e9c71e5a9523d776f9b21c633dc86767a61))
* **detail:** handle single alt forms ([8e0f772](https://github.com/fbosch/pkdx/commit/8e0f772a9c5cd06118ca838e6319aa41a7b48f5b))
* **detail:** preserve regional form ([d8b93de](https://github.com/fbosch/pkdx/commit/d8b93de2519454f11a0648993de9098551d915cb))
* **evolution:** use species names ([b92cb10](https://github.com/fbosch/pkdx/commit/b92cb10a6247b51e3ebd4d4223da3819775c71ed))
* **pokemon-detail:** use form flavor text ([100c789](https://github.com/fbosch/pkdx/commit/100c7891783cee90de34d48655c6c52d3979ad3f))
* **pokemon:** handle form-specific evolutions ([399201e](https://github.com/fbosch/pkdx/commit/399201e397a017cf1c2f0ba4fea60dbb5d406129))
* **pokemon:** hide alt form flavor text ([4eeec49](https://github.com/fbosch/pkdx/commit/4eeec492bf91ef9abd71f482c1bc3c4ece86be5f))
* **pokesprite:** skip metadata for sv sprites ([be1cb5f](https://github.com/fbosch/pkdx/commit/be1cb5fcb8fcb0aee9a47d27dd723eae13f33abd))
* **pokesprite:** use shiny sprite urls ([bd33268](https://github.com/fbosch/pkdx/commit/bd3326864a29b2942c5dc853097cdd31c7a9d2eb))
* **search:** normalize search key aliases ([36c9247](https://github.com/fbosch/pkdx/commit/36c9247830259cc4caeb4eef543b96a97091a137))
* **sprites:** render indexed sprites ([f5f2f39](https://github.com/fbosch/pkdx/commit/f5f2f3996331adf92cd52ff7a1fc793f4af8ecf2))
* **ui:** accept default form fallback ([ef8a38a](https://github.com/fbosch/pkdx/commit/ef8a38a9d69e875c1b0b5443742dd3c6e1d93e5e))
* **ui:** add overlay close handling ([7d78152](https://github.com/fbosch/pkdx/commit/7d781523d9ca7ffc3f61473bdaa238296339dcbe))
* **ui:** align detail layout ([dbeedeb](https://github.com/fbosch/pkdx/commit/dbeedebb863e82eac613391ec8caeb357bbef147))
* **ui:** debounce detail queries ([f69edb9](https://github.com/fbosch/pkdx/commit/f69edb9c2f6d072ef6d3ac93164e2c3d5f7ac8f6))
* **ui:** defer detail loading skeleton ([da99183](https://github.com/fbosch/pkdx/commit/da991833ce1d4c5e1f9565d35f8f3ca6679cdb36))
* **ui:** handle detail errors ([731b1af](https://github.com/fbosch/pkdx/commit/731b1af1614ef55a4b51d2b445dac3994cb45d7d))
* **ui:** keep sprite errors recoverable ([a3ec689](https://github.com/fbosch/pkdx/commit/a3ec689110b4d7bc5a801f0eb1d95b859276d5f0))
* **ui:** overlay suggestions list ([2df2fab](https://github.com/fbosch/pkdx/commit/2df2fabad163188d8efb42b96b59fc86e2a04719))
* **ui:** preserve search selection ([9a10d77](https://github.com/fbosch/pkdx/commit/9a10d774623679256200415d3e5fb48f18f86588))
* **ui:** show initial loading state ([a09fb5a](https://github.com/fbosch/pkdx/commit/a09fb5aa6e5cd39891e6e4024b137494c8d3a964))
* **ui:** simplify sprite display ([1874fd6](https://github.com/fbosch/pkdx/commit/1874fd6b569f0f2224c8f5b9f3265ab1732a2675))
* **ui:** tune detail panel layout ([773414e](https://github.com/fbosch/pkdx/commit/773414e42bf8f8b8562bfb4b1d3076ee5ad52601))
* **ui:** use ctrl-c to exit ([7e19bfc](https://github.com/fbosch/pkdx/commit/7e19bfc85ea638c776f821279eed5b16d8ce0c5f))


### Performance Improvements

* **pokemon:** cache detail transforms ([904fcb2](https://github.com/fbosch/pkdx/commit/904fcb2a44a3f0c8788e68ec834801afda8123e3))
* **pokemon:** parallelize detail loads ([1d074ea](https://github.com/fbosch/pkdx/commit/1d074ea1cb192da6a353d9f62f7223da320f4284))
* **search:** cache species search results ([9026055](https://github.com/fbosch/pkdx/commit/9026055cf1f0208e7bc0e8359d2d1551b99f3d4e))
* **search:** cache species slug lookup ([ec4b0e1](https://github.com/fbosch/pkdx/commit/ec4b0e12005027f0f1ea4cc3a732d15edde0d423))
* **sprite:** cache prepared images ([59209c8](https://github.com/fbosch/pkdx/commit/59209c8a4f574031514b7ae95450ffa9fbbc7665))
* **type-matchups:** cache damage taken lookups ([e52057d](https://github.com/fbosch/pkdx/commit/e52057debe5c4e3a9cddc50560dadd84313ff656))
* **type-matchups:** speed up cache keys ([ed30b23](https://github.com/fbosch/pkdx/commit/ed30b23d0e2745111a6633246e29a900a42ba289))
* **ui:** cache evolution chart rows ([7db02c1](https://github.com/fbosch/pkdx/commit/7db02c19e6fa2bd67f697472a2cabae197e66de1))
* **ui:** defer pokemon db import ([82c52d8](https://github.com/fbosch/pkdx/commit/82c52d83bef52cacc6c9fa87ab347ac963bf01c7))
* **ui:** prewarm terminal sprite images ([d8dafbd](https://github.com/fbosch/pkdx/commit/d8dafbde3f2c35c3c12be713a78b24b9255b3c5a))

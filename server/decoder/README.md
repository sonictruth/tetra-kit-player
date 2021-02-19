## Decoder

Source: https://gitlab.com/larryth/tetra-kit/-/tree/master/codec
Compiled using: wasi-sdk-12.0 

Compile script:
```
rm *.wasm
WASISDK=~/wasi-sdk-12.0

SDECODER="sdecoder.c sdec_tet.c sub_sc_d.c sub_dsp.c fbas_tet.c fexp_tet.c fmat_tet.c tetra_op.c"
CDECODER="cdecoder.c cdec_tet.c sub_cd.c tetra_op.c"

CC="$WASISDK/bin/clang -Os -s --target=wasm32-unknown-wasi  --sysroot $WASISDK/share/wasi-sysroot "

$CC $SDECODER -o sdecoder.wasm
$CC $CDECODER -o cdecoder.wasm
```

## Usage

```
decoder('../tetra-kit/recorder/out/20210206_205801_008618_08.out','.converted')
    .catch(e=> console.log('Error',e));
```

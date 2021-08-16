REM
REM Example bat file for starting PhoenixMiner.exe to mine ETH
REM

setx GPU_FORCE_64BIT_PTR 0
setx GPU_MAX_HEAP_SIZE 100
setx GPU_USE_SYNC_OBJECTS 1
setx GPU_MAX_ALLOC_PERCENT 100
setx GPU_SINGLE_ALLOC_PERCENT 100

PhoenixMiner.exe -pool stratum+tcp://us1.ethermine.org:4444 -pool2 stratum+tcp://us2.ethermine.org:4444 -wal 0x231d255f4a1b873d66e8d746abcca5e1b149ac6c.151128 -powlim -30
pause